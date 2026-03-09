import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createFurniture, uploadPhoto, getConditions } from "../api";
function FurnitureCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
const [success, setSuccess] = useState(false);
const [loading, setLoading] = useState(false);
const [conditionsList, setConditionsList] = useState([]);

useEffect(() => {
  getConditions()
    .then((data) => {
      setConditionsList(data);

      if (data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          condition_id: data[0].id,
        }));
      }
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

    if (!formData.name) {
      setError("Введите название");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const createdItem = await createFurniture({
        name: formData.name,
        type_id: Number(formData.type_id),
        building_id: Number(formData.building_id),
        room_id: Number(formData.room_id),
        condition_id: Number(formData.condition_id),
      });

      if (formData.photo) {
        await uploadPhoto(createdItem.id, formData.photo);
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/furniture");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить мебель");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "bg-white/5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 px-4 py-3 rounded-xl text-white placeholder-white/35 outline-none transition hover:bg-white/10";

  const selectClass = inputClass;

  return (
    <div className="max-w-4xl animate-fadeIn">
      <div className="glass rounded-3xl p-10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              {t("Create Asset")}
            </h1>
            <div className="mt-2 text-sm text-white/55">
              Инвентарный номер будет сгенерирован автоматически
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 mb-6 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            name="name"
            placeholder="Name *"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
          />

          <select
            name="type_id"
            value={formData.type_id}
            onChange={handleChange}
            className={selectClass}
          >
            <option value={1} className="bg-slate-900">Стол</option>
            <option value={2} className="bg-slate-900">Стул</option>
          </select>

          <select
            name="building_id"
            value={formData.building_id}
            onChange={handleChange}
            className={selectClass}
          >
            <option value={1} className="bg-slate-900">Корпус A</option>
          </select>

          <select
            name="room_id"
            value={formData.room_id}
            onChange={handleChange}
            className={selectClass}
          >
            <option value={1} className="bg-slate-900">101</option>
          </select>

          <select
  name="condition_id"
  value={formData.condition_id}
  onChange={handleChange}
  className={`${selectClass} md:col-span-2`}
>
  {conditionsList.map((c) => (
    <option key={c.id} value={c.id} className="bg-slate-900">
      {c.name}
    </option>
  ))}
</select>

          <div className="md:col-span-2">
            <label className="block text-sm mb-3 text-white/60">
              {t("Photo (JPG/PNG, max 5MB)")}
            </label>

            <input
              type="file"
              accept="image/jpeg, image/png"
              onChange={handlePhotoChange}
              className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full text-white/70 hover:bg-white/10 transition"
            />

            {preview && (
              <div className="mt-6 flex items-center gap-6">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-60 h-60 object-cover rounded-2xl border border-white/10"
                />
                <div className="text-sm text-white/60">Preview ready ✅</div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-purple-500 active:scale-[0.98] transition-all duration-300 text-white py-3 rounded-xl font-medium tracking-wide disabled:opacity-60"
          >
            {loading ? "Сохранение..." : t("Save")}
          </button>
        </form>

        {success && (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm grid place-items-center animate-fadeIn">
            <div className="glass rounded-3xl px-8 py-7 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/20 border border-green-500/30 grid place-items-center">
                <span className="text-2xl">✅</span>
              </div>
              <div className="mt-4 text-white text-lg font-semibold">
                Saved successfully
              </div>
              <div className="mt-1 text-white/55 text-sm">Redirecting…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FurnitureCreate;