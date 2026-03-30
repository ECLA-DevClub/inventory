import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  getFurnitureById,
  getFurnitureQrUrl,
  resolveAssetUrl,
} from "../api";

function FurnitureLabel() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printMode, setPrintMode] = useState("full"); // full | info | qr

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

  const handlePrintMode = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 80);
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
  const photoSrc = resolveAssetUrl(item.photo_url);

  const responsibleValue =
    item.responsible_person ||
    item.responsible_name ||
    item.organization ||
    item.organization_name ||
    "—";

  let roomValue = "—";
  if (item.room_name && item.building_name) {
    roomValue = `${item.building_name} / ${item.room_name}`;
  } else if (item.room_name) {
    roomValue = item.room_name;
  } else if (item.building_name) {
    roomValue = item.building_name;
  }

  return (
    <div className="animate-fadeIn text-white print:text-black">
      <style>
        {`
          @media print {
            @page {
              size: auto;
              margin: 10mm;
            }

            body {
              background: white !important;
            }
          }
        `}
      </style>

      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-white/5 px-4 py-2 transition hover:bg-white/10"
        >
          {t("Back")}
        </button>

        <button
          onClick={() => handlePrintMode("full")}
          className="rounded-xl bg-green-600 px-4 py-2 transition hover:bg-green-700"
        >
          {t("Print QR + Info")}
        </button>

        <button
          onClick={() => handlePrintMode("info")}
          className="rounded-xl bg-blue-600 px-4 py-2 transition hover:bg-blue-700"
        >
          {t("Print Info Only")}
        </button>

        <button
          onClick={() => handlePrintMode("qr")}
          className="rounded-xl bg-purple-600 px-4 py-2 transition hover:bg-purple-700"
        >
          {t("Print QR Only")}
        </button>
      </div>

      <div className="mx-auto max-w-md print:max-w-[92mm]">
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-black shadow-xl print:rounded-none print:border print:p-4 print:shadow-none">
          <div className="border-b border-black/10 pb-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50 print:text-[9px]">
              {t("Inventory Label")}
            </div>
            <div className="mt-2 break-all text-xl font-bold print:text-lg">
              {item.inv_number || `INV-${item.id}`}
            </div>
          </div>

          {(printMode === "full" || printMode === "qr") && (
            <div className="mt-4 flex justify-center">
              <div className="rounded-2xl border border-black/10 p-3 print:rounded-xl print:p-2">
                <img
                  src={qrSrc}
                  alt={`QR ${item.inv_number || `INV-${item.id}`}`}
                  className="h-48 w-48 object-contain print:h-36 print:w-36"
                />
              </div>
            </div>
          )}

          {(printMode === "full" || printMode === "info") && (
            <div className="mt-4 space-y-2.5 print:mt-3 print:space-y-2">
              <div>
                <div className="text-xs text-black/50 print:text-[10px]">
                  {t("ID")}
                </div>
                <div className="break-words text-base font-semibold print:text-sm">
                  {item.id ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-black/50 print:text-[10px]">
                  {t("Name")}
                </div>
                <div className="break-words text-base font-semibold print:text-sm">
                  {item.name || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-black/50 print:text-[10px]">
                  {t("Room")}
                </div>
                <div className="break-words text-base print:text-sm">
                  {roomValue}
                </div>
              </div>

              <div>
                <div className="text-xs text-black/50 print:text-[10px]">
                  {t("Responsible person / Organization")}
                </div>
                <div className="break-words text-base print:text-sm">
                  {responsibleValue}
                </div>
              </div>

              {printMode === "full" && (
                <>
                  <div>
                    <div className="text-xs text-black/50 print:text-[10px]">
                      {t("Type")}
                    </div>
                    <div className="break-words text-base print:text-sm">
                      {item.type_name || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-black/50 print:text-[10px]">
                      {t("Condition")}
                    </div>
                    <div className="break-words text-base print:text-sm">
                      {item.condition_name || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {printMode === "full" && photoSrc && (
            <div className="mt-4 print:mt-3 print:hidden">
              <div className="mb-2 text-xs text-black/50 print:text-[10px]">
                {t("Photo")}
              </div>
              <img
                src={photoSrc}
                alt={item.name}
                className="h-40 w-full rounded-xl border border-black/10 object-cover print:h-28 print:rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FurnitureLabel;