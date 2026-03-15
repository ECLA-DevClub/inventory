import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL, getFurnitureById, getFurnitureQrUrl } from "../api";

function FurnitureLabel() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFurnitureById(id)
      .then((data) => {
        setItem(data);
      })
      .catch((err) => {
        console.error(err);
        setError(t("Asset load failed"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, t]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-xl text-white">{t("Loading...")}</div>;
  }

  if (error) {
    return <div className="text-xl text-white">{error}</div>;
  }

  if (!item) {
    return <div className="text-xl text-white">{t("Asset not found")}</div>;
  }

  const qrSrc = getFurnitureQrUrl(item.id);
  const photoSrc = item.photo_url ? `${API_URL}${item.photo_url}` : null;

  return (
    <div className="animate-fadeIn text-white">
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-white/5 px-4 py-2 transition hover:bg-white/10"
        >
          {t("Back")}
        </button>

        <button
          onClick={handlePrint}
          className="rounded-xl bg-green-600 px-4 py-2 transition hover:bg-green-700"
        >
          {t("Print")}
        </button>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-black shadow-xl">
          <div className="border-b border-black/10 pb-4 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-black/50">
              {t("Inventory Label")}
            </div>
            <div className="mt-2 break-all text-2xl font-bold">
              {item.inv_number || `INV-${item.id}`}
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="rounded-2xl border border-black/10 p-3">
              <img
                src={qrSrc}
                alt={`QR ${item.inv_number}`}
                className="h-56 w-56 object-contain"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="text-xs text-black/50">{t("Name")}</div>
              <div className="text-base font-semibold">{item.name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Type")}</div>
              <div className="text-base">{item.type_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Building")}</div>
              <div className="text-base">{item.building_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Room")}</div>
              <div className="text-base">{item.room_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Condition")}</div>
              <div className="text-base">{item.condition_name || "—"}</div>
            </div>
          </div>

          {photoSrc && (
            <div className="mt-5">
              <div className="mb-2 text-xs text-black/50">{t("Photo")}</div>
              <img
                src={photoSrc}
                alt={item.name}
                className="h-48 w-full rounded-xl border border-black/10 object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FurnitureLabel;