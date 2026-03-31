import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  getFurnitureById,
  getFurnitureQrUrl,
  resolveAssetUrl,
} from "../api";

function FurnitureLabel() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const stripRef = useRef(null);

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

  const rawRoomValue =
    item.room_name ||
    item.room ||
    item.cabinet ||
    item.room_number ||
    "";

  const roomDigitsMatch = String(rawRoomValue).match(/\d{3,}/);
  const roomDigits = roomDigitsMatch ? roomDigitsMatch[0] : "";
  const roomValue = roomDigits || rawRoomValue || "—";

  const floorValue =
    roomDigits && roomDigits.length >= 3 ? `${roomDigits[0]} этаж` : "—";

  const responsibleValue =
    item.responsible_person ||
    item.responsible_name ||
    item.organization ||
    item.organization_name ||
    "Ответственный";

  const downloadStripPdf = async () => {
    try {
      setDownloading(true);

      const element = stripRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [18, 160],
      });

      pdf.addImage(imgData, "PNG", 1, 1, 158, 16);
      pdf.save(`inventory-strip-${item.id}.pdf`);
    } catch (err) {
      console.error("Strip PDF download failed:", err);
      alert("Failed to generate strip PDF");
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
      pdf.text("Inventory Information", 15, y);

      y += 14;
      pdf.setFontSize(12);

      const rows = [
        ["ID", String(item.id ?? "—")],
        ["Inventory Number", invValue],
        ["Name", item.name || "—"],
        ["Building", buildingValue],
        ["Floor", floorValue],
        ["Room", roomValue],
        ["Responsible", responsibleValue],
        ["Condition", item.condition_name || "—"],
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
      alert("Failed to generate info PDF");
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
      alert("Failed to generate QR PDF");
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
          {downloading ? t("Generating...") : "Download Strip Label"}
        </button>

        <button
          onClick={downloadInfoPdf}
          disabled={downloading}
          className="rounded-xl bg-blue-600 px-4 py-2 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : "Download Info PDF"}
        </button>

        <button
          onClick={downloadQrPdf}
          disabled={downloading}
          className="rounded-xl bg-purple-600 px-4 py-2 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? t("Generating...") : "Download QR PDF"}
        </button>
      </div>

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-black shadow-xl">
          <div className="border-b border-black/10 pb-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">
              INVENTORY LABEL
            </div>
            <div className="mt-2 break-all text-xl font-bold">{invValue}</div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-black/20 bg-black/[0.03] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/50">
              STRIP PREVIEW
            </div>

            <div className="overflow-hidden rounded-md border border-black/20 bg-white">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1.6fr] text-center text-sm font-semibold">
                <div className="border-r border-black/20 px-2 py-2">{invValue}</div>
                <div className="border-r border-black/20 px-2 py-2">{floorValue}</div>
                <div className="border-r border-black/20 px-2 py-2">
                  {roomValue === "—" ? "Кабинет" : `Кабинет ${roomValue}`}
                </div>
                <div className="truncate px-2 py-2" title={responsibleValue}>
                  {responsibleValue}
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
              <div className="text-xs text-black/50">ID</div>
              <div className="break-words text-base font-semibold">
                {item.id ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">Name</div>
              <div className="break-words text-base font-semibold">
                {item.name || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-black/50">Building</div>
              <div className="break-words text-base">{buildingValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Floor</div>
              <div className="break-words text-base">{floorValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Room</div>
              <div className="break-words text-base">{roomValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Responsible</div>
              <div className="break-words text-base">{responsibleValue}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Condition</div>
              <div className="break-words text-base">
                {item.condition_name || "—"}
              </div>
            </div>
          </div>

          {photoSrc && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-black/50">Photo</div>
              <img
                src={photoSrc}
                alt={item.name}
                className="h-40 w-full rounded-xl border border-black/10 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed left-[-9999px] top-0 opacity-100">
        <div
          ref={stripRef}
          style={{
            width: "1580px",
            height: "160px",
            background: "#ffffff",
            border: "3px solid #111111",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr 1fr 1.6fr",
            fontFamily: "Arial, sans-serif",
            fontWeight: 700,
            color: "#111111",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              borderRight: "2px solid #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              padding: "0 16px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {invValue}
          </div>

          <div
            style={{
              borderRight: "2px solid #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              padding: "0 16px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {floorValue}
          </div>

          <div
            style={{
              borderRight: "2px solid #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              padding: "0 16px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {roomValue === "—" ? "Кабинет" : `Кабинет ${roomValue}`}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              padding: "0 16px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {responsibleValue}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FurnitureLabel;