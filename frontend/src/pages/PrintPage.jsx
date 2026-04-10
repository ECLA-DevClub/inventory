import { useState, useEffect } from "react";
import { getBuildings, getRooms, getFurniture } from "../api";
import "../index.css";

function PrintPage() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [furnitureList, setFurnitureList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // ✅ Функция для генерации PDF с QR-кодами (правильная сетка)
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

      // ✅ ПРАВИЛЬНАЯ СЕТКА: 3 колонки, 6 строк = 18 этикеток на страницу
      const cols = 3;
      const rows = 6;

      const marginX = 10;
      const marginY = 10;

      const cellWidth = 60;
      const cellHeight = 45;

      const qrSize = 30;

      // Динамически подключаем qrcode один раз
      const QRCodeLib = await import("qrcode");
      const QRCode = QRCodeLib.default;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        const qrData = item.qr;
        if (!qrData) continue;

        const qrImage = await QRCode.toDataURL(qrData);

        const col = i % cols;
        const row = Math.floor(i / cols) % rows;

        const pageIndex = Math.floor(i / (cols * rows));

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

        // Код (центрировано)
        pdf.text(qrData, x + cellWidth / 2, y + qrSize + 9, {
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
    <div className="print-page">
      {/* Панель управления - не печатается */}
      <div className="no-print controls-panel">
        <h2>Печать этикеток с QR-кодами</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Этаж:</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
          >
            <option value="">Выберите этаж</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Кабинет:</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            disabled={!selectedBuilding}
          >
            <option value="">Выберите кабинет</option>
            {filteredRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div className="button-group">
          <button onClick={handleDownload} disabled={loading}>
            {loading ? "Загрузка..." : "Скачать PDF"}
          </button>
        </div>
      </div>

      {/* Область печати больше не нужна, оставлена пустой */}
      <div className="print-area">
        {/* Здесь больше ничего не отображается, PDF генерируется напрямую */}
      </div>
    </div>
  );
}

export default PrintPage;