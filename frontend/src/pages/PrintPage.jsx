import { useState, useEffect } from "react";
import { getBuildings, getRooms, getFurniture } from "../api";
import QRCode from "qrcode"; // ✅ Импорт QRCode
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

  // ✅ НОВАЯ функция для генерации PDF с QR-кодами
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

      const pdf = new jsPDF();

      let x = 10;
      let y = 10;

      const size = 40;
      const gap = 10;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        const qrData = item.qr || `INV-${item.id}`;

        const qrImage = await QRCode.toDataURL(qrData);

        pdf.addImage(qrImage, "PNG", x, y, size, size);

        pdf.setFontSize(8);
        pdf.text(item.name || "", x, y + size + 4);
        pdf.text(qrData, x, y + size + 8);

        x += size + gap;

        if (x > 170) {
          x = 10;
          y += size + 20;
        }

        if (y > 270) {
          pdf.addPage();
          x = 10;
          y = 10;
        }
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