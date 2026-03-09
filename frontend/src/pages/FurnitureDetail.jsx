import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFurnitureById, deleteFurnitureApi } from "../api";

function FurnitureDetail() {
  const { t } = useTranslation();
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
        setError("Не удалось загрузить мебель");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleDelete = async () => {
    const ok = confirm("Удалить эту мебель?");
    if (!ok) return;

    try {
      await deleteFurnitureApi(id);
      navigate("/furniture");
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить мебель");
    }
  };

  if (loading) {
    return <div className="text-white text-xl">Загрузка...</div>;
  }

  if (error) {
    return <div className="text-white text-xl">{error}</div>;
  }

  if (!item) {
    return <div className="text-white text-xl">{t("Asset not found")}</div>;
  }

  const photoSrc = item.photo_url
    ? `http://127.0.0.1:8000${item.photo_url}`
    : null;

  return (
    <div className="text-white animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="text-xs text-white/50">{t("Inventory Number")}</div>

          <div className="text-2xl md:text-3xl font-semibold break-all mt-1">
            INV-{item.id}
          </div>

          <div className="mt-3 text-lg text-white/80">{item.name}</div>

          {photoSrc && (
            <div className="mt-4">
              <img
                src={photoSrc}
                alt={item.name}
                className="w-72 h-72 object-cover rounded-2xl border border-white/10"
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
              {item.condition_name || "—"}
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
              {item.type_name || "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition w-full sm:w-auto"
          >
            {t("Back")}
          </button>

          <Link
            to={`/furniture/${item.id}/edit`}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-center w-full sm:w-auto"
          >
            Edit
          </Link>

          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 transition w-full sm:w-auto"
          >
            {t("Delete")}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 mt-8">
        <div className="text-sm text-white/50 mb-2">{t("Location")}</div>

        <div className="text-white text-base leading-relaxed">
          {item.building_name || "—"}
        </div>

        <div className="text-white/70 mt-2">
          {t("Room")} {item.room_name || "—"}
        </div>
      </div>
    </div>
  );
}

export default FurnitureDetail;