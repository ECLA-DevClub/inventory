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

  const invValue = item.inv_number || `INV-${item.id}`;

  const buildingValue = item.building_name || "—";
  const roomValue = item.room_name || "—";

  const floorValue =
    item.floor ||
    item.floor_name ||
    item.level ||
    item.level_name ||
    item.building_name ||
    "—";

  const responsibleValue =
    item.responsible_person ||
    item.responsible_name ||
    item.organization ||
    item.organization_name ||
    "—";

  function fitText(pdf, text, maxWidth, startFontSize = 10, minFontSize = 6) {
    let fontSize = startFontSize;
    pdf.setFontSize(fontSize);

    while (fontSize > minFontSize && pdf.getTextWidth(String(text)) > maxWidth) {
      fontSize -= 0.5;
      pdf.setFontSize(fontSize);
    }

    return fontSize;
  }

  function ellipsize(pdf, text, maxWidth) {
    let value = String(text ?? "");
    if (pdf.getTextWidth(value) <= maxWidth) return value;

    while (value.length > 0 && pdf.getTextWidth(`${value}...`) > maxWidth) {
      value = value.slice(0, -1);
    }

    return `${value}...`;
  }

  const downloadStripPdf = () => {
    try {
      setDownloading(true);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [18, 160], // высота 18мм, ширина 160мм
      });

      const pageWidth = 160;
      const pageHeight = 18;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(1, 1, pageWidth - 2, pageHeight - 2);

      // Ширина ячеек как в Excel-строке
      const startX = 1;
      const startY = 1;
      const totalWidth = pageWidth - 2;
      const totalHeight = pageHeight - 2;

      const col1 = 34; // INV
      const col2 = 24; // этаж
      const col3 = 34; // кабинет
      const col4 = totalWidth - col1 - col2 - col3; // ответственный

      const x1 = startX;
      const x2 = x1 + col1;
      const x3 = x2 + col2;
      const x4 = x3 + col3;

      // вертикальные линии
      pdf.line(x2, startY, x2, startY + totalHeight);
      pdf.line(x3, startY, x3, startY + totalHeight);
      pdf.line(x4, startY, x4, startY + totalHeight);

      const cells = [
        {
          text: invValue,
          x: x1,
          w: col1,
        },
        {
          text: floorValue,
          x: x2,
          w: col2,
        },
        {
          text: roomValue === "—" ? t("Room") : `${t("Room")} ${roomValue}`,
          x: x3,
          w: col3,
        },
        {
          text:
            responsibleValue === "—"
              ? t("Responsible")
              : responsibleValue,
          x: x4,
          w: col4,
        },
      ];

      cells.forEach((cell) => {
        const paddingX = 2;
        const availableWidth = cell.w - paddingX * 2;

        pdf.setFont("helvetica", "bold");
        const fontSize = fitText(pdf, cell.text, availableWidth, 10, 6);
        pdf.setFontSize(fontSize);

        const finalText = ellipsize(pdf, cell.text, availableWidth);
        const textWidth = pdf.getTextWidth(finalText);

        const textX = cell.x + (cell.w - textWidth) / 2;
        const textY = startY + totalHeight / 2 + fontSize * 0.18;

        pdf.text(finalText, textX, textY);
      });

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
        [t("Building"), buildingValue],
        [t("Floor"), floorValue],
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

            <div className="overflow-hidden rounded-md border border-black/20 bg-white">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1.6fr] text-center text-sm font-semibold">
                <div className="border-r border-black/20 px-2 py-2">{invValue}</div>
                <div className="border-r border-black/20 px-2 py-2">{floorValue}</div>
                <div className="border-r border-black/20 px-2 py-2">
                  {roomValue === "—" ? t("Room") : `${t("Room")} ${roomValue}`}
                </div>
                <div className="truncate px-2 py-2" title={responsibleValue}>
                  {responsibleValue === "—" ? t("Responsible") : responsibleValue}
                </div>
              </div>
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
              <div className="break-words text-base">{buildingValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">{t("Floor")}</div>
              <div className="break-words text-base">{floorValue}</div>
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