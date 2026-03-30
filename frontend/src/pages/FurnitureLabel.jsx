import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  getFurnitureById,
  getFurnitureQrUrl,
  resolveAssetUrl,
} from "../api";

function FurnitureLabel() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const pdfRef = useRef(null);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfMode, setPdfMode] = useState("full"); // full | info | qr
  const [downloading, setDownloading] = useState(false);

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

  const downloadPdf = async (mode) => {
    try {
      setDownloading(true);
      setPdfMode(mode);

      await new Promise((resolve) => setTimeout(resolve, 120));

      const element = pdfRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 12;
      const availableWidth = pageWidth - margin * 2;
      const imgWidth = availableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (finalHeight > pageHeight - margin * 2) {
        finalHeight = pageHeight - margin * 2;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = margin;

      pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);

      const fileSuffix =
        mode === "full" ? "qr-info" : mode === "info" ? "info-only" : "qr-only";

      pdf.save(`inventory-${item.id}-${fileSuffix}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert(t("Failed to generate PDF"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-fadeIn text-white">
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-white/5 px-4 py-2 transition hover:bg-white/10"
        >
          {t("Back")}
        </button>

        <button
          onClick={() => downloadPdf("full")}
          disabled={downloading}
          className="rounded-xl bg-green-600 px-4 py-2 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download PDF: QR + Info")}
        </button>

        <button
          onClick={() => downloadPdf("info")}
          disabled={downloading}
          className="rounded-xl bg-blue-600 px-4 py-2 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download PDF: Info Only")}
        </button>

        <button
          onClick={() => downloadPdf("qr")}
          disabled={downloading}
          className="rounded-xl bg-purple-600 px-4 py-2 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download PDF: QR Only")}
        </button>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-black shadow-xl">
          <div className="border-b border-black/10 pb-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              {t("Inventory Label")}
            </div>
            <div className="mt-2 break-all text-xl font-bold">
              {item.inv_number || `INV-${item.id}`}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border border-black/10 p-3">
              <img
                src={qrSrc}
                alt={`QR ${item.inv_number || `INV-${item.id}`}`}
                className="h-48 w-48 object-contain"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div>
              <div className="text-xs text-black/50">{t("Name")}</div>
              <div className="break-words text-base font-semibold">
                {item.name || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Type")}</div>
              <div className="break-words text-base">{item.type_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Building")}</div>
              <div className="break-words text-base">
                {item.building_name || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Room")}</div>
              <div className="break-words text-base">{item.room_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Condition")}</div>
              <div className="break-words text-base">
                {item.condition_name || "—"}
              </div>
            </div>
          </div>

          {photoSrc && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-black/50">{t("Photo")}</div>
              <img
                src={photoSrc}
                alt={item.name}
                className="h-40 w-full rounded-xl border border-black/10 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed left-[-9999px] top-0 opacity-0">
        <div
          ref={pdfRef}
          className="w-[700px] bg-white p-6 text-black"
        >
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="border-b border-black/10 pb-3 text-center">
              <div className="text-[11px] uppercase tracking-[0.2em] text-black/50">
                {t("Inventory Label")}
              </div>
              <div className="mt-2 break-all text-2xl font-bold">
                {item.inv_number || `INV-${item.id}`}
              </div>
            </div>

            {(pdfMode === "full" || pdfMode === "qr") && (
              <div className="mt-5 flex justify-center">
                <div className="rounded-2xl border border-black/10 p-4">
                  <img
                    src={qrSrc}
                    alt={`QR ${item.inv_number || `INV-${item.id}`}`}
                    className="h-56 w-56 object-contain"
                  />
                </div>
              </div>
            )}

            {(pdfMode === "full" || pdfMode === "info") && (
              <div className="mt-5 space-y-3">
                <div>
                  <div className="text-sm text-black/50">{t("ID")}</div>
                  <div className="text-lg font-semibold">{item.id ?? "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-black/50">{t("Name")}</div>
                  <div className="text-lg font-semibold">{item.name || "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-black/50">{t("Room")}</div>
                  <div className="text-lg">{roomValue}</div>
                </div>

                <div>
                  <div className="text-sm text-black/50">
                    {t("Responsible person / Organization")}
                  </div>
                  <div className="text-lg">{responsibleValue}</div>
                </div>

                {pdfMode === "full" && (
                  <>
                    <div>
                      <div className="text-sm text-black/50">{t("Type")}</div>
                      <div className="text-lg">{item.type_name || "—"}</div>
                    </div>

                    <div>
                      <div className="text-sm text-black/50">{t("Condition")}</div>
                      <div className="text-lg">{item.condition_name || "—"}</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FurnitureLabel;