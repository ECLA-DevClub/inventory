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
    price_kgs: "",
    photo: null,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const filteredRooms = useMemo(() => {
    if (!formData.building_id) return roomsList;
    return roomsList.filter(
      (room) => Number(room.building_id) === Number(formData.building_id)
    );
  }, [roomsList, formData.building_id]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;

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

    setFormData((prev) => ({
      ...prev,
      [name]: name.endsWith("_id") && value !== "" ? Number(value) : value,
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

    if (!token) {
      setError("Сессия истекла. Войдите снова.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Введите название");
      return;
    }

    if (!formData.type_id || !formData.building_id || !formData.room_id) {
      setError("Заполните тип, корпус и комнату");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const createdItem = await createFurniture(
        {
          name: formData.name,
          type_id: Number(formData.type_id),
          building_id: Number(formData.building_id),
          room_id: Number(formData.room_id),
          condition_id:
            formData.condition_id === "" ? null : Number(formData.condition_id),
          price_kgs:
            formData.price_kgs === "" ? null : Number(formData.price_kgs),
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
      setError(err.message || "Не удалось сохранить мебель");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20";

  const selectClass =
    "w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-white outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20";

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
            выберите корпус и комнату, укажите цену в сомах и при желании добавьте фото.
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
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Тип
            </label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={handleChange}
              className={selectClass}
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
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Корпус
            </label>
            <select
              name="building_id"
              value={formData.building_id}
              onChange={handleChange}
              className={selectClass}
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
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Комната
            </label>
            <select
              name="room_id"
              value={formData.room_id}
              onChange={handleChange}
              className={selectClass}
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
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Состояние
            </label>
            <select
              name="condition_id"
              value={formData.condition_id}
              onChange={handleChange}
              className={selectClass}
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
                className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-white/70 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-100 hover:bg-white/10"
              />

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