import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
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

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const buildingValue = item.building_name || "";
  const roomValue = item.room_name || "—";

  const floorValue =
    item.floor ||
    item.floor_name ||
    item.level ||
    item.level_name ||
    buildingValue ||
    "—";

  const invValue = item.inv_number || `INV-${item.id}`;

  const infoLine = [
    invValue,
    floorValue,
    roomValue !== "—" ? `${t("Room")} ${roomValue}` : t("Room unavailable"),
    responsibleValue !== "—"
      ? `${t("Responsible")} ${responsibleValue}`
      : t("Responsible unavailable"),
  ].join("    ");

  const downloadStripPdf = () => {
    try {
      setDownloading(true);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [20, 150],
      });

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 150, 20, "F");

      pdf.setDrawColor(0, 0, 0);
      pdf.rect(1, 1, 148, 18);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);

      const maxWidth = 142;
      const lines = pdf.splitTextToSize(infoLine, maxWidth);

      let y = 11;
      if (lines.length > 1) {
        pdf.setFontSize(9);
        y = 8.5;
      }

      pdf.text(lines, 4, y);

      pdf.save(`inventory-strip-${item.id}.pdf`);
    } catch (err) {
      console.error("Strip PDF download failed:", err);
      alert(t("Failed to generate strip PDF"));
    } finally {
      setDownloading(false);
    }
  };

  const downloadInfoPdf = () => {
    try {
      setDownloading(true);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let y = 20;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(t("Inventory Information"), 15, y);

      y += 14;
      pdf.setFontSize(12);

      const rows = [
        [t("ID"), String(item.id ?? "—")],
        [t("Inventory Number"), invValue],
        [t("Name"), item.name || "—"],
        [t("Type"), item.type_name || "—"],
        [t("Building"), buildingValue || "—"],
        [t("Room"), roomValue],
        [t("Responsible"), responsibleValue],
        [t("Condition"), item.condition_name || "—"],
      ];

      rows.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, 15, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(String(value), 70, y);
        y += 10;
      });

      pdf.save(`inventory-info-${item.id}.pdf`);
    } catch (err) {
      console.error("Info PDF download failed:", err);
      alert(t("Failed to generate info PDF"));
    } finally {
      setDownloading(false);
    }
  };

  const downloadQrPdf = async () => {
    try {
      setDownloading(true);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = qrSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const imgData = canvas.toDataURL("image/png");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(invValue, 105, 20, { align: "center" });

      pdf.addImage(imgData, "PNG", 55, 30, 100, 100);

      pdf.save(`inventory-qr-${item.id}.pdf`);
    } catch (err) {
      console.error("QR PDF download failed:", err);
      alert(t("Failed to generate QR PDF"));
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
          onClick={downloadStripPdf}
          disabled={downloading}
          className="rounded-xl bg-orange-600 px-4 py-2 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download Strip Label")}
        </button>

        <button
          onClick={downloadInfoPdf}
          disabled={downloading}
          className="rounded-xl bg-blue-600 px-4 py-2 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download Info PDF")}
        </button>

        <button
          onClick={downloadQrPdf}
          disabled={downloading}
          className="rounded-xl bg-purple-600 px-4 py-2 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : t("Download QR PDF")}
        </button>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-black shadow-xl">
          <div className="border-b border-black/10 pb-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              {t("Inventory Label")}
            </div>
            <div className="mt-2 break-all text-xl font-bold">{invValue}</div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-black/20 bg-black/[0.03] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50">
              {t("Strip preview")}
            </div>
            <div className="overflow-x-auto whitespace-nowrap text-sm font-semibold">
              {invValue} | {floorValue} | {t("Room")} {roomValue} | {t("Responsible")}{" "}
              {responsibleValue}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border border-black/10 p-3">
              <img
                src={qrSrc}
                alt={`QR ${invValue}`}
                className="h-48 w-48 object-contain"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div>
              <div className="text-xs text-black/50">{t("ID")}</div>
              <div className="break-words text-base font-semibold">
                {item.id ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Name")}</div>
              <div className="break-words text-base font-semibold">
                {item.name || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Building")}</div>
              <div className="break-words text-base">{buildingValue || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Room")}</div>
              <div className="break-words text-base">{roomValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Responsible")}</div>
              <div className="break-words text-base">{responsibleValue}</div>
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
    </div>
  );
}

export default FurnitureLabel;