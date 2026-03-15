import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import { getFurnitureById } from "../api";

function extractFurnitureIdFromQr(text) {
  if (!text) return null;

  const trimmed = text.trim();

  const idOnly = trimmed.match(/^\d+$/);
  if (idOnly) {
    return Number(idOnly[0]);
  }

  const furniturePathMatch = trimmed.match(/\/furniture\/(\d+)(\/)?$/);
  if (furniturePathMatch) {
    return Number(furniturePathMatch[1]);
  }

  return null;
}

const SAME_QR_COOLDOWN_MS = 3000;

function ScanPage() {
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

  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState([]);

  useEffect(() => {
    isMountedRef.current = true;

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
        } catch {
          // ignore cleanup errors on unmount
        }
      }
    };
  }, []);

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

  const stopScanner = async () => {
    if (scannerActionRef.current) return;
    scannerActionRef.current = true;

    try {
      const scanner = scannerRef.current;

      if (!scanner) {
        return;
      }

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
    } catch (err) {
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setIsScannerRunning(false);
        setIsStarting(false);
      }
      scannerActionRef.current = false;
    }
  };

  const startScanner = async () => {
    if (scannerActionRef.current || isScannerRunning || isStarting) return;
    scannerActionRef.current = true;

    try {
      setScanError("");
      setScanMessage("");
      setIsStarting(true);

      const container = document.getElementById(scannerElementId);
      if (!container) {
        setScanError(t("Scanner container not found"));
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
    } catch (err) {
      console.error(err);

      const scanner = scannerRef.current;
      if (scanner) {
        try {
          await scanner.clear();
        } catch {}
      }
      scannerRef.current = null;

      if (isMountedRef.current) {
        setScanError(t("Camera start failed"));
        setIsScannerRunning(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsStarting(false);
      }
      scannerActionRef.current = false;
    }
  };

  const shouldIgnoreDuplicateRawValue = (rawValue) => {
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
  };

  const addReportRow = (row) => {
    if (seenKeysRef.current.has(row.uniqueKey)) {
      setScanMessage(t("Already scanned"));
      return false;
    }

    seenKeysRef.current.add(row.uniqueKey);
    setReport((prev) => [row, ...prev]);
    return true;
  };

  const handleScan = async (rawValue) => {
    const normalizedValue = rawValue?.trim();

    if (!normalizedValue) return;
    if (isProcessing) return;

    if (shouldIgnoreDuplicateRawValue(normalizedValue)) {
      return;
    }

    try {
      setIsProcessing(true);
      setScanError("");
      setScanMessage("");

      const furnitureId = extractFurnitureIdFromQr(normalizedValue);

      if (!furnitureId) {
        const uniqueKey = `invalid-${normalizedValue}`;

        const added = addReportRow({
          uniqueKey,
          status: "not_found",
          scannedValue: normalizedValue,
          furnitureId: null,
          invNumber: "—",
          name: t("QR not recognized"),
          buildingName: "—",
          roomName: "—",
          scannedAt: new Date().toLocaleString(),
        });

        if (added) {
          setScanError(t("QR has no valid furniture id"));
        }

        return;
      }

      try {
        const item = await getFurnitureById(furnitureId);

        const added = addReportRow({
          uniqueKey: `found-${item.id}`,
          status: "found",
          scannedValue: normalizedValue,
          furnitureId: item.id,
          invNumber: item.inv_number || `INV-${item.id}`,
          name: item.name || t("Untitled"),
          buildingName: item.building_name || "—",
          roomName: item.room_name || "—",
          scannedAt: new Date().toLocaleString(),
        });

        if (added) {
          playScanFeedback();
          setScanMessage(
            `${t("Found")}: ${item.inv_number || `INV-${item.id}`} — ${item.name}`
          );
        }
      } catch {
        const added = addReportRow({
          uniqueKey: `missing-${furnitureId}`,
          status: "not_found",
          scannedValue: normalizedValue,
          furnitureId,
          invNumber: `INV-${furnitureId}`,
          name: t("Object not found"),
          buildingName: "—",
          roomName: "—",
          scannedAt: new Date().toLocaleString(),
        });

        if (added) {
          setScanError(`${t("Furniture id not found")} ${furnitureId}.`);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualValue.trim()) return;
    await handleScan(manualValue.trim());
    setManualValue("");
  };

  const handleClearReport = () => {
    setReport([]);
    setScanMessage("");
    setScanError("");
    seenKeysRef.current = new Set();
    lastScanRef.current = {
      rawValue: "",
      at: 0,
    };
  };

  const foundCount = report.filter((item) => item.status === "found").length;
  const notFoundCount = report.filter(
    (item) => item.status === "not_found"
  ).length;

  return (
    <div className="relative animate-fadeIn text-white">
      <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
              {t("Scan workflow")}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t("Inventory Audit / Scan Mode")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              {t("Scan page description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isScannerRunning ? (
              <button
                onClick={startScanner}
                disabled={isStarting}
                className="apple-btn apple-btn-primary rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {isStarting ? t("Starting camera...") : t("Start Camera")}
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="apple-btn apple-btn-danger rounded-[1.25rem] px-5 py-3 text-sm font-semibold"
              >
                {t("Stop Camera")}
              </button>
            )}

            <button
              onClick={handleClearReport}
              className="apple-btn rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85"
            >
              {t("Clear Report")}
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/75">
                    {t("QR Scanner")}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {t("Use device camera")}
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

              <form
                onSubmit={handleManualSubmit}
                className="mt-5 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder={t("Paste QR manually")}
                  className="w-full rounded-[40px] border border-white/10 bg-white/[0.06] px-6 py-5 text-base text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                />
                <button
                  type="submit"
                  className="apple-btn apple-btn-primary rounded-[1.25rem] px-5 py-4 text-sm font-semibold sm:min-w-[140px]"
                >
                  {t("Check")}
                </button>
              </form>

              {scanMessage && (
                <div className="mt-4 rounded-[1.25rem] border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                  {scanMessage}
                </div>
              )}

              {scanError && (
                <div className="mt-4 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {scanError}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4">
                <div className="text-sm font-medium text-white/75">
                  {t("Audit Summary")}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {t("Quick scan summary")}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs text-white/45">{t("Total")}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {report.length}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-green-400/15 bg-green-500/10 p-4">
                  <div className="text-xs text-green-200/70">{t("Found")}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {foundCount}
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-red-400/15 bg-red-500/10 p-4">
                  <div className="text-xs text-red-200/70">{t("Not Found")}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {notFoundCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/75">
                    {t("Scan Report")}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {t("Last scanned objects")}
                  </div>
                </div>

                <span className="liquid-badge">
                  {report.length} {t("Scans")}
                </span>
              </div>

              <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                {report.length === 0 ? (
                  <div className="grid min-h-[180px] place-items-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] text-center text-sm text-white/45">
                    {t("No scans yet")}
                  </div>
                ) : (
                  report.map((row) => (
                    <div
                      key={row.uniqueKey}
                      className={`rounded-[1.5rem] border p-4 backdrop-blur-xl ${
                        row.status === "found"
                          ? "border-green-400/20 bg-green-500/10"
                          : "border-red-400/20 bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          {row.status === "found"
                            ? `✓ ${t("Found")}`
                            : `⚠ ${t("Not Found")}`}
                        </div>
                        <div className="text-xs text-white/45">
                          {row.scannedAt}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-sm text-white/85">
                        <div>
                          <span className="text-white/45">Inv:</span>{" "}
                          <span>{row.invNumber}</span>
                        </div>

                        <div>
                          <span className="text-white/45">{t("Name")}:</span>{" "}
                          <span>{row.name}</span>
                        </div>

                        <div>
                          <span className="text-white/45">{t("Location")}:</span>{" "}
                          <span>
                            {row.buildingName} / {row.roomName}
                          </span>
                        </div>

                        <div className="break-all">
                          <span className="text-white/45">{t("Scan")}:</span>{" "}
                          <span>{row.scannedValue}</span>
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
    </div>
  );
}

export default ScanPage;