import { useParams, useNavigate } from "react-router-dom";
import { useState, useContext, useMemo } from "react";
import { InventoryContext } from "../context/InventoryContext";

function FurnitureEdit() {
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
        Asset not found
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: item.name,
    type: item.type,
    condition: item.condition,
    status: item.status,

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

    if (name === "region") {
      setFormData({
        ...formData,
        region: value,
        city: "",
        organization: "",
        building: "",
        room: "",
      });
      return;
    }

    if (name === "city") {
      setFormData({
        ...formData,
        city: value,
        organization: "",
        building: "",
        room: "",
      });
      return;
    }

    if (name === "building") {
      setFormData({
        ...formData,
        building: value,
        room: "",
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG and PNG allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Max file size is 5MB");
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

    if (
      !formData.name ||
      !formData.type ||
      !formData.region ||
      !formData.city ||
      !formData.organization ||
      !formData.building ||
      !formData.room
    ) {
      setError("Please fill all required fields");
      return;
    }

    updateFurniture(item.id, formData);
    navigate(`/furniture/${item.id}`);
  };

  const inputClass =
    "bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none";

  return (
    <div className="glass rounded-3xl p-8 text-white max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">
        Edit Asset
      </h1>

      <div className="mb-4 text-sm text-white/60">
        Inventory Number: {item.invNumber}
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
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={inputClass}
        >
          {furnitureTypes.map((t) => (
            <option key={t} value={t} className="bg-slate-900">
              {t}
            </option>
          ))}
        </select>

        <select
          name="region"
          value={formData.region}
          onChange={handleChange}
          className={inputClass}
        >
          {regions.map((r) => (
            <option key={r} value={r} className="bg-slate-900">
              {r}
            </option>
          ))}
        </select>

        <select
          name="city"
          value={formData.city}
          onChange={handleChange}
          className={inputClass}
        >
          {cities.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {c}
            </option>
          ))}
        </select>

        <select
          name="organization"
          value={formData.organization}
          onChange={handleChange}
          className={inputClass}
        >
          {orgs.map((o) => (
            <option key={o} value={o} className="bg-slate-900">
              {o}
            </option>
          ))}
        </select>

        <select
          name="building"
          value={formData.building}
          onChange={handleChange}
          className={inputClass}
        >
          {buildings.map((b) => (
            <option key={b} value={b} className="bg-slate-900">
              {b}
            </option>
          ))}
        </select>

        <select
          name="room"
          value={formData.room}
          onChange={handleChange}
          className={inputClass}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.name} className="bg-slate-900">
              {r.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className={inputClass}
        >
          {statuses.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {s}
            </option>
          ))}
        </select>

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
          <input
            type="file"
            onChange={handlePhotoChange}
            className="mb-4"
          />

          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-xl border border-white/10"
            />
          )}
        </div>

        <button
          type="submit"
          className="md:col-span-2 bg-blue-600 py-3 rounded-xl hover:bg-blue-700 transition"
        >
          Update Asset
        </button>

      </form>
    </div>
  );
}

export default FurnitureEdit;