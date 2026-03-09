import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getFurnitureById,
  updateFurniture,
  uploadPhoto,
  getConditions,
} from "../api";

function FurnitureEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [conditionsList, setConditionsList] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    type_id: 1,
    building_id: 1,
    room_id: 1,
    condition_id: 1,
    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFurnitureById(id)
      .then((data) => {
        setItem(data);
        setFormData({
          name: data.name || "",
          type_id: data.type_id || 1,
          building_id: data.building_id || 1,
          room_id: data.room_id || 1,
          condition_id: data.condition_id || 1,
          photo: null,
        });

        if (data.photo_url) {
          setPreview(`http://127.0.0.1:8000${data.photo_url}`);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось загрузить данные мебели");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    getConditions()
      .then((data) => {
        setConditionsList(data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки состояний:", err);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.endsWith("_id") ? Number(value) : value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Разрешены только JPG и PNG");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Максимальный размер файла 5 MB");
      return;
    }

    setFormData((prev) => ({ ...prev, photo: file }));
    setPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Введите название");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await updateFurniture(id, {
        name: formData.name,
        type_id: Number(formData.type_id),
        building_id: Number(formData.building_id),
        room_id: Number(formData.room_id),
        condition_id: Number(formData.condition_id),
      });

      if (formData.photo) {
        await uploadPhoto(id, formData.photo);
      }

      navigate("/furniture");
    } catch (err) {
      console.error(err);
      setError(err.message || "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none w-full";

  if (loading) {
    return (
      <div className="glass rounded-3xl p-8 text-white">
        Загрузка...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="glass rounded-3xl p-8 text-white">
        {t("Asset not found")}
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-8 text-white max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">
        {t("Edit")} #{item.id}
      </h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <label className="text-sm text-white/60">ID</label>
          <input
            readOnly
            value={item.id}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-sm text-white/60">{t("Inventory Number")}</div>
          <div className="text-sm text-white/80 mt-1">INV-{item.id}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 p-3 rounded-xl mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Name *"
          className={inputClass}
        />

        <select
          name="type_id"
          value={formData.type_id}
          onChange={handleChange}
          className={inputClass}
        >
          <option value={1} className="bg-slate-900">
            Стол
          </option>
          <option value={2} className="bg-slate-900">
            Стул
          </option>
        </select>

        <select
          name="building_id"
          value={formData.building_id}
          onChange={handleChange}
          className={inputClass}
        >
          <option value={1} className="bg-slate-900">
            Корпус A
          </option>
        </select>

        <select
          name="room_id"
          value={formData.room_id}
          onChange={handleChange}
          className={inputClass}
        >
          <option value={1} className="bg-slate-900">
            101
          </option>
        </select>

        <select
          name="condition_id"
          value={formData.condition_id}
          onChange={handleChange}
          className={`${inputClass} md:col-span-2`}
        >
          {conditionsList.map((c) => (
            <option key={c.id} value={c.id} className="bg-slate-900">
              {c.name}
            </option>
          ))}
        </select>

        <div className="md:col-span-2">
          <div className="flex items-center gap-4 mb-3">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handlePhotoChange}
            />
          </div>

          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-60 h-60 object-cover rounded-xl border border-white/10"
            />
          ) : (
            <div className="w-60 h-60 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
              {t("No photo")}
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex gap-4 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 px-6 py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-60"
          >
            {saving ? "Сохранение..." : t("Save changes")}
          </button>

          <button
            type="button"
            onClick={() => navigate("/furniture")}
            className="bg-white/5 px-6 py-3 rounded-xl hover:bg-white/10 transition"
          >
            {t("Cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FurnitureEdit;