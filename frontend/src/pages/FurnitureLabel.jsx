import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL, getFurnitureById, getFurnitureQrUrl } from "../api";

function FurnitureLabel() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFurnitureById(id)
      .then((data) => {
        setItem(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось загрузить данные мебели");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-white text-xl">Загрузка...</div>;
  }

  if (error) {
    return <div className="text-white text-xl">{error}</div>;
  }

  if (!item) {
    return <div className="text-white text-xl">Мебель не найдена</div>;
  }

  const qrSrc = getFurnitureQrUrl(item.id);
  const photoSrc = item.photo_url ? `${API_URL}${item.photo_url}` : null;

  return (
    <div className="text-white animate-fadeIn">
      <div className="print:hidden flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
        >
          Назад
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 transition"
        >
          Печать
        </button>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-white text-black rounded-2xl shadow-xl p-6 border border-black/10">
          <div className="text-center border-b border-black/10 pb-4">
            <div className="text-xs uppercase tracking-[0.2em] text-black/50">
              Inventory Label
            </div>
            <div className="mt-2 text-2xl font-bold break-all">
              {item.inv_number || `INV-${item.id}`}
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div className="p-3 border border-black/10 rounded-2xl">
              <img
                src={qrSrc}
                alt={`QR ${item.inv_number}`}
                className="w-56 h-56 object-contain"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="text-xs text-black/50">Название</div>
              <div className="text-base font-semibold">{item.name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Тип</div>
              <div className="text-base">{item.type_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Корпус</div>
              <div className="text-base">{item.building_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Комната</div>
              <div className="text-base">{item.room_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-black/50">Состояние</div>
              <div className="text-base">{item.condition_name || "—"}</div>
            </div>
          </div>

          {photoSrc && (
            <div className="mt-5">
              <div className="text-xs text-black/50 mb-2">Фото</div>
              <img
                src={photoSrc}
                alt={item.name}
                className="w-full h-48 object-cover rounded-xl border border-black/10"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FurnitureLabel;