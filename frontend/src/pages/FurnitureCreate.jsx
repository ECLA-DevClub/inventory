import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { InventoryContext } from "../context/InventoryContext";

function FurnitureCreate() {
  const { t } = useTranslation();
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
    price: "",
    type: "",
    condition: "Good",
    status: "Active",

    // location fields are manual now
    city: "",
    organization: "",
    building: "",
    room: "",

    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const defaultRegion = regions[0] || "";
  const cities = useMemo(() => getCitiesByRegion(defaultRegion), [defaultRegion, getCitiesByRegion]);
  const defaultCity = cities[0] || "";

  // optional suggestions from catalogs (still read-only suggestions)
  const orgSuggestions = useMemo(() => getOrgsByRegionCity(defaultRegion, defaultCity), [defaultRegion, defaultCity, getOrgsByRegionCity]);
  const buildingSuggestions = useMemo(() => getBuildingsByRegionCity(defaultRegion, defaultCity), [defaultRegion, defaultCity, getBuildingsByRegionCity]);
  const roomSuggestions = useMemo(() => getRoomsByRegionCityBuilding(defaultRegion, defaultCity, formData.building), [defaultRegion, defaultCity, formData.building, getRoomsByRegionCityBuilding]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
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
      setFormData((p) => ({ ...p, photo: reader.result }));
      setPreview(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.organization || !formData.building || !formData.room) {
      setError(t("Please fill all required fields"));
      return;
    }

    const payload = {
      ...formData,
      region: defaultRegion,
      city: formData.city || defaultCity,
      price: formData.price ? Number(formData.price) : null,
    };

    addFurniture(payload);

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
            <h1 className="text-3xl font-semibold text-white tracking-tight">{t("Create Asset")}</h1>
            <div className="mt-2 text-sm text-white/55">
              {t("Tenant")}: <span className="text-white/80">{activeTenant.name}</span> • {t("Inventory number will be generated automatically")}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-3 mb-6 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name first (user requested) */}
          <input type="text" name="name" placeholder="Name *" value={formData.name} onChange={handleChange} className={inputClass} />

          {/* Price stays optional on the right */}
          <input type="number" name="price" placeholder="Price (optional)" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} className={inputClass} step="0.01" min="0" />

          {/* Location: organization, building (floor), room — manual inputs with suggestions */}
          <div>
            <input list="org-list" name="organization" placeholder="Organization *" value={formData.organization} onChange={handleChange} className={inputClass} />
            <datalist id="org-list">{orgSuggestions.map((o) => <option key={o} value={o} />)}</datalist>
          </div>

          <div>
            <input list="building-list" name="building" placeholder="Building / Floor *" value={formData.building} onChange={handleChange} className={inputClass} />
            <datalist id="building-list">{buildingSuggestions.map((b) => <option key={b} value={b} />)}</datalist>
          </div>

          <div>
            <input list="room-list" name="room" placeholder="Room *" value={formData.room} onChange={handleChange} className={inputClass} />
            <datalist id="room-list">{roomSuggestions.map((r) => <option key={r.id} value={r.name} />)}</datalist>
          </div>

          {/* Type — manual with suggestions */}
          <div>
            <input list="type-list" name="type" placeholder="Type *" value={formData.type} onChange={handleChange} className={inputClass} />
            <datalist id="type-list">{furnitureTypes.map((t) => <option key={t} value={t} />)}</datalist>
          </div>

          {/* Status — make it manual as requested (except condition) */}
          <div>
            <input list="status-list" name="status" placeholder="Status" value={formData.status} onChange={handleChange} className={inputClass} />
            <datalist id="status-list">{statuses.map((s) => <option key={s} value={s} />)}</datalist>
          </div>

          {/* Condition remains a select */}
          <select name="condition" value={formData.condition} onChange={handleChange} className={`${selectClass} md:col-span-2`}>
            {conditions.map((c) => (
              <option key={c} value={c} className="bg-slate-900">{c}</option>
            ))}
          </select>

          <div className="md:col-span-2">
            <label className="block text-sm mb-3 text-white/60">{t("Photo (JPG/PNG, max 5MB)")}</label>

            <input type="file" accept="image/jpeg, image/png" onChange={handlePhotoChange} className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl w-full text-white/70 hover:bg-white/10 transition" />

            {preview && (
              <div className="mt-6 flex items-center gap-6">
                <img src={preview} alt="Preview" className="w-60 h-60 object-cover rounded-2xl border border-white/10" />
                <div className="text-sm text-white/60">{t("Preview ready ✅")}</div>
              </div>
            )}
          </div>

          <button type="submit" className="md:col-span-2 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-purple-500 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 text-white py-3 rounded-xl font-medium tracking-wide">{t("Save")}</button>
        </form>

        {success && (
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm grid place-items-center animate-fadeIn">
            <div className="glass rounded-3xl px-8 py-7 text-center animate-pop">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/20 border border-green-500/30 grid place-items-center"><span className="text-2xl">✅</span></div>
              <div className="mt-4 text-white text-lg font-semibold">{t("Saved successfully")}</div>
              <div className="mt-1 text-white/55 text-sm">{t("Redirecting…")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FurnitureCreate;