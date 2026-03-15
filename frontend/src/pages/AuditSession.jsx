import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

const SAME_QR_COOLDOWN_MS = 3000;

function AuditSession() {
  const { t } = useTranslation();

  const scannerRef = useRef(null);
  const scannerElementId = "inventory-qr-reader";
  const isMountedRef = useRef(true);
  const scannerActionRef = useRef(false);

  const seenKeysRef = useRef(new Set());
  const lastScanRef = useRef({
    rawValue: "",
    at: 0,
  });

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
  const [scanMessage, setScanMessage] = useState("");

  useEffect(() => {
    isMountedRef.current = true;
    loadReferences();

    return () => {
      isMountedRef.current = false;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        try {
          const state = scanner.getState?.();

          if (state === 2 || state === 1) {
            scanner.stop().catch(() => {});
          }

          scanner.clear().catch(() => {});
        } catch {}
      }
    };
  }, []);

  async function loadReferences() {
    try {
      const [b, r] = await Promise.all([getBuildings(), getRooms()]);
      setBuildings(Array.isArray(b) ? b : []);
      setRooms(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error(e);
      setError(t("Buildings rooms load failed"));
    }
  }

  useEffect(() => {
    if (!selectedBuilding) {
      setFilteredRooms([]);
      setSelectedRoom("");
      return;
    }

    const filtered = rooms.filter(
      (r) => Number(r.building_id) === Number(selectedBuilding)
    );
    setFilteredRooms(filtered);

    const roomStillExists = filtered.some(
      (r) => Number(r.id) === Number(selectedRoom)
    );
    if (!roomStillExists) {
      setSelectedRoom(filtered[0]?.id ? String(filtered[0].id) : "");
    }
  }, [selectedBuilding, rooms, selectedRoom]);

  const playScanFeedback = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(120);
      }

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        audioCtx.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.12
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);

      oscillator.onended = () => {
        audioCtx.close().catch(() => {});
      };
    } catch (err) {
      console.error("Scan feedback error:", err);
    }
  };

  async function stopScanner() {
    if (scannerActionRef.current) return;
    scannerActionRef.current = true;

    try {
      const scanner = scannerRef.current;

      if (!scanner) return;

      const state = scanner.getState?.();

      if (state === 2 || state === 1) {
        try {
          await scanner.stop();
        } catch {}
      }

      try {
        await scanner.clear();
      } catch {}

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isMountedRef.current) {
        setIsScannerRunning(false);
        setIsStartingScanner(false);
      }
      scannerActionRef.current = false;
    }
  }

  async function startScanner() {
    if (scannerActionRef.current || isScannerRunning || isStartingScanner) return;
    scannerActionRef.current = true;

    try {
      setError("");
      setScanMessage("");
      setIsStartingScanner(true);

      const container = document.getElementById(scannerElementId);
      if (!container) {
        setError(t("Scanner container not found"));
        return;
      }

      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await handleScan(decodedText);
        },
        () => {}
      );

      if (!isMountedRef.current) {
        try {
          await scanner.stop();
        } catch {}
        try {
          await scanner.clear();
        } catch {}
        return;
      }

      if (scannerRef.current === scanner) {
        setIsScannerRunning(true);
      }
    } catch (e) {
      console.error(e);

      const scanner = scannerRef.current;
      if (scanner) {
        try {
          await scanner.clear();
        } catch {}
      }
      scannerRef.current = null;

      if (isMountedRef.current) {
        setError(t("Camera start failed"));
        setIsScannerRunning(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsStartingScanner(false);
      }
      scannerActionRef.current = false;
    }
  }

  async function startSession() {
    if (!selectedBuilding || !selectedRoom) {
      setError(t("Choose building and room"));
      return;
    }

    setError("");
    setScanMessage("");
    setReport([]);
    seenKeysRef.current = new Set();
    lastScanRef.current = { rawValue: "", at: 0 };

    setSessionStarted(true);

    setTimeout(() => {
      startScanner();
    }, 0);
  }

  function shouldIgnoreDuplicateRawValue(rawValue) {
    const now = Date.now();

    if (
      lastScanRef.current.rawValue === rawValue &&
      now - lastScanRef.current.at < SAME_QR_COOLDOWN_MS
    ) {
      return true;
    }

    lastScanRef.current = {
      rawValue,
      at: now,
    };

    return false;
  }

  async function handleScan(rawValue) {
    const normalizedValue = rawValue?.trim();

    if (!normalizedValue) return;
    if (isProcessing) return;

    if (shouldIgnoreDuplicateRawValue(normalizedValue)) {
      return;
    }

    setIsProcessing(true);
    setError("");
    setScanMessage("");

    const id = extractFurnitureIdFromQr(normalizedValue);

    if (!id) {
      const invalidKey = `invalid-${normalizedValue}`;

      if (!seenKeysRef.current.has(invalidKey)) {
        addRow({
          key: invalidKey,
          status: "missing",
          inv: "-",
          name: t("QR not recognized"),
          building: "-",
          room: "-",
        });
      } else {
        setScanMessage(t("Already scanned QR"));
      }

      setError(t("QR has no valid furniture id"));
      setIsProcessing(false);
      return;
    }

    try {
      const item = await getFurnitureById(id);

      let status = "ok";
      if (Number(item.room_id) !== Number(selectedRoom)) {
        status = "wrong";
      }

      const rowKey = `found-${item.id}`;

      if (seenKeysRef.current.has(rowKey)) {
        setScanMessage(
          `${t("Already scanned object")} ${item.inv_number || `INV-${item.id}`}.`
        );
        setIsProcessing(false);
        return;
      }

      addRow({
        key: rowKey,
        status,
        inv: item.inv_number || `INV-${item.id}`,
        name: item.name || t("Untitled"),
        building: item.building_name || "-",
        room: item.room_name || "-",
      });

      playScanFeedback();

      if (status === "ok") {
        setScanMessage(
          `OK: ${item.inv_number || `INV-${item.id}`} — ${item.name}`
        );
      } else {
        setScanMessage(
          `${t("Found but wrong room")}: ${item.inv_number || `INV-${item.id}`}`
        );
      }
    } catch {
      const missingKey = `missing-${id}`;

      if (seenKeysRef.current.has(missingKey)) {
        setScanMessage(`${t("Already marked missing")} INV-${id}.`);
        setIsProcessing(false);
        return;
      }

      addRow({
        key: missingKey,
        status: "missing",
        inv: `INV-${id}`,
        name: t("Not found"),
        building: "-",
        room: "-",
      });

      setError(`${t("Furniture id not found")} ${id}.`);
    }

    setIsProcessing(false);
  }

  function addRow(row) {
    if (seenKeysRef.current.has(row.key)) return;

    seenKeysRef.current.add(row.key);

    setReport((prev) => [
      {
        ...row,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }

  function exportPDF() {
    const building =
      buildings.find((b) => Number(b.id) === Number(selectedBuilding))?.name || "-";
    const room =
      rooms.find((r) => Number(r.id) === Number(selectedRoom))?.name || "-";

    const doc = new jsPDF();

    doc.text(t("Inventory Audit Report"), 14, 15);
    doc.text(`${t("Building")}: ${building}`, 14, 25);
    doc.text(`${t("Room")}: ${room}`, 14, 32);
    doc.text(`${t("Date")}: ${new Date().toLocaleDateString()}`, 14, 39);

    autoTable(doc, {
      startY: 50,
      head: [[t("Inv"), t("Name"), t("Location"), t("Status")]],
      body: report.map((r) => [
        r.inv,
        r.name,
        `${r.building}/${r.room}`,
        r.status === "ok"
          ? "OK"
          : r.status === "wrong"
          ? t("Wrong room")
          : t("Missing"),
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
    setScanMessage("");
    seenKeysRef.current = new Set();
    lastScanRef.current = { rawValue: "", at: 0 };
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
        <div className="glass-strong relative max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
              {t("Audit workflow")}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t("Start Inventory Session")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              {t("Audit session start description")}
            </p>

            {error && (
              <div className="mt-6 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">
                  {t("Building")}
                </label>
                <select
                  className={selectClass}
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <option value="" className="bg-slate-900">
                    {t("Choose building")}
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
                  {t("Room")}
                </label>
                <select
                  className={selectClass}
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="" className="bg-slate-900">
                    {t("Choose room")}
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
                <div className="text-xs text-white/45">{t("Selected Building")}</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {selectedBuildingName}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs text-white/45">{t("Selected Room")}</div>
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
                {isStartingScanner ? t("Starting...") : t("Start Audit")}
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
              {t("Live audit")}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t("Inventory Audit Session")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              {t("Current audit room")}{" "}
              <span className="font-medium text-white">{selectedRoomName}</span>{" "}
              {t("Current audit building")}{" "}
              <span className="font-medium text-white">{selectedBuildingName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isScannerRunning ? (
              <button
                onClick={stopScanner}
                className="apple-btn apple-btn-danger rounded-[1.25rem] px-5 py-3 text-sm font-semibold"
              >
                {t("Stop Camera")}
              </button>
            ) : (
              <button
                onClick={startScanner}
                disabled={isStartingScanner}
                className="apple-btn apple-btn-primary rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {isStartingScanner ? t("Starting...") : t("Start Camera")}
              </button>
            )}

            <button
              onClick={handleResetReport}
              className="apple-btn rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85"
            >
              {t("Clear Report")}
            </button>

            <button
              onClick={handleFinishSession}
              className="apple-btn rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85"
            >
              {t("Finish Session")}
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="relative z-10 mt-6 rounded-[1.25rem] border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {scanMessage}
          </div>
        )}

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
                    {t("QR Scanner")}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {t("Point camera to QR")}
                  </div>
                </div>

                <span className="liquid-badge">
                  {isScannerRunning ? t("Live") : t("Idle")}
                </span>
              </div>

              <div
                id={scannerElementId}
                className="min-h-[340px] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/60"
              />
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4 text-sm font-medium text-white/75">
                {t("Audit Summary")}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[1.25rem] border border-green-400/15 bg-green-500/10 p-4">
                  <div className="text-xs text-green-200/70">OK</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {okCount}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-yellow-400/15 bg-yellow-500/10 p-4">
                  <div className="text-xs text-yellow-200/70">
                    {t("Wrong room")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {wrongCount}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-red-400/15 bg-red-500/10 p-4">
                  <div className="text-xs text-red-200/70">{t("Missing")}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {missingCount}
                  </div>
                </div>
              </div>

              <button
                onClick={exportPDF}
                className="apple-btn apple-btn-primary mt-5 rounded-[1.25rem] px-5 py-3 text-sm font-semibold"
              >
                {t("Export PDF")}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white/75">
                  {t("Scan Results")}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {t("Audit results description")}
                </div>
              </div>

              <span className="liquid-badge">
                {report.length} {t("Rows")}
              </span>
            </div>

            <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
              {report.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] text-center text-sm text-white/45">
                  {t("No scans yet")}
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
                        {r.status === "wrong" && `⚠ ${t("Wrong room")}`}
                        {r.status === "missing" && `❌ ${t("Missing")}`}
                      </div>
                      <div className="text-xs text-white/45">{r.time}</div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-white/85">
                      <div>
                        <span className="text-white/45">Inv:</span> {r.inv}
                      </div>
                      <div>
                        <span className="text-white/45">{t("Name")}:</span> {r.name}
                      </div>
                      <div>
                        <span className="text-white/45">{t("Location")}:</span>{" "}
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