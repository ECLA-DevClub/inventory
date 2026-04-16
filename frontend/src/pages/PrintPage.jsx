import { useState, useEffect } from "react";
import { getBuildings, getRooms, getFurniture } from "../api";
import "../index.css";

// Базовый URL API (если нужно, можно импортировать из конфига)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function PrintPage() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [furnitureList, setFurnitureList] = useState([]);
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
      const [buildingsData, roomsData] = await Promise.all([
        getBuildings(),
        getRooms(),
      ]);
      setBuildings(buildingsData || []);
      setRooms(roomsData || []);
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
    const qrUrl = `${API_BASE_URL}/furniture/${furnitureId}/qr`;
    
    try {
      const response = await fetch(qrUrl);
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
      setError("Выберите этаж и комнату");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const filters = {
        building_id: Number(selectedBuilding),
        room_id: Number(selectedRoom),
      };

      const data = await getFurniture(filters);
      setPreviewData(data || []);
      
      // Загружаем QR-коды для всех предметов
      const qrMap = {};
      
      for (const item of data) {
        try {
          const qr = await fetchQRImage(item.id);
          qrMap[item.id] = qr;
        } catch (e) {
          console.error("QR load failed", item.id);
        }
      }
      
      setQrImages(qrMap);
    } catch (err) {
      console.error(err);
      setError("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  // Функция для генерации PDF с QR-кодами (правильная сетка)
  const handleDownload = async () => {
    if (!selectedBuilding || !selectedRoom) {
      setError("Выберите этаж и комнату");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const filters = {
        building_id: Number(selectedBuilding),
        room_id: Number(selectedRoom),
      };

      const data = await getFurniture(filters);

      if (!data || data.length === 0) {
        setError("В этой комнате нет мебели");
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

        // Выводим code вместо ID
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
      setError("Ошибка генерации PDF");
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
              Generate QR Labels
            </h2>
            <p className="mt-2 text-white/60">
              Choose a building and room, then download QR labels for all assets.
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
                Building
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full rounded-xl bg-white/10 p-3 outline-none backdrop-blur focus:ring-2 focus:ring-blue-500"
                style={{ color: "white" }}
              >
                <option value="" className="text-black">Choose floor</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id} className="text-black">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">
                Room
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                disabled={!selectedBuilding}
                className="w-full rounded-xl bg-white/10 p-3 outline-none backdrop-blur focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                style={{ color: "white" }}
              >
                <option value="" className="text-black">Choose room</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id} className="text-black">
                    {r.name}
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
              {loading ? "Loading..." : "Preview Labels"}
            </button>
            
            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Generating..." : "Download QR PDF"}
            </button>
          </div>

          {previewData.length > 0 && (
            <div className="mt-8 bg-white p-4 rounded-xl text-black">
              <h3 className="mb-4 font-bold text-lg">Preview (A4)</h3>

              <div className="grid grid-cols-3 gap-4">
                {previewData.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-md flex flex-col items-center justify-between p-2 border"
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
                      className="w-30 h-30"
                    />

                    {/* CODE как бейдж */}
                    <div className="text-[18px] font-mono bg-gray-100 px-2 py-1 rounded-md">
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