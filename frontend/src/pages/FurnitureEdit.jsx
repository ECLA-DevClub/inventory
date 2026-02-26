import { useParams, useNavigate } from "react-router-dom";
import { useState, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { InventoryContext } from "../context/InventoryContext";

function FurnitureEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    furniture,
    updateFurniture,
    furnitureTypes,
    conditions,
    statuses,

    regions,
    getCitiesByRegion,
    getOrgsByRegionCity,
    getBuildingsByRegionCity,
    getRoomsByRegionCityBuilding,
  } = useContext(InventoryContext);

  const item = furniture.find((f) => f.id === Number(id));

  if (!item) {
    return (
      <div className="glass rounded-3xl p-8 text-white">
        {t("Asset not found")}
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: item.name,
    type: item.type,
    condition: item.condition,

    // keep these for suggestions / invNumber generation but not editable here
    region: item.region,
    city: item.city,
    organization: item.organization,
    building: item.building,
    room: item.room,

    photo: item.photo,
  });

  const [preview, setPreview] = useState(item.photo || null);
  const [error, setError] = useState("");

  // ===== динамические списки =====
  const cities = useMemo(
    () => getCitiesByRegion(formData.region) || [],
    [formData.region, getCitiesByRegion]
  );

  const orgs = useMemo(
    () => getOrgsByRegionCity(formData.region, formData.city) || [],
    [formData.region, formData.city, getOrgsByRegionCity]
  );

  const buildings = useMemo(
    () => getBuildingsByRegionCity(formData.region, formData.city) || [],
    [formData.region, formData.city, getBuildingsByRegionCity]
  );

  const rooms = useMemo(
    () =>
      getRoomsByRegionCityBuilding(
        formData.region,
        formData.city,
        formData.building
      ) || [],
    [formData.region, formData.city, formData.building, getRoomsByRegionCityBuilding]
  );

  // ===== handlers =====
  const handleChange = (e) => {
    const { name, value } = e.target;

    // keep cascading clears for internal data consistency
    if (name === "building") {
      setFormData({ ...formData, building: value, room: "" });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError(t("Only JPG and PNG allowed"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t("Max file size is 5MB"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, photo: reader.result });
      setPreview(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.building || !formData.room) {
      setError(t("Please fill all required fields"));
      return;
    }

    updateFurniture(item.id, formData);
    navigate(`/furniture/${item.id}`);
  };

  const inputClass =
    "bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none";

  return (
    <div className="glass rounded-3xl p-8 text-white max-w-4xl">

      <h1 className="text-2xl font-semibold mb-6">{t("Edit")} #{item.id}</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <label className="text-sm text-white/60">ID</label>
          <input readOnly value={item.id} className={`${inputClass} mt-1`} />
        </div>

        <div className="md:col-span-2">
          <div className="text-sm text-white/60">{t("Inventory Number")}</div>
          <div className="text-sm text-white/80 mt-1">{item.invNumber}</div>
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

        <div>
          <input
            list="type-list"
            name="type"
            value={formData.type}
            onChange={handleChange}
            placeholder="Type *"
            className={inputClass}
          />
          <datalist id="type-list">
            {furnitureTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <input
            list="building-list"
            name="building"
            value={formData.building}
            onChange={handleChange}
            placeholder="Building *"
            className={inputClass}
          />
          <datalist id="building-list">
            {buildings.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <div>
          <input
            list="room-list"
            name="room"
            value={formData.room}
            onChange={handleChange}
            placeholder="Room *"
            className={inputClass}
          />
          <datalist id="room-list">
            {rooms.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>
        </div>

        <select
          name="condition"
          value={formData.condition}
          onChange={handleChange}
          className={`${inputClass} md:col-span-2`}
        >
          {conditions.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {c}
            </option>
          ))}
        </select>

        <div className="md:col-span-2">
          <div className="flex items-center gap-4 mb-3">
            <input type="file" onChange={handlePhotoChange} />
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, photo: null });
                setPreview(null);
              }}
              className="text-sm text-red-400 hover:underline"
            >
              {t("Remove photo")}
            </button>
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
            className="bg-green-600 px-6 py-3 rounded-xl hover:bg-green-700 transition"
          >
            {t("Save changes")}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/furniture/${item.id}`)}
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