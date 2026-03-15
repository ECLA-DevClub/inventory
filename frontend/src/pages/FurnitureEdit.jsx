import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import {
  getFurnitureById,
  updateFurniture,
  uploadPhoto,
  getConditions,
  getTypes,
  getBuildings,
  getRooms,
  resolveAssetUrl,
} from "../api";

function FurnitureEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, authReady } = useContext(AuthContext);

  const [item, setItem] = useState(null);
  const [typesList, setTypesList] = useState([]);
  const [buildingsList, setBuildingsList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [conditionsList, setConditionsList] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    type_id: "",
    building_id: "",
    room_id: "",
    condition_id: "",
    model: "",
    manufacturer: "",
    purchase_date: "",
    price_kgs: "",
    change_reason: "",
    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filteredRooms = useMemo(() => {
    if (!formData.building_id) return roomsList;
    return roomsList.filter(
      (room) => Number(room.building_id) === Number(formData.building_id)
    );
  }, [roomsList, formData.building_id]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [itemData, typesData, buildingsData, roomsData, conditionsData] =
          await Promise.all([
            getFurnitureById(id),
            getTypes(),
            getBuildings(),
            getRooms(),
            getConditions(),
          ]);

        if (cancelled) return;

        setItem(itemData);
        setTypesList(Array.isArray(typesData) ? typesData : []);
        setBuildingsList(Array.isArray(buildingsData) ? buildingsData : []);
        setRoomsList(Array.isArray(roomsData) ? roomsData : []);
        setConditionsList(Array.isArray(conditionsData) ? conditionsData : []);

        setFormData({
          name: itemData?.name || "",
          type_id: itemData?.type_id || "",
          building_id: itemData?.building_id || "",
          room_id: itemData?.room_id || "",
          condition_id: itemData?.condition_id ?? "",
          model: itemData?.model || "",
          manufacturer: itemData?.manufacturer || "",
          purchase_date: itemData?.purchase_date || "",
          price_kgs:
            itemData?.price_kgs === null || itemData?.price_kgs === undefined
              ? ""
              : String(itemData.price_kgs),
          change_reason: "",
          photo: null,
        });

        setPreview(resolveAssetUrl(itemData?.photo_url));
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(t("Asset load failed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (!formData.building_id) return;

    const roomExistsInBuilding = filteredRooms.some(
      (room) => Number(room.id) === Number(formData.room_id)
    );

    if (!roomExistsInBuilding) {
      setFormData((prev) => ({
        ...prev,
        room_id: filteredRooms.length > 0 ? filteredRooms[0].id : "",
      }));
    }
  }, [formData.building_id, filteredRooms, formData.room_id]);

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setError("");
    clearFieldError(name);

    if (name === "building_id") {
      setFormData((prev) => ({
        ...prev,
        building_id: value === "" ? "" : Number(value),
        room_id: "",
      }));
      return;
    }

    if (name === "price_kgs") {
      setFormData((prev) => ({
        ...prev,
        price_kgs: value.replace(/[^\d]/g, ""),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name.endsWith("_id") && value !== "" ? Number(value) : value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setError("");
    clearFieldError("photo");

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: t("JPG PNG only"),
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: t("Max file 5MB"),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, photo: file }));
    setPreview(URL.createObjectURL(file));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = t("Name is required");
    }

    if (!formData.type_id) {
      errors.type_id = t("Choose type error");
    }

    if (!formData.building_id) {
      errors.building_id = t("Choose building error");
    }

    if (!formData.room_id) {
      errors.room_id = t("Choose room error");
    }

    if (
      formData.purchase_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.purchase_date)
    ) {
      errors.purchase_date = t("Date format error");
    }

    if (
      formData.price_kgs !== "" &&
      (!/^\d+$/.test(formData.price_kgs) || Number(formData.price_kgs) < 0)
    ) {
      errors.price_kgs = t("Price format error");
    }

    if (!formData.change_reason.trim()) {
      errors.change_reason = t("Change reason is required");
    } else if (formData.change_reason.trim().length < 5) {
      errors.change_reason = t("Change reason too short");
    }

    return errors;
  };

  const mapBackendErrorToField = (message) => {
    const lower = String(message || "").toLowerCase();

    if (lower.includes("change_reason")) {
      return { change_reason: t("Change reason is required") };
    }
    if (lower.includes("name")) return { name: t("Check Name") };
    if (lower.includes("type_id")) return { type_id: t("Check Type") };
    if (lower.includes("building_id")) return { building_id: t("Check Building") };
    if (lower.includes("room_id")) return { room_id: t("Check Room") };
    if (lower.includes("condition_id")) {
      return { condition_id: t("Check Condition") };
    }
    if (lower.includes("purchase_date") || lower.includes("date")) {
      return { purchase_date: t("Check Purchase Date") };
    }
    if (lower.includes("price_kgs") || lower.includes("price")) {
      return { price_kgs: t("Check Price") };
    }
    if (lower.includes("manufacturer")) {
      return { manufacturer: t("Check Manufacturer") };
    }
    if (lower.includes("model")) {
      return { model: t("Check Model") };
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!authReady) {
      setError(t("Session check not finished"));
      return;
    }

    if (!token) {
      setError(t("Session expired"));
      return;
    }

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(t("Please fix form errors"));
      return;
    }

    try {
      setSaving(true);
      setError("");
      setFieldErrors({});

      await updateFurniture(
        id,
        {
          name: formData.name.trim(),
          type_id: Number(formData.type_id),
          building_id: Number(formData.building_id),
          room_id: Number(formData.room_id),
          condition_id:
            formData.condition_id === "" ? null : Number(formData.condition_id),
          model: formData.model.trim() || null,
          manufacturer: formData.manufacturer.trim() || null,
          purchase_date: formData.purchase_date || null,
          price_kgs:
            formData.price_kgs === "" ? null : Number(formData.price_kgs),
          change_reason: formData.change_reason.trim(),
        },
        token
      );

      if (formData.photo) {
        await uploadPhoto(id, formData.photo, token);
      }

      navigate("/furniture");
    } catch (err) {
      console.error(err);
      const backendFieldError = mapBackendErrorToField(err.message);
      if (backendFieldError) {
        setFieldErrors(backendFieldError);
      }
      setError(err.message || t("Save changes failed"));
    } finally {
      setSaving(false);
    }
  };

  const baseFieldClass =
    "w-full rounded-[28px] border bg-white/[0.06] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:bg-white/10 focus:ring-2";

  const getFieldClass = (fieldName) =>
    `${baseFieldClass} ${
      fieldErrors[fieldName]
        ? "border-red-400/40 focus:border-red-400/50 focus:ring-red-400/20"
        : "border-white/10 focus:border-blue-400/40 focus:ring-blue-400/20"
    }`;

  const readonlyClass =
    "w-full rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4 text-white/80 outline-none backdrop-blur-xl";

  const renderFieldError = (fieldName) =>
    fieldErrors[fieldName] ? (
      <div className="mt-2 text-sm text-red-300">{fieldErrors[fieldName]}</div>
    ) : null;

  if (loading) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span>{t("Loading...")}</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        {t("Asset not found")}
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl animate-fadeIn">
      <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-6 text-white shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 mb-8">
          <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
            {t("Asset editor")}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {t("Edit")} #{item.id}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
                {t("Edit asset description")}
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75">
              <span className="text-white/45">{t("Inventory Number")}:</span>{" "}
              <span className="font-medium text-white">
                {item.inv_number || `INV-${item.id}`}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative z-10 mb-6 rounded-[1.25rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="relative z-10 mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              ID
            </label>
            <input readOnly value={item.id} className={readonlyClass} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-white/70">
              {t("Inventory Number")}
            </label>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4 text-white/85 backdrop-blur-xl">
              {item.inv_number || `INV-${item.id}`}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Name")}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("Example teacher desk")}
              className={getFieldClass("name")}
            />
            {renderFieldError("name")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Type")}
            </label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={handleChange}
              className={getFieldClass("type_id")}
            >
              <option value="" className="bg-slate-900">
                {t("Choose type")}
              </option>
              {typesList.map((type) => (
                <option key={type.id} value={type.id} className="bg-slate-900">
                  {type.name}
                </option>
              ))}
            </select>
            {renderFieldError("type_id")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Model")}
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder={t("Example office model")}
              className={getFieldClass("model")}
            />
            {renderFieldError("model")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Manufacturer")}
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              placeholder={t("Example manufacturer")}
              className={getFieldClass("manufacturer")}
            />
            {renderFieldError("manufacturer")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Purchase Date")}
            </label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleChange}
              className={getFieldClass("purchase_date")}
            />
            {renderFieldError("purchase_date")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Price (KGS)")}
            </label>
            <input
              type="text"
              name="price_kgs"
              value={formData.price_kgs}
              onChange={handleChange}
              placeholder="4500"
              className={getFieldClass("price_kgs")}
            />
            {renderFieldError("price_kgs")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Building")}
            </label>
            <select
              name="building_id"
              value={formData.building_id}
              onChange={handleChange}
              className={getFieldClass("building_id")}
            >
              <option value="" className="bg-slate-900">
                {t("Choose building")}
              </option>
              {buildingsList.map((building) => (
                <option
                  key={building.id}
                  value={building.id}
                  className="bg-slate-900"
                >
                  {building.name}
                </option>
              ))}
            </select>
            {renderFieldError("building_id")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Room")}
            </label>
            <select
              name="room_id"
              value={formData.room_id}
              onChange={handleChange}
              className={getFieldClass("room_id")}
            >
              <option value="" className="bg-slate-900">
                {t("Choose room")}
              </option>
              {filteredRooms.map((room) => (
                <option key={room.id} value={room.id} className="bg-slate-900">
                  {room.name}
                </option>
              ))}
            </select>
            {renderFieldError("room_id")}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Condition")}
            </label>
            <select
              name="condition_id"
              value={formData.condition_id}
              onChange={handleChange}
              className={getFieldClass("condition_id")}
            >
              <option value="" className="bg-slate-900">
                {t("No condition")}
              </option>
              {conditionsList.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("condition_id")}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-white/70">
              {t("Reason for change")}
            </label>
            <textarea
              name="change_reason"
              value={formData.change_reason}
              onChange={handleChange}
              rows={4}
              placeholder={t("Example moved to another room after audit")}
              className={`${getFieldClass("change_reason")} resize-none`}
            />
            <div className="text-xs text-white/45">
              {t("This field is required and will be saved in asset history")}
            </div>
            {renderFieldError("change_reason")}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block text-sm font-medium text-white/75">
                    {t("Photo (JPG/PNG, max 5MB)")}
                  </label>
                  <p className="mt-1 text-xs text-white/45">
                    {t("Edit photo upload help")}
                  </p>
                </div>

                {formData.photo && (
                  <span className="liquid-badge">{t("New file selected")}</span>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className={getFieldClass("photo")}
              />
              {renderFieldError("photo")}

              <div className="mt-6">
                {preview ? (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <img
                      src={preview}
                      alt={t("Preview")}
                      className="h-64 w-full rounded-[1.5rem] border border-white/10 object-cover shadow-lg shadow-black/20 lg:w-72"
                    />
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 text-sm text-white/65">
                      <div className="mb-2 text-base font-medium text-white">
                        {t("Photo preview")}
                      </div>
                      <div>
                        {formData.photo
                          ? t("New photo after save")
                          : t("Current photo shown here")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-64 place-items-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.04] text-white/40">
                    {t("No photo")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="apple-btn apple-btn-primary w-full rounded-[1.25rem] px-6 py-4 text-sm font-semibold tracking-wide disabled:opacity-60 sm:w-auto sm:min-w-[190px]"
            >
              {saving ? t("Saving...") : t("Save changes")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/furniture")}
              className="apple-btn w-full rounded-[1.25rem] px-6 py-4 text-sm font-medium text-white/85 sm:w-auto"
            >
              {t("Cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FurnitureEdit;