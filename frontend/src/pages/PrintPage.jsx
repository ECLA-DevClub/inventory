import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBuildings, getRooms, getFurniture, getTypes, API_URL } from "../api";
import "../index.css";
import "../fonts/Roboto-Regular.js";

function PrintPage() {
  const { t } = useTranslation();
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [qrImages, setQrImages] = useState({});

  // Загрузка справочников при монтировании
  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const token = localStorage.getItem("access_token") || "";
      
      const [buildingsData, roomsData, typesData] = await Promise.all([
        getBuildings(token),
        getRooms(token),
        getTypes(token),
      ]);
      setBuildings(buildingsData || []);
      setRooms(roomsData || []);
      setTypes(typesData || []);
    } catch (err) {
      console.error("Ошибка загрузки справочников:", err);
      setError("Не удалось загрузить справочники");
    }
  };

  // Фильтрация комнат при выборе здания
  useEffect(() => {
    if (selectedBuilding) {
      const filtered = rooms.filter(
        (room) => Number(room.building_id) === Number(selectedBuilding)
      );
      setFilteredRooms(filtered);
      setSelectedRoom("");
    } else {
      setFilteredRooms([]);
    }
  }, [selectedBuilding, rooms]);

  // Функция для получения QR-кода с бэкенда
  const fetchQRImage = async (furnitureId) => {
    const qrUrl = `${API_URL}/furniture/${furnitureId}/qr`;
    const token = localStorage.getItem("access_token") || "";
    
    try {
      const response = await fetch(qrUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch QR code: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error fetching QR:", error);
      throw error;
    }
  };

  const loadPreview = async () => {
    if (!selectedBuilding || !selectedRoom) {
      setError(t("print.select_error"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token") || "";
      
      const filters = {
        building_id: Number(selectedBuilding),
        room_id: Number(selectedRoom),
      };

      if (selectedType) {
        filters.type_id = Number(selectedType);
      }

      const data = await getFurniture(filters, token);
      setPreviewData(data || []);
      
      // Загружаем QR-коды для всех предметов параллельно
      const qrEntries = await Promise.all(
        data.map(async (item) => {
          try {
            const qr = await fetchQRImage(item.id);
            return [item.id, qr];
          } catch {
            return [item.id, null];
          }
        })
      );
      
      setQrImages(Object.fromEntries(qrEntries));
    } catch (err) {
      console.error(err);
      setError(t("print.load_error"));
    } finally {
      setLoading(false);
    }
  };

  // Функция для генерации PDF с QR-кодами (правильная сетка)
  const handleDownload = async () => {
    if (!selectedBuilding || !selectedRoom) {
      setError(t("print.select_error"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token") || "";
      
      const filters = {
        building_id: Number(selectedBuilding),
        room_id: Number(selectedRoom),
      };

      if (selectedType) {
        filters.type_id = Number(selectedType);
      }

      const data = await getFurniture(filters, token);

      if (!data || data.length === 0) {
        setError(t("print.no_furniture"));
        setLoading(false);
        return;
      }

      // Динамически подключаем jsPDF
      const { jsPDF } = await import("jspdf");

      // Явно задаем формат A4
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Подключаем шрифт Roboto для поддержки кириллицы
      pdf.setFont("Roboto-Regular", "normal");

      // Правильная сетка: 3 колонки, 6 строк = 18 этикеток на страницу
      const cols = 3;
      const rows = 5;

      const marginX = 10;
      const marginY = 10;

      const cellWidth = 60;
      const cellHeight = 55;

      const qrSize = 40;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        // Получаем QR-код с бэкенда
        const qrImage = await fetchQRImage(item.id);

        const col = i % cols;
        const row = Math.floor(i / cols) % rows;

        // Добавляем новую страницу после заполнения предыдущей
        if (i > 0 && i % (cols * rows) === 0) {
          pdf.addPage();
          // На новой странице снова устанавливаем шрифт
          pdf.setFont("Roboto-Regular", "normal");
        }

        const x = marginX + col * cellWidth;
        const y = marginY + row * cellHeight;

        // QR по центру ячейки
        pdf.addImage(
          qrImage,
          "PNG",
          x + (cellWidth - qrSize) / 2,
          y,
          qrSize,
          qrSize
        );

        pdf.setFontSize(7);

        // Название (центрировано)
        pdf.text(item.name || "", x + cellWidth / 2, y + qrSize + 5, {
          maxWidth: cellWidth,
          align: "center",
        });

        // Выводим code
        pdf.text(item.code || "", x + cellWidth / 2, y + qrSize + 9, {
          maxWidth: cellWidth,
          align: "center",
        });

        // Рамка (как наклейка)
        pdf.rect(x, y, cellWidth, cellHeight);
      }

      pdf.save("qr-labels.pdf");
    } catch (err) {
      console.error(err);
      setError(t("print.pdf_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-white/40">
              PRINT WORKFLOW
            </div>
            <h2 className="mt-2 text-3xl font-bold">
              {t("print.title")}
            </h2>
            <p className="mt-2 text-white/60">
              {t("print.description")}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/60">
                {t("print.building")}
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full rounded-xl bg-white/10 p-3 outline-none backdrop-blur focus:ring-2 focus:ring-blue-500"
                style={{ color: "white" }}
              >
                <option value="" className="text-black">{t("print.choose_floor")}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id} className="text-black">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">
                {t("print.room")}
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                disabled={!selectedBuilding}
                className="w-full rounded-xl bg-white/10 p-3 outline-none backdrop-blur focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                style={{ color: "white" }}
              >
                <option value="" className="text-black">{t("print.choose_room")}</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id} className="text-black">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">
                {t("print.type")}
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-xl bg-white/10 p-3 outline-none backdrop-blur focus:ring-2 focus:ring-blue-500"
                style={{ color: "white" }}
              >
                <option value="" className="text-black">
                  {t("print.all_types")}
                </option>

                {types.map((type) => (
                  <option key={type.id} value={type.id} className="text-black">
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={loadPreview}
              disabled={loading}
              className="w-full mb-3 rounded-xl bg-purple-600 py-3 font-semibold transition hover:bg-purple-700 disabled:opacity-60"
            >
              {loading ? t("print.loading") : t("print.preview")}
            </button>
            
            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? t("print.generating") : t("print.download")}
            </button>
          </div>

          {previewData.length > 0 && (
            <div className="mt-8 bg-white p-4 rounded-xl text-black">
              <h3 className="mb-4 font-bold text-lg">{t("print.preview_title")}</h3>

              <div className="grid grid-cols-3 gap-4">
                {previewData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-md flex flex-col items-center justify-between p-3 border"
                    style={{ height: "240px" }}
                  >
                    {/* Название */}
                    <div className="text-[11px] font-semibold text-center leading-tight">
                      {item.name}
                    </div>

                    {/* QR - используем кэшированное изображение */}
                    <img
                      src={qrImages[item.id]}
                      alt="qr"
                      className="w-28 h-28"
                    />

                    {/* CODE как бейдж */}
                    <div className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-md text-center w-full">
                      {item.code}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrintPage;