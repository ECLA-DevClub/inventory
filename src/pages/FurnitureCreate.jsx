import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InventoryContext } from "../context/InventoryContext";

function FurnitureCreate() {
  const navigate = useNavigate();
  const {
    activeTenant,
    furnitureTypes,
    conditions,
    statuses,

    regions,
    getCitiesByRegion,
    getOrgsByRegionCity,
    getBuildingsByRegionCity,
    getRoomsByRegionCityBuilding,

    addFurniture,
  } = useContext(InventoryContext);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    condition: "Good",
    status: "Active",

    region: regions[0] || "",
    city: "",
    organization: "",
    building: "",
    room: "",

    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const cities = useMemo(() => getCitiesByRegion(formData.region), [formData.region, getCitiesByRegion]);
  const orgs = useMemo(
    () => getOrgsByRegionCity(formData.region, formData.city),
    [formData.region, formData.city, getOrgsByRegionCity]
  );
  const buildings = useMemo(
    () => getBuildingsByRegionCity(formData.region, formData.city),
    [formData.region, formData.city, getBuildingsByRegionCity]
  );
  const rooms = useMemo(
    () => getRoomsByRegionCityBuilding(formData.region, formData.city, formData.building),
    [formData.region, formData.city, formData.building, getRoomsByRegionCityBuilding]
  );

  // инициализация зависимых полей при смене региона
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "region") {
      setFormData((p) => ({
        ...p,
        region: value,
        city: "",
        organization: "",
        building: "",
        room: "",
      }));
      return;
    }

    if (name === "city") {
      setFormData((p) => ({
        ...p,
        city: value,
        organization: "",
        building: "",
        room: "",
      }));
      return;
    }

    if (name === "building") {
      setFormData((p) => ({
        ...p,
        building: value,
        room: "",
      }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
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
      setFormData((p) => ({ ...p, photo: reader.result }));
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

    addFurniture(formData);

    setError("");
    setSuccess(true);
    setTimeout(() => navigate("/furniture"), 850);
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
              Create Asset
            </h1>
            <div className="mt-2 text-sm text-white/55">
              Tenant: <span className="text-white/80">{activeTenant.name}</span> • Inventory number will be generated automatically
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

          <select name="type" value={formData.type} onChange={handleChange} className={selectClass}>
            <option value="" className="bg-slate-900">Select Type *</option>
            {furnitureTypes.map((t) => (
              <option key={t} value={t} className="bg-slate-900">{t}</option>
            ))}
          </select>

          <select name="region" value={formData.region} onChange={handleChange} className={selectClass}>
            <option value="" className="bg-slate-900">Select Region *</option>
            {regions.map((r) => (
              <option key={r} value={r} className="bg-slate-900">{r}</option>
            ))}
          </select>

          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={selectClass}
            disabled={!formData.region}
          >
            <option value="" className="bg-slate-900">Select City *</option>
            {cities.map((c) => (
              <option key={c} value={c} className="bg-slate-900">{c}</option>
            ))}
          </select>

          <select
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            className={selectClass}
            disabled={!formData.city}
          >
            <option value="" className="bg-slate-900">Select Organization *</option>
            {orgs.map((o) => (
              <option key={o} value={o} className="bg-slate-900">{o}</option>
            ))}
          </select>

          <select
            name="building"
            value={formData.building}
            onChange={handleChange}
            className={selectClass}
            disabled={!formData.city}
          >
            <option value="" className="bg-slate-900">Select Building *</option>
            {buildings.map((b) => (
              <option key={b} value={b} className="bg-slate-900">{b}</option>
            ))}
          </select>

          <select
            name="room"
            value={formData.room}
            onChange={handleChange}
            className={selectClass}
            disabled={!formData.building}
          >
            <option value="" className="bg-slate-900">Select Room *</option>
            {rooms.map((rm) => (
              <option key={rm.id} value={rm.name} className="bg-slate-900">{rm.name}</option>
            ))}
          </select>

          <select name="status" value={formData.status} onChange={handleChange} className={selectClass}>
            {statuses.map((s) => (
              <option key={s} value={s} className="bg-slate-900">{s}</option>
            ))}
          </select>

          <select name="condition" value={formData.condition} onChange={handleChange} className={`${selectClass} md:col-span-2`}>
            {conditions.map((c) => (
              <option key={c} value={c} className="bg-slate-900">{c}</option>
            ))}
          </select>

          <div className="md:col-span-2">
            <label className="block text-sm mb-3 text-white/60">
              Photo (JPG/PNG, max 5MB)
            </label>

            <input
              type="file"
              accept="image/jpeg, image/png"
              onChange={handlePhotoChange}
              className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full text-white/70 hover:bg-white/10 transition"
            />

            {preview && (
              <div className="mt-6 flex items-center gap-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-2xl border border-white/10"
                />
                <div className="text-sm text-white/60">
                  Preview ready ✅
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="md:col-span-2 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-purple-500 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 text-white py-3 rounded-xl font-medium tracking-wide"
          >
            Save
          </button>
        </form>

        {success && (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm grid place-items-center animate-fadeIn">
            <div className="glass rounded-3xl px-8 py-7 text-center animate-pop">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/20 border border-green-500/30 grid place-items-center">
                <span className="text-2xl">✅</span>
              </div>
              <div className="mt-4 text-white text-lg font-semibold">
                Saved successfully
              </div>
              <div className="mt-1 text-white/55 text-sm">
                Redirecting…
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FurnitureCreate;