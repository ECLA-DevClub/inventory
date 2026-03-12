import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getFurnitureById, getBuildings, getRooms } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function extractFurnitureIdFromQr(text) {
  if (!text) return null;

  const trimmed = text.trim();

  const idOnly = trimmed.match(/^\d+$/);
  if (idOnly) return Number(idOnly[0]);

  const match = trimmed.match(/\/furniture\/(\d+)(\/)?$/);
  if (match) return Number(match[1]);

  return null;
}

function AuditSession() {
  const scannerRef = useRef(null);
  const scannerElementId = "inventory-qr-reader";

  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  const [sessionStarted, setSessionStarted] = useState(false);
  const [report, setReport] = useState([]);

  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [error, setError] = useState("");

  const scannedKeys = useMemo(() => new Set(report.map((r) => r.key)), [report]);

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    return () => {
      stopScanner().catch(() => {});
    };
  }, []);

  async function loadReferences() {
    try {
      const b = await getBuildings();
      const r = await getRooms();
      setBuildings(b || []);
      setRooms(r || []);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить корпуса и комнаты");
    }
  }

  useEffect(() => {
    if (!selectedBuilding) {
      setFilteredRooms([]);
      setSelectedRoom("");
      return;
    }

    const filtered = rooms.filter((r) => Number(r.building_id) === Number(selectedBuilding));
    setFilteredRooms(filtered);

    const roomStillExists = filtered.some((r) => Number(r.id) === Number(selectedRoom));
    if (!roomStillExists) {
      setSelectedRoom(filtered[0]?.id ? String(filtered[0].id) : "");
    }
  }, [selectedBuilding, rooms]);

  async function startScanner() {
    try {
      setError("");
      setIsStartingScanner(true);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await handleScan(decodedText);
        },
        () => {}
      );

      setIsScannerRunning(true);
    } catch (e) {
      console.error(e);
      setError("Не удалось запустить камеру. Проверь доступ к камере и HTTPS/localhost.");
      setIsScannerRunning(false);
    } finally {
      setIsStartingScanner(false);
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        if (state === 2 || state === 1) {
          await scannerRef.current.stop().catch(() => {});
        }
        await scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScannerRunning(false);
      setIsStartingScanner(false);
    }
  }

  async function startSession() {
    if (!selectedBuilding || !selectedRoom) {
      setError("Выберите корпус и комнату");
      return;
    }

    setError("");
    setReport([]);
    setSessionStarted(true);
    await startScanner();
  }

  async function handleScan(rawValue) {
    if (isProcessing) return;

    setIsProcessing(true);
    setError("");

    const id = extractFurnitureIdFromQr(rawValue);

    if (!id) {
      addRow({
        key: "invalid-" + rawValue,
        status: "missing",
        inv: "-",
        name: "QR не распознан",
        building: "-",
        room: "-",
      });
      setIsProcessing(false);
      return;
    }

    try {
      const item = await getFurnitureById(id);

      let status = "ok";
      if (Number(item.room_id) !== Number(selectedRoom)) {
        status = "wrong";
      }

      addRow({
        key: "found-" + item.id,
        status,
        inv: item.inv_number || `INV-${item.id}`,
        name: item.name || "Без названия",
        building: item.building_name || "-",
        room: item.room_name || "-",
      });
    } catch {
      addRow({
        key: "missing-" + id,
        status: "missing",
        inv: `INV-${id}`,
        name: "Не найдено",
        building: "-",
        room: "-",
      });
    }

    setIsProcessing(false);
  }

  function addRow(row) {
    if (scannedKeys.has(row.key)) return;

    setReport((prev) => [
      {
        ...row,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }

  function exportPDF() {
    const building = buildings.find((b) => Number(b.id) === Number(selectedBuilding))?.name || "-";
    const room = rooms.find((r) => Number(r.id) === Number(selectedRoom))?.name || "-";

    const doc = new jsPDF();

    doc.text("Inventory Audit Report", 14, 15);
    doc.text(`Building: ${building}`, 14, 25);
    doc.text(`Room: ${room}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 39);

    autoTable(doc, {
      startY: 50,
      head: [["Inv", "Name", "Location", "Status"]],
      body: report.map((r) => [
        r.inv,
        r.name,
        `${r.building}/${r.room}`,
        r.status === "ok"
          ? "OK"
          : r.status === "wrong"
          ? "Wrong room"
          : "Missing",
      ]),
    });

    doc.save("inventory-audit.pdf");
  }

  async function handleFinishSession() {
    await stopScanner();
    setSessionStarted(false);
  }

  function handleResetReport() {
    setReport([]);
    setError("");
  }

  const okCount = report.filter((r) => r.status === "ok").length;
  const wrongCount = report.filter((r) => r.status === "wrong").length;
  const missingCount = report.filter((r) => r.status === "missing").length;

  const selectedBuildingName =
    buildings.find((b) => Number(b.id) === Number(selectedBuilding))?.name || "—";

  const selectedRoomName =
    rooms.find((r) => Number(r.id) === Number(selectedRoom))?.name || "—";

  const selectClass =
    "w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-white outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20";

  if (!sessionStarted) {
    return (
      <div className="relative animate-fadeIn text-white">
        <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-10 max-w-3xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
              Audit workflow
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Start Inventory Session
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              Выбери корпус и комнату, затем начни сессию аудита. После запуска
              можно сканировать QR-коды и сразу получать статус объекта.
            </p>

            {error && (
              <div className="mt-6 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">
                  Корпус
                </label>
                <select
                  className={selectClass}
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <option value="" className="bg-slate-900">
                    Select Building
                  </option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">
                  Комната
                </label>
                <select
                  className={selectClass}
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="" className="bg-slate-900">
                    Select Room
                  </option>
                  {filteredRooms.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900">
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs text-white/45">Selected Building</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {selectedBuildingName}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs text-white/45">Selected Room</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {selectedRoomName}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={startSession}
                disabled={isStartingScanner}
                className="apple-btn apple-btn-primary rounded-[1.25rem] px-6 py-4 text-sm font-semibold disabled:opacity-60"
              >
                {isStartingScanner ? "Запуск..." : "Start Audit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-fadeIn text-white">
      <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
              Live audit
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Inventory Audit Session
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              Текущая сессия проверяет мебель для комнаты{" "}
              <span className="text-white font-medium">{selectedRoomName}</span>{" "}
              в корпусе{" "}
              <span className="text-white font-medium">{selectedBuildingName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isScannerRunning ? (
              <button
                onClick={stopScanner}
                className="apple-btn apple-btn-danger rounded-[1.25rem] px-5 py-3 text-sm font-semibold"
              >
                Остановить камеру
              </button>
            ) : (
              <button
                onClick={startScanner}
                disabled={isStartingScanner}
                className="apple-btn apple-btn-primary rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {isStartingScanner ? "Запуск..." : "Запустить камеру"}
              </button>
            )}

            <button
              onClick={handleResetReport}
              className="apple-btn rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85"
            >
              Очистить отчёт
            </button>

            <button
              onClick={handleFinishSession}
              className="apple-btn rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85"
            >
              Завершить сессию
            </button>
          </div>
        </div>

        {error && (
          <div className="relative z-10 mt-6 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="relative z-10 mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/75">
                    QR Scanner
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Наведи камеру на QR-код мебели для проверки
                  </div>
                </div>

                <span className="liquid-badge">
                  {isScannerRunning ? "Live" : "Idle"}
                </span>
              </div>

              <div
                id={scannerElementId}
                className="min-h-[340px] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/60"
              />
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4 text-sm font-medium text-white/75">
                Audit Summary
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[1.25rem] border border-green-400/15 bg-green-500/10 p-4">
                  <div className="text-xs text-green-200/70">OK</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {okCount}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-yellow-400/15 bg-yellow-500/10 p-4">
                  <div className="text-xs text-yellow-200/70">Wrong room</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {wrongCount}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-red-400/15 bg-red-500/10 p-4">
                  <div className="text-xs text-red-200/70">Missing</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {missingCount}
                  </div>
                </div>
              </div>

              <button
                onClick={exportPDF}
                className="apple-btn apple-btn-primary mt-5 rounded-[1.25rem] px-5 py-3 text-sm font-semibold"
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white/75">
                  Scan Results
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Последние результаты проверки в этой сессии
                </div>
              </div>

              <span className="liquid-badge">{report.length} rows</span>
            </div>

            <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
              {report.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] text-center text-sm text-white/45">
                  Сканов пока нет.
                </div>
              ) : (
                report.map((r) => (
                  <div
                    key={r.key}
                    className={`rounded-[1.5rem] border p-4 backdrop-blur-xl ${
                      r.status === "ok"
                        ? "border-green-400/20 bg-green-500/10"
                        : r.status === "wrong"
                        ? "border-yellow-400/20 bg-yellow-500/10"
                        : "border-red-400/20 bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-white">
                        {r.status === "ok" && "✓ OK"}
                        {r.status === "wrong" && "⚠ Wrong room"}
                        {r.status === "missing" && "❌ Missing"}
                      </div>
                      <div className="text-xs text-white/45">{r.time}</div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-white/85">
                      <div>
                        <span className="text-white/45">Inv:</span> {r.inv}
                      </div>
                      <div>
                        <span className="text-white/45">Name:</span> {r.name}
                      </div>
                      <div>
                        <span className="text-white/45">Location:</span>{" "}
                        {r.building}/{r.room}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditSession;