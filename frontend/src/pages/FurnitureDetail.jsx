import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getFurnitureById,
  deleteFurniture,
  getFurnitureQrUrl,
  resolveAssetUrl,
} from "../api";
import { AuthContext } from "../context/AuthContext";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ru-RU";

  useEffect(() => {
    let cancelled = false;

    const loadItem = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getFurnitureById(id);

        if (cancelled) return;
        setItem(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(t("Asset load failed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const openDeleteModal = () => {
    if (!canDelete) {
      setError(t("No delete permission"));
      return;
    }

    if (!authReady) {
      setError(t("Session check not finished"));
      return;
    }

    if (!token) {
      setError(t("Session expired"));
      return;
    }

    setError("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
  };

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

      if (!res.ok) {
        throw new Error(t("QR download failed"));
      }

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
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        {error}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        {t("Asset not found")}
      </div>
    );
  }

  const photoSrc = resolveAssetUrl(item.photo_url);
  const qrSrc = getFurnitureQrUrl(item.id);

  return (
    <>
      <div className="relative animate-fadeIn text-white">
        <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-5 shadow-2xl shadow-black/20 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                  {t("Inventory Number")}
                </div>

                <div className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {item.inv_number ?? `INV-${item.id}`}
                </div>

                <div className="mt-4 break-words text-xl text-white/85 sm:text-2xl">
                  {item.name}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="liquid-badge">
                    {item.condition_name || "—"}
                  </span>
                  <span className="liquid-badge">{item.type_name || "—"}</span>
                  <span className="liquid-badge">
                    {item.price_kgs
                      ? `${Number(item.price_kgs).toLocaleString(locale)} KGS`
                      : t("Price not specified")}
                  </span>
                </div>

                {photoSrc && (
                  <div className="mt-6">
                    <img
                      src={photoSrc}
                      alt={item.name}
                      className="h-auto max-h-[420px] w-full rounded-[1.5rem] border border-white/10 object-cover shadow-lg shadow-black/20"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                  <div className="mb-3 text-sm font-medium text-white/55">
                    {t("Location")}
                  </div>

                  <div className="break-words text-xl font-semibold text-white">
                    {item.building_name || "—"}
                  </div>

                  <div className="mt-2 break-words text-base text-white/70">
                    {t("Room")} {item.room_name || "—"}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                  <div className="mb-3 text-sm font-medium text-white/55">
                    {t("Asset Value")}
                  </div>

                  <div className="text-2xl font-semibold text-yellow-200">
                    {item.price_kgs
                      ? `${Number(item.price_kgs).toLocaleString(locale)} KGS`
                      : "—"}
                  </div>

                  <div className="mt-2 text-sm text-white/60">
                    {item.price_kgs
                      ? t("Asset value specified")
                      : t("Asset value missing")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                  <div className="mb-3 text-sm font-medium text-white/55">
                    {t("Manufacturer")}
                  </div>
                  <div className="break-words text-xl font-semibold text-white">
                    {item.manufacturer || "—"}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                  <div className="mb-3 text-sm font-medium text-white/55">
                    {t("Model")}
                  </div>
                  <div className="break-words text-xl font-semibold text-white">
                    {item.model || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                <div className="mb-3 text-sm font-medium text-white/55">
                  {t("Purchase Date")}
                </div>
                <div className="text-xl font-semibold text-white">
                  {item.purchase_date || "—"}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                <div className="mb-4 text-sm font-medium text-white/55">
                  {t("QR Code")}
                </div>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="mx-auto w-full max-w-[320px] rounded-[1.5rem] bg-white p-4 sm:p-5 lg:mx-0">
                    <img
                      src={qrSrc}
                      alt={`QR ${item.inv_number ?? `INV-${item.id}`}`}
                      className="aspect-square w-full object-contain"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="text-sm leading-relaxed text-white/75">
                      {t("QR help text")}
                    </div>

                    <button
                      onClick={handleDownloadQr}
                      disabled={downloadingQr}
                      className="apple-btn apple-btn-primary w-full rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto"
                    >
                      {downloadingQr ? t("Downloading...") : t("Download QR")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6 xl:sticky xl:top-6">
                <div className="mb-4 text-sm font-medium text-white/55">
                  {t("Actions")}
                </div>

                {error && (
                  <div className="mb-4 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="apple-btn w-full rounded-[1.25rem] px-5 py-3 text-center text-base font-medium text-white/90"
                  >
                    {t("Back")}
                  </button>

                  <Link
                    to={`/furniture/${item.id}/label`}
                    className="w-full rounded-[1.25rem] bg-green-600 px-5 py-3 text-center text-base font-medium text-white transition hover:bg-green-700"
                  >
                    {t("Print Label")}
                  </Link>

                  {canEdit && (
                    <Link
                      to={`/furniture/${item.id}/edit`}
                      className="w-full rounded-[1.25rem] bg-blue-600 px-5 py-3 text-center text-base font-medium text-white transition hover:bg-blue-700"
                    >
                      {t("Edit")}
                    </Link>
                  )}

                  {canDelete && (
                    <button
                      onClick={openDeleteModal}
                      disabled={deleting}
                      className="w-full rounded-[1.25rem] bg-red-600 px-5 py-3 text-center text-base font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting ? t("Deleting") : t("Delete")}
                    </button>
                  )}
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="text-sm font-medium text-white/55">
                    {t("Quick Info")}
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-white/75">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Type")}</span>
                      <span className="text-right text-white">
                        {item.type_name || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Manufacturer")}</span>
                      <span className="text-right text-white">
                        {item.manufacturer || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Model")}</span>
                      <span className="text-right text-white">
                        {item.model || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Purchase Date")}</span>
                      <span className="text-right text-white">
                        {item.purchase_date || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Condition")}</span>
                      <span className="text-right text-white">
                        {item.condition_name || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Price")}</span>
                      <span className="text-right text-white">
                        {item.price_kgs
                          ? `${Number(item.price_kgs).toLocaleString(locale)} KGS`
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Room")}</span>
                      <span className="text-right text-white">
                        {item.room_name || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/50">{t("Role")}</span>
                      <span className="text-right capitalize text-white">
                        {role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showDeleteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
              <div
                className="w-full max-w-md rounded-[2rem] border border-white/15 bg-[#081226]/95 p-6 shadow-2xl shadow-black/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-red-200/80">
                  {t("Confirm delete")}
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {t("Delete furniture question")}
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {t("Delete furniture message 1")}{" "}
                  <span className="font-medium text-white">
                    {item.inv_number ?? `INV-${item.id}`}
                  </span>{" "}
                  — <span className="font-medium text-white">{item.name}</span>.
                </p>

                <p className="mt-2 text-sm text-red-200/80">
                  {t("Delete furniture message 2")}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleting}
                    className="apple-btn w-full rounded-[1.25rem] px-5 py-3 text-sm font-medium text-white/85 sm:w-auto"
                  >
                    {t("Cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="w-full rounded-[1.25rem] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
                  >
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