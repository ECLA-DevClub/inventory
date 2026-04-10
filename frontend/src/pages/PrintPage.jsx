import { useState, useEffect } from "react";
import { getBuildings, getRooms, getFurniture } from "../api";
import { deleteUser } from "../api";
import "./index.css";

function PrintPage() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [furnitureList, setFurnitureList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openUserId, setOpenUserId] = useState(null);

  const handleDeleteUser = async (id) => {
  if (!window.confirm("Удалить пользователя?")) return;

  try {
    await deleteUser(id, token);
    await loadUsers();
  } catch (err) {
    alert("Ошибка удаления");
  }
};

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
      
      const data = await getFurniture(filters);
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

    </div>
  );
}

export default PrintPage;