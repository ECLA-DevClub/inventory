import { useState, useEffect } from "react";
import { getBuildings, getRooms, getFurniture } from "../api";

function PrintPage() {
  const { token } = useAuth();
  
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
        getBuildings(token),
        getRooms(token),
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

  const handleLoad = async () => {
    if (!selectedBuilding || !selectedRoom) {
      setError("Выберите этаж и комнату");
      return;
    }

    setLoading(true);
    setError("");
    setFurnitureList([]);

    try {
      const filters = {
        building_id: Number(selectedBuilding),
        room_id: Number(selectedRoom),
      };
      
      const data = await getFurniture(filters, token);
      setFurnitureList(data || []);
      
      if (data.length === 0) {
        setError("В этой комнате нет мебели");
      }
    } catch (err) {
      console.error("Ошибка загрузки мебели:", err);
      setError("Не удалось загрузить список мебели");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-page">
      {/* Панель управления - не печатается */}
      <div className="no-print controls-panel">
        <h2>Печать этикеток</h2>
        
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
          <button onClick={handleLoad} disabled={loading}>
            {loading ? "Загрузка..." : "Загрузить"}
          </button>
          <button onClick={handlePrint} disabled={furnitureList.length === 0}>
            Печать
          </button>
        </div>
      </div>

      {/* Область печати */}
      <div className="print-area">
        {furnitureList.map((item) => (
          <div key={item.id} className="card">
            <div className="inv-number">{item.inventory_number || item.inv_number || "—"}</div>
            <div className="location">
              {item.building_name || item.building?.name || `Этаж ${item.building_id}`} / 
              {item.room_name || item.room?.name || `Каб. ${item.room_id}`}
            </div>
            <div className="name">{item.name}</div>
          </div>
        ))}
      </div>

      <style>{`
        .print-page {
          min-height: 100vh;
          background: #f5f5f5;
        }

        /* Панель управления */
        .controls-panel {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .controls-panel h2 {
          margin-top: 0;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
        }

        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .button-group button {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-group button:first-child {
          background: #007bff;
          color: white;
        }

        .button-group button:first-child:hover {
          background: #0056b3;
        }

        .button-group button:last-child {
          background: #28a745;
          color: white;
        }

        .button-group button:last-child:hover {
          background: #1e7e34;
        }

        .button-group button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        /* Область печати A4 - формат наклейки 90x50mm */
        .print-area {
            display: grid;
            grid-template-columns: repeat(2, 90mm);
            justify-content: center;
            gap: 10mm;
            padding: 20px;
}

        .card {
          width: 90mm;
          height: 50mm;
          border: 2px solid black;
          padding: 8px;
          font-size: 12px;
          background: white;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .card .inv-number {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 6px;
          text-align: center;
          border-bottom: 1px solid #ccc;
          padding-bottom: 4px;
        }

        .card .location {
          font-size: 10px;
          color: #555;
          margin-bottom: 4px;
          text-align: center;
        }

        .card .name {
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          margin-top: 4px;
          word-break: break-word;
        }

        /* Стили для печати */
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            width: 210mm;
            padding: 10mm;
            margin: 0;
            gap: 8px;
          }

          .card {
            border: 2px solid black;
            break-inside: avoid;
            page-break-inside: avoid;
            width: 90mm;
            height: 50mm;
          }
        }
      `}</style>
    </div>
  );
}

export default PrintPage;