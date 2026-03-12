import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  API_URL,
  getFurnitureById,
  deleteFurniture,
  getFurnitureQrUrl,
} from "../api";
import { AuthContext } from "../context/AuthContext";

function FurnitureDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingQr, setDownloadingQr] = useState(false);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  useEffect(() => {
    getFurnitureById(id)
      .then((data) => {
        setItem(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось загрузить мебель");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleDelete = async () => {
    if (!canDelete) {
      alert("У вас нет прав на удаление мебели");
      return;
    }

    const ok = confirm("Удалить эту мебель?");
    if (!ok) return;

    try {
      await deleteFurniture(id);
      navigate("/furniture");
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить мебель");
    }
  };

  const handleDownloadQr = async () => {
    if (!item) return;

    try {
      setDownloadingQr(true);

      const qrUrl = getFurnitureQrUrl(item.id);
      const res = await fetch(qrUrl);

      if (!res.ok) {
        throw new Error("Не удалось скачать QR");
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
      alert("Не удалось скачать QR");
    } finally {
      setDownloadingQr(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
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

  const photoSrc = item.photo_url ? `${API_URL}${item.photo_url}` : null;
  const qrSrc = getFurnitureQrUrl(item.id);

  return (
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
                    ? `${Number(item.price_kgs).toLocaleString("ru-RU")} KGS`
                    : "Цена не указана"}
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
                  Asset Value
                </div>

                <div className="text-2xl font-semibold text-yellow-200">
                  {item.price_kgs
                    ? `${Number(item.price_kgs).toLocaleString("ru-RU")} KGS`
                    : "—"}
                </div>

                <div className="mt-2 text-sm text-white/60">
                  {item.price_kgs
                    ? "Указанная стоимость этого актива"
                    : "Стоимость для этого актива пока не указана"}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
              <div className="mb-4 text-sm font-medium text-white/55">
                QR-код
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
                    Отсканировав QR, можно открыть карточку мебели.
                  </div>

                  <button
                    onClick={handleDownloadQr}
                    disabled={downloadingQr}
                    className="apple-btn apple-btn-primary w-full rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:opacity-60 sm:w-auto"
                  >
                    {downloadingQr ? "Скачивание..." : "Скачать QR"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6 xl:sticky xl:top-6">
              <div className="mb-4 text-sm font-medium text-white/55">
                Actions
              </div>

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
                  Распечатать этикетку
                </Link>

                {canEdit && (
                  <Link
                    to={`/furniture/${item.id}/edit`}
                    className="w-full rounded-[1.25rem] bg-blue-600 px-5 py-3 text-center text-base font-medium text-white transition hover:bg-blue-700"
                  >
                    Изменить
                  </Link>
                )}

                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full rounded-[1.25rem] bg-red-600 px-5 py-3 text-center text-base font-medium text-white transition hover:bg-red-700"
                  >
                    {t("Delete")}
                  </button>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="text-sm font-medium text-white/55">
                  Quick Info
                </div>

                <div className="mt-4 space-y-3 text-sm text-white/75">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/50">Type</span>
                    <span className="text-right text-white">
                      {item.type_name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/50">Condition</span>
                    <span className="text-right text-white">
                      {item.condition_name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/50">Price</span>
                    <span className="text-right text-white">
                      {item.price_kgs
                        ? `${Number(item.price_kgs).toLocaleString("ru-RU")} KGS`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/50">Room</span>
                    <span className="text-right text-white">
                      {item.room_name || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/50">Role</span>
                    <span className="text-right text-white capitalize">
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FurnitureDetail;