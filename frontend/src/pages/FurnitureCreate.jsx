import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  createFurniture,
  uploadPhoto,
  getConditions,
  getTypes,
  getBuildings,
  getRooms,
} from "../api";

function FurnitureCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

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
    last_condition_check_date: "",
    next_condition_check_date: "",
    condition_check_interval_days: "",
    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const filteredRooms = useMemo(() => {
    if (!formData.building_id) return roomsList;
    return roomsList.filter(
      (room) => Number(room.building_id) === Number(formData.building_id)
    );
  }, [roomsList, formData.building_id]);

  const inspectionMeta = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.next_condition_check_date) {
      return {
        label: "Not scheduled",
        icon: "⚪",
        tone:
          "border-white/10 bg-white/[0.04] text-white/75",
        hint: "Set inspection interval or next inspection date",
      };
    }

    const nextDate = new Date(formData.next_condition_check_date);
    nextDate.setHours(0, 0, 0, 0);

    const diffMs = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "Overdue",
        icon: "🔴",
        tone:
          "border-red-400/25 bg-red-500/10 text-red-200",
        hint: "Inspection date has already passed",
      };
    }

    if (diffDays <= 7) {
      return {
        label: "Due soon",
        icon: "🟡",
        tone:
          "border-yellow-400/25 bg-yellow-500/10 text-yellow-100",
        hint: `Inspection due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      };
    }

    return {
      label: "OK",
      icon: "🟢",
      tone:
        "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
      hint: `Next inspection in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
    };
  }, [formData.next_condition_check_date]);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [typesData, buildingsData, roomsData, conditionsData] =
          await Promise.all([
            getTypes(),
            getBuildings(),
            getRooms(),
            getConditions(),
          ]);

        setTypesList(typesData || []);
        setBuildingsList(buildingsData || []);
        setRoomsList(roomsData || []);
        setConditionsList(conditionsData || []);

        const firstBuildingId = buildingsData?.[0]?.id ?? "";
        const firstRoomForBuilding =
          roomsData?.find(
            (room) => Number(room.building_id) === Number(firstBuildingId)
          )?.id ?? "";
        const firstTypeId = typesData?.[0]?.id ?? "";
        const firstConditionId = conditionsData?.[0]?.id ?? "";

        setFormData((prev) => ({
          ...prev,
          type_id: firstTypeId,
          building_id: firstBuildingId,
          room_id: firstRoomForBuilding,
          condition_id: firstConditionId,
        }));
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить справочники");
      } finally {
        setPageLoading(false);
      }
    };

    loadReferences();
  }, []);

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

  useEffect(() => {
    if (!formData.last_condition_check_date || !formData.condition_check_interval_days) {
      return;
    }

    const interval = Number(formData.condition_check_interval_days);
    if (!Number.isFinite(interval) || interval <= 0) {
      return;
    }

    const baseDate = new Date(formData.last_condition_check_date);
    if (Number.isNaN(baseDate.getTime())) {
      return;
    }

    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + interval);

    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
    const dd = String(nextDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;

    setFormData((prev) =>
      prev.next_condition_check_date === formatted
        ? prev
        : { ...prev, next_condition_check_date: formatted }
    );
  }, [
    formData.last_condition_check_date,
    formData.condition_check_interval_days,
  ]);

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
        building_id: Number(value),
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

    if (name === "condition_check_interval_days") {
      setFormData((prev) => ({
        ...prev,
        condition_check_interval_days: value.replace(/[^\d]/g, ""),
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
        photo: "Разрешены только JPG и PNG",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        photo: "Максимальный размер файла 5 MB",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, photo: file }));
    setPreview(URL.createObjectURL(file));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Введите название";
    }

    if (!formData.type_id) {
      errors.type_id = "Выберите тип";
    }

    if (!formData.building_id) {
      errors.building_id = "Выберите корпус";
    }

    if (!formData.room_id) {
      errors.room_id = "Выберите комнату";
    }

    if (
      formData.purchase_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.purchase_date)
    ) {
      errors.purchase_date = "Дата должна быть в формате YYYY-MM-DD";
    }

    if (
      formData.price_kgs !== "" &&
      (!/^\d+$/.test(formData.price_kgs) || Number(formData.price_kgs) < 0)
    ) {
      errors.price_kgs = "Цена должна быть положительным числом";
    }

    if (
      formData.last_condition_check_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.last_condition_check_date)
    ) {
      errors.last_condition_check_date =
        "Дата проверки должна быть в формате YYYY-MM-DD";
    }

    if (
      formData.next_condition_check_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(formData.next_condition_check_date)
    ) {
      errors.next_condition_check_date =
        "Следующая проверка должна быть в формате YYYY-MM-DD";
    }

    if (
      formData.condition_check_interval_days !== "" &&
      (!/^\d+$/.test(formData.condition_check_interval_days) ||
        Number(formData.condition_check_interval_days) <= 0)
    ) {
      errors.condition_check_interval_days =
        "Интервал проверки должен быть положительным числом";
    }

    return errors;
  };

  const mapBackendErrorToField = (message) => {
    const lower = String(message || "").toLowerCase();

    if (lower.includes("name")) {
      return { name: "Проверьте поле Название" };
    }

    if (lower.includes("type_id")) {
      return { type_id: "Проверьте поле Тип" };
    }

    if (lower.includes("building_id")) {
      return { building_id: "Проверьте поле Корпус" };
    }

    if (lower.includes("room_id")) {
      return { room_id: "Проверьте поле Комната" };
    }

    if (lower.includes("condition_id")) {
      return { condition_id: "Проверьте поле Состояние" };
    }

    if (lower.includes("purchase_date") || lower.includes("date")) {
      return { purchase_date: "Проверьте дату. Нужен формат YYYY-MM-DD" };
    }

    if (lower.includes("price_kgs") || lower.includes("price")) {
      return { price_kgs: "Проверьте поле Цена" };
    }

    if (lower.includes("manufacturer")) {
      return { manufacturer: "Проверьте поле Производитель" };
    }

    if (lower.includes("model")) {
      return { model: "Проверьте поле Модель" };
    }

    if (lower.includes("last_condition_check_date")) {
      return {
        last_condition_check_date: "Проверьте дату последней проверки",
      };
    }

    if (lower.includes("next_condition_check_date")) {
      return {
        next_condition_check_date: "Проверьте дату следующей проверки",
      };
    }

    if (lower.includes("condition_check_interval_days")) {
      return {
        condition_check_interval_days: "Проверьте интервал проверки",
      };
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("Сессия истекла. Войдите снова.");
      return;
    }

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Пожалуйста, исправьте ошибки в форме");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setFieldErrors({});

      const createdItem = await createFurniture(
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
          last_condition_check_date:
            formData.last_condition_check_date || null,
          next_condition_check_date:
            formData.next_condition_check_date || null,
          condition_check_interval_days:
            formData.condition_check_interval_days === ""
              ? null
              : Number(formData.condition_check_interval_days),
        },
        token
      );

      if (formData.photo) {
        await uploadPhoto(createdItem.id, formData.photo, token);
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/furniture");
      }, 1000);
    } catch (err) {
      console.error(err);

      const backendFieldError = mapBackendErrorToField(err.message);
      if (backendFieldError) {
        setFieldErrors(backendFieldError);
      }

      setError(err.message || "Не удалось сохранить мебель");
    } finally {
      setLoading(false);
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

  const renderFieldError = (fieldName) =>
    fieldErrors[fieldName] ? (
      <div className="mt-2 text-sm text-red-300">{fieldErrors[fieldName]}</div>
    ) : null;

  if (pageLoading) {
    return (
      <div className="glass-strong rounded-[2rem] border border-white/10 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span>Загрузка справочников...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl animate-fadeIn">
      <div className="glass-strong relative overflow-hidden rounded-[2rem] border border-white/15 p-6 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 mb-8">
          <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
            Asset management
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("Create Asset")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
            Инвентарный номер будет сгенерирован автоматически. Заполните основные данные,
            выберите корпус и комнату, укажите модель, производителя, дату приобретения,
            цену и при желании добавьте фото.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-[1.25rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Название
            </label>
            <input
              type="text"
              name="name"
              placeholder="Например: Стол преподавателя"
              value={formData.name}
              onChange={handleChange}
              className={getFieldClass("name")}
            />
            {renderFieldError("name")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Тип
            </label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={handleChange}
              className={getFieldClass("type_id")}
            >
              <option value="" className="bg-slate-900">
                Выберите тип
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
              Модель
            </label>
            <input
              type="text"
              name="model"
              placeholder="Например: Office Pro 120"
              value={formData.model}
              onChange={handleChange}
              className={getFieldClass("model")}
            />
            {renderFieldError("model")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Производитель
            </label>
            <input
              type="text"
              name="manufacturer"
              placeholder="Например: IKEA"
              value={formData.manufacturer}
              onChange={handleChange}
              className={getFieldClass("manufacturer")}
            />
            {renderFieldError("manufacturer")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Дата приобретения
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
              Цена (KGS)
            </label>
            <input
              type="text"
              name="price_kgs"
              placeholder="Например: 4500"
              value={formData.price_kgs}
              onChange={handleChange}
              className={getFieldClass("price_kgs")}
            />
            {renderFieldError("price_kgs")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Корпус
            </label>
            <select
              name="building_id"
              value={formData.building_id}
              onChange={handleChange}
              className={getFieldClass("building_id")}
            >
              <option value="" className="bg-slate-900">
                Выберите корпус
              </option>
              {buildingsList.map((building) => (
                <option key={building.id} value={building.id} className="bg-slate-900">
                  {building.name}
                </option>
              ))}
            </select>
            {renderFieldError("building_id")}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Комната
            </label>
            <select
              name="room_id"
              value={formData.room_id}
              onChange={handleChange}
              className={getFieldClass("room_id")}
            >
              <option value="" className="bg-slate-900">
                Выберите комнату
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
              Состояние
            </label>
            <select
              name="condition_id"
              value={formData.condition_id}
              onChange={handleChange}
              className={getFieldClass("condition_id")}
            >
              <option value="" className="bg-slate-900">
                Без состояния
              </option>
              {conditionsList.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
            {renderFieldError("condition_id")}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white/75">
                    Inspection Status
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Настрой интервал проверки состояния и система покажет статус.
                  </div>
                </div>

                <div
                  className={`rounded-[1rem] border px-4 py-3 text-sm font-medium ${inspectionMeta.tone}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{inspectionMeta.icon}</span>
                    <span>{inspectionMeta.label}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">{inspectionMeta.hint}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Last inspection
                  </label>
                  <input
                    type="date"
                    name="last_condition_check_date"
                    value={formData.last_condition_check_date}
                    onChange={handleChange}
                    className={getFieldClass("last_condition_check_date")}
                  />
                  {renderFieldError("last_condition_check_date")}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Check every (days)
                  </label>
                  <input
                    type="text"
                    name="condition_check_interval_days"
                    placeholder="Например: 180"
                    value={formData.condition_check_interval_days}
                    onChange={handleChange}
                    className={getFieldClass("condition_check_interval_days")}
                  />
                  {renderFieldError("condition_check_interval_days")}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">
                    Next inspection
                  </label>
                  <input
                    type="date"
                    name="next_condition_check_date"
                    value={formData.next_condition_check_date}
                    onChange={handleChange}
                    className={getFieldClass("next_condition_check_date")}
                  />
                  {renderFieldError("next_condition_check_date")}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block text-sm font-medium text-white/75">
                    {t("Photo (JPG/PNG, max 5MB)")}
                  </label>
                  <p className="mt-1 text-xs text-white/45">
                    Можно загрузить фото мебели сразу после создания
                  </p>
                </div>

                {formData.photo && (
                  <span className="liquid-badge">1 file selected</span>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={handlePhotoChange}
                className={getFieldClass("photo")}
              />
              {renderFieldError("photo")}

              {preview && (
                <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-64 w-full rounded-[1.5rem] border border-white/10 object-cover shadow-lg shadow-black/20 lg:w-72"
                  />
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 text-sm text-white/65">
                    <div className="mb-2 text-base font-medium text-white">
                      Preview ready
                    </div>
                    <div>Файл выбран и будет загружен после сохранения.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="apple-btn apple-btn-primary w-full rounded-[1.25rem] px-6 py-4 text-sm font-semibold tracking-wide disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
            >
              {loading ? "Сохранение..." : t("Save")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/furniture")}
              className="apple-btn w-full rounded-[1.25rem] px-6 py-4 text-sm font-medium text-white/85 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </form>

        {success && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-md animate-fadeIn">
            <div className="glass-strong rounded-[2rem] border border-white/15 px-8 py-7 text-center shadow-2xl shadow-black/30">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-green-400/20 bg-green-500/15">
                <span className="text-3xl">✅</span>
              </div>
              <div className="mt-4 text-lg font-semibold text-white">
                Saved successfully
              </div>
              <div className="mt-1 text-sm text-white/55">Redirecting…</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FurnitureCreate;