import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getFurnitureById,
  deleteFurniture,
  getFurnitureQrUrl,
  resolveAssetUrl,
  markFurnitureAsInspected,
  getFurnitureHistory,
} from "../api";
import { AuthContext } from "../context/AuthContext";

const ACTION_LABELS = {
  create:       { label: "Created",   color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-400/20" },
  update:       { label: "Updated",   color: "text-blue-300",    bg: "bg-blue-500/10 border-blue-400/20" },
  edit:         { label: "Edited",    color: "text-blue-300",    bg: "bg-blue-500/10 border-blue-400/20" },
  move:         { label: "Moved",     color: "text-yellow-200",  bg: "bg-yellow-500/10 border-yellow-400/20" },
  delete:       { label: "Deleted",   color: "text-red-300",     bg: "bg-red-500/10 border-red-400/20" },
  inspection:   { label: "Inspected", color: "text-purple-300",  bg: "bg-purple-500/10 border-purple-400/20" },
  photo_update: { label: "Photo",     color: "text-cyan-300",    bg: "bg-cyan-500/10 border-cyan-400/20" },
};

function getActionMeta(action, changeType) {
  const key = changeType || action;
  return ACTION_LABELS[key] || ACTION_LABELS[action] || { label: action, color: "text-white/60", bg: "bg-white/5 border-white/10" };
}

function formatHistoryDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function HistoryBlock({ furnitureId, canDelete }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getFurnitureHistory(furnitureId);
      setHistory(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (e) {
      console.error("History load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!open && !loaded) await loadHistory();
    setOpen((prev) => !prev);
  };

  // Clear = просто очищаем локально (только UI, без backend endpoint)
  // Если нужен backend endpoint — добавить отдельно
  const handleClear = () => {
    setClearing(true);
    setTimeout(() => {
      setHistory([]);
      setClearing(false);
      setShowClearConfirm(false);
    }, 300);
  };

  return (
    <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={handleToggle}
          className="flex flex-1 items-center gap-3 text-left transition hover:opacity-80"
        >
          <span className="text-sm font-medium text-white/80">Change History</span>
          {loaded && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50">
              {history.length}
            </span>
          )}
          <svg
            className={`ml-auto h-4 w-4 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Clear button — admin only */}
        {canDelete && loaded && history.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="ml-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
          >
            Clear
          </button>
        )}
      </div>

      {/* Confirm clear */}
      {showClearConfirm && (
        <div className="mx-5 mb-4 rounded-[1rem] border border-red-400/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">Clear all history records? This cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleClear}
              disabled={clearing}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {clearing ? "Clearing..." : "Yes, clear"}
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-white/40">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="py-4 text-sm text-white/40">No history records.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((record) => {
                const meta = getActionMeta(record.action, record.change_type);
                return (
                  <div key={record.id} className="rounded-[1rem] border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-white/40">{formatHistoryDate(record.created_at)}</span>
                      {record.user_email && (
                        <span className="text-xs text-white/50">· {record.user_email}</span>
                      )}
                    </div>
                    {record.reason && (
                      <div className="mt-2.5 text-sm text-white/75">
                        <span className="text-xs uppercase tracking-wide text-white/40">Reason: </span>
                        {record.reason}
                      </div>
                    )}
                    {record.description && (
                      <div className="mt-1 text-xs text-white/40">{record.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getInspectionMeta(nextConditionCheckDate) {
  if (!nextConditionCheckDate) {
    return {
      label: "Not scheduled",
      icon: "⚪",
      tone: "border-white/10 bg-white/[0.04] text-white/75",
      hint: "Inspection date has not been scheduled yet",
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(nextConditionCheckDate);
  nextDate.setHours(0, 0, 0, 0);
  const diffMs = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: "Overdue", icon: "🔴", tone: "border-red-400/25 bg-red-500/10 text-red-200", hint: "Inspection date has already passed" };
  }
  if (diffDays <= 7) {
    return { label: "Due soon", icon: "🟡", tone: "border-yellow-400/25 bg-yellow-500/10 text-yellow-100", hint: `Inspection due in ${diffDays} day${diffDays === 1 ? "" : "s"}` };
  }
  return { label: "OK", icon: "🟢", tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100", hint: `Next inspection in ${diffDays} day${diffDays === 1 ? "" : "s"}` };
}

function FurnitureDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, token, authReady } = useContext(AuthContext);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const canInspect = role === "admin" || role === "manager";
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ru-RU";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getFurnitureById(id);
        if (cancelled) return;
        setItem(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(t("Asset load failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, t]);

  // inspectionMeta computed from item state — обновляется автоматически при смене item
  const inspectionMeta = useMemo(
    () => getInspectionMeta(item?.next_condition_check_date),
    [item?.next_condition_check_date]
  );

  const openDeleteModal = () => {
    if (!canDelete) { setError(t("No delete permission")); return; }
    if (!authReady) { setError(t("Session check not finished")); return; }
    if (!token) { setError(t("Session expired")); return; }
    setError("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => { if (deleting) return; setShowDeleteModal(false); };

  const confirmDelete = async () => {
    if (!item) return;
    try {
      setDeleting(true);
      setError("");
      await deleteFurniture(id, token);
      setShowDeleteModal(false);
      navigate("/furniture");
    } catch (err) {
      console.error(err);
      setShowDeleteModal(false);
      setError(err.message || t("Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!item) return;
    try {
      setDownloadingQr(true);
      const qrUrl = getFurnitureQrUrl(item.id);
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error(t("QR download failed"));
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${item.inv_number ?? `INV-${item.id}`}_QR.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      setError(t("QR download failed"));
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleMarkInspected = async () => {
    if (!item) return;
    if (!authReady) { setError(t("Session check not finished")); return; }
    if (!token) { setError(t("Session expired")); return; }

    try {
      setInspecting(true);
      setError("");

      const result = await markFurnitureAsInspected(item.id, token);

      // Обновляем item напрямую из ответа сервера — не делаем повторный запрос
      // result = { last_check, next_check }
      setItem((prev) => ({
        ...prev,
        last_condition_check_date: result.last_check ?? prev.last_condition_check_date,
        next_condition_check_date: result.next_check ?? prev.next_condition_check_date,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to mark inspection");
    } finally {
      setInspecting(false);
    }
  };

  const actionBtnClass =
    "w-full rounded-[1.1rem] px-4 py-3 text-center text-sm font-medium transition sm:rounded-[1.25rem] sm:px-5 sm:py-3";
  const cardClass =
    "rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5";
  const subCardClass =
    "rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-4";

  if (loading) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span>{t("Loading...")}</span>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">{error}</div>
    );
  }

  if (!item) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">{t("Asset not found")}</div>
    );
  }

  const photoSrc = resolveAssetUrl(item.photo_url);
  const qrSrc = getFurnitureQrUrl(item.id);

  return (
    <>
      <div className="relative animate-fadeIn text-white">
        <div className="glass-strong relative overflow-hidden rounded-[1.75rem] border border-white/15 p-4 shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-5 lg:p-6 xl:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5 sm:space-y-6">

              {/* Header card */}
              <div className={cardClass}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 sm:text-xs">
                  {t("Inventory Number")}
                </div>
                <div className="mt-3 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {item.inv_number ?? `INV-${item.id}`}
                </div>
                <div className="mt-4 break-words text-lg text-white/85 sm:text-xl lg:text-2xl">
                  {item.name}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="liquid-badge">{item.condition_name || "—"}</span>
                  <span className="liquid-badge">{item.type_name || "—"}</span>
                  <span className="liquid-badge">
                    {item.price_kgs
                      ? `${Number(item.price_kgs).toLocaleString(locale)} KGS`
                      : t("Price not specified")}
                  </span>
                </div>
                {photoSrc && (
                  <div className="mt-5 sm:mt-6">
                    <img
                      src={photoSrc}
                      alt={item.name}
                      className="h-auto max-h-[420px] w-full rounded-[1.25rem] border border-white/10 object-cover shadow-lg shadow-black/20 sm:rounded-[1.5rem]"
                    />
                  </div>
                )}
              </div>

              {/* Location + Value */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className={cardClass}>
                  <div className="mb-3 text-sm font-medium text-white/55">{t("Location")}</div>
                  <div className="break-words text-lg font-semibold text-white sm:text-xl">{item.building_name || "—"}</div>
                  <div className="mt-2 break-words text-sm text-white/70 sm:text-base">{t("Room")} {item.room_name || "—"}</div>
                </div>
                <div className={cardClass}>
                  <div className="mb-3 text-sm font-medium text-white/55">{t("Asset Value")}</div>
                  <div className="break-words text-xl font-semibold text-yellow-200 sm:text-2xl">
                    {item.price_kgs ? `${Number(item.price_kgs).toLocaleString(locale)} KGS` : "—"}
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    {item.price_kgs ? t("Asset value specified") : t("Asset value missing")}
                  </div>
                </div>
              </div>

              {/* Manufacturer + Model */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className={cardClass}>
                  <div className="mb-3 text-sm font-medium text-white/55">{t("Manufacturer")}</div>
                  <div className="break-words text-lg font-semibold text-white sm:text-xl">{item.manufacturer || "—"}</div>
                </div>
                <div className={cardClass}>
                  <div className="mb-3 text-sm font-medium text-white/55">{t("Model")}</div>
                  <div className="break-words text-lg font-semibold text-white sm:text-xl">{item.model || "—"}</div>
                </div>
              </div>

              {/* Purchase Date */}
              <div className={cardClass}>
                <div className="mb-3 text-sm font-medium text-white/55">{t("Purchase Date")}</div>
                <div className="break-words text-lg font-semibold text-white sm:text-xl">{item.purchase_date || "—"}</div>
              </div>

              {/* Inspection block */}
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/75">Inspection Status</div>
                    <div className="mt-1 text-xs text-white/45">Track asset condition checks and upcoming inspection dates.</div>
                  </div>
                  {/* Badge обновляется автоматически через inspectionMeta */}
                  <div className={`rounded-[1rem] border px-4 py-3 text-sm font-medium ${inspectionMeta.tone}`}>
                    <div className="flex items-center gap-2">
                      <span>{inspectionMeta.icon}</span>
                      <span>{inspectionMeta.label}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">{inspectionMeta.hint}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className={subCardClass}>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/40 sm:text-xs">Last inspection</div>
                    <div className="mt-2 break-words text-sm font-medium text-white sm:text-base">
                      {item.last_condition_check_date || "—"}
                    </div>
                  </div>
                  <div className={subCardClass}>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/40 sm:text-xs">Next inspection</div>
                    <div className="mt-2 break-words text-sm font-medium text-white sm:text-base">
                      {item.next_condition_check_date || "—"}
                    </div>
                  </div>
                  <div className={subCardClass}>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/40 sm:text-xs">Check every (days)</div>
                    <div className="mt-2 break-words text-sm font-medium text-white sm:text-base">
                      {item.condition_check_interval_days || "—"}
                    </div>
                  </div>
                </div>

                {canInspect && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={handleMarkInspected}
                      disabled={inspecting}
                      className="apple-btn apple-btn-primary w-full rounded-[1.1rem] px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:rounded-[1.25rem] sm:px-5"
                    >
                      {inspecting ? "Saving inspection..." : "Mark as inspected"}
                    </button>
                  </div>
                )}

                {/* History block */}
                <HistoryBlock furnitureId={id} canDelete={canDelete} />
              </div>

              {/* QR */}
              <div className={cardClass}>
                <div className="mb-4 text-sm font-medium text-white/55">{t("QR Code")}</div>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                  <div className="mx-auto w-full max-w-[280px] rounded-[1.25rem] bg-white p-4 sm:max-w-[320px] sm:rounded-[1.5rem] sm:p-5 xl:mx-0">
                    <img src={qrSrc} alt={`QR ${item.inv_number ?? `INV-${item.id}`}`} className="aspect-square w-full object-contain" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="text-sm leading-relaxed text-white/75">{t("QR help text")}</div>
                    <button
                      onClick={handleDownloadQr}
                      disabled={downloadingQr}
                      className="apple-btn apple-btn-primary w-full rounded-[1.1rem] px-4 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:rounded-[1.25rem] sm:px-5"
                    >
                      {downloadingQr ? t("Downloading...") : t("Download QR")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="min-w-0 2xl:block">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5 2xl:sticky 2xl:top-6">
                <div className="mb-4 text-sm font-medium text-white/55">{t("Actions")}</div>

                {error && (
                  <div className="mb-4 rounded-[1.1rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:rounded-[1.25rem]">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                  <button onClick={() => navigate(-1)} className={`apple-btn ${actionBtnClass} text-white/90`}>
                    {t("Back")}
                  </button>
                  <Link to={`/furniture/${item.id}/label`} className={`${actionBtnClass} bg-green-600 text-white hover:bg-green-700`}>
                    {t("Print Label")}
                  </Link>
                  {canEdit && (
                    <Link to={`/furniture/${item.id}/edit`} className={`${actionBtnClass} bg-blue-600 text-white hover:bg-blue-700`}>
                      {t("Edit")}
                    </Link>
                  )}
                  {canInspect && (
                    <button
                      type="button"
                      onClick={handleMarkInspected}
                      disabled={inspecting}
                      className={`${actionBtnClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60`}
                    >
                      {inspecting ? "Saving..." : "Mark as inspected"}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={openDeleteModal}
                      disabled={deleting}
                      className={`${actionBtnClass} bg-red-600 text-white hover:bg-red-700 disabled:opacity-60`}
                    >
                      {deleting ? t("Deleting") : t("Delete")}
                    </button>
                  )}
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="text-sm font-medium text-white/55">{t("Quick Info")}</div>
                  <div className="mt-4 space-y-3 text-sm text-white/75">
                    {[
                      [t("Type"), item.type_name],
                      [t("Manufacturer"), item.manufacturer],
                      [t("Model"), item.model],
                      [t("Purchase Date"), item.purchase_date],
                      [t("Condition"), item.condition_name],
                      [t("Price"), item.price_kgs ? `${Number(item.price_kgs).toLocaleString(locale)} KGS` : null],
                      [t("Room"), item.room_name],
                      ["Inspection", `${inspectionMeta.icon} ${inspectionMeta.label}`],
                      [t("Role"), role],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <span className="text-white/50">{label}</span>
                        <span className="max-w-[60%] text-right capitalize text-white">{value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-[#081226]/95 p-5 shadow-2xl shadow-black/40 sm:rounded-[2rem] sm:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-red-200/80 sm:text-xs">
                  {t("Confirm delete")}
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {t("Delete furniture question")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {t("Delete furniture message 1")}{" "}
                  <span className="font-medium text-white">{item.inv_number ?? `INV-${item.id}`}</span>{" "}
                  — <span className="font-medium text-white">{item.name}</span>.
                </p>
                <p className="mt-2 text-sm text-red-200/80">{t("Delete furniture message 2")}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeDeleteModal} disabled={deleting} className="apple-btn w-full rounded-[1.1rem] px-5 py-3 text-sm font-medium text-white/85 sm:w-auto sm:rounded-[1.25rem]">
                    {t("Cancel")}
                  </button>
                  <button type="button" onClick={confirmDelete} disabled={deleting} className="w-full rounded-[1.1rem] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:min-w-[160px] sm:rounded-[1.25rem]">
                    {deleting ? t("Deleting") : t("Yes, delete")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FurnitureDetail;