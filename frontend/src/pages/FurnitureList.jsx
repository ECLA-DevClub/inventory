import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteFurniture,
  getBuildings,
  getConditions,
  getFurniture,
  getRooms,
  getTypes,
  resolveAssetUrl,
} from "../api";
import { AuthContext } from "../context/AuthContext";

function getInspectionMeta(nextConditionCheckDate) {
  if (!nextConditionCheckDate) {
    return {
      label: "Not scheduled",
      icon: "⚪",
      className: "border-white/10 bg-white/5 text-white/75",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDate = new Date(nextConditionCheckDate);
  nextDate.setHours(0, 0, 0, 0);

  const diffMs = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: "Overdue",
      icon: "🔴",
      className: "border-red-400/20 bg-red-500/10 text-red-200",
    };
  }

  if (diffDays <= 7) {
    return {
      label: "Due soon",
      icon: "🟡",
      className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    };
  }

  return {
    label: "OK",
    icon: "🟢",
    className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  };
}

function FurnitureList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role, token } = useContext(AuthContext);

  const [furniture, setFurniture] = useState([]);
  const [types, setTypes] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [conditions, setConditions] = useState([]);

  const [modalPhoto, setModalPhoto] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedConditionId, setSelectedConditionId] = useState("");
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [purchaseDateFrom, setPurchaseDateFrom] = useState("");
  const [purchaseDateTo, setPurchaseDateTo] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const holdTimer = useRef(null);

  const canManageAssets = role === "admin" || role === "manager";
  const canDeleteAssets = role === "admin";

  useEffect(() => {
    Promise.all([getTypes(), getBuildings(), getRooms(), getConditions()])
      .then(([typesData, buildingsData, roomsData, conditionsData]) => {
        setTypes(typesData || []);
        setBuildings(buildingsData || []);
        setRooms(roomsData || []);
        setConditions(conditionsData || []);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильтров:", err);
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFurniture();
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    search,
    selectedTypeId,
    selectedBuildingId,
    selectedRoomId,
    selectedConditionId,
    manufacturerSearch,
    purchaseDateFrom,
    purchaseDateTo,
  ]);

  const loadFurniture = async () => {
    try {
      setListLoading(true);

      const data = await getFurniture({
        search,
        type_id: selectedTypeId,
        building_id: selectedBuildingId,
        room_id: selectedRoomId,
        condition_id: selectedConditionId,
        manufacturer: manufacturerSearch,
        purchase_date_from: purchaseDateFrom,
        purchase_date_to: purchaseDateTo,
      });

      const mapped = data.map((item) => {
        const inspection = getInspectionMeta(item.next_condition_check_date);

        return {
          id: item.id,
          invNumber: item.inv_number ?? `INV-${item.id}`,
          name: item.name,
          type: item.type_name,
          typeId: item.type_id,
          building: item.building_name,
          buildingId: item.building_id,
          room: item.room_name,
          roomId: item.room_id,
          condition: item.condition_name || "",
          conditionId: item.condition_id,
          status: item.condition_name || t("Active"),
          manufacturer: item.manufacturer || "",
          purchaseDate: item.purchase_date || "",
          priceKgs: item.price_kgs ?? null,
          photo: item.photo_url,
          lastConditionCheckDate: item.last_condition_check_date || "",
          nextConditionCheckDate: item.next_condition_check_date || "",
          conditionCheckIntervalDays:
            item.condition_check_interval_days ?? null,
          inspection,
        };
      });

      setFurniture(mapped);
      setSelectedIds([]);
    } catch (err) {
      console.error("Ошибка загрузки мебели:", err);
    } finally {
      setListLoading(false);
    }
  };

  const availableRooms = useMemo(() => {
    if (!selectedBuildingId) return rooms;
    return rooms.filter(
      (room) => String(room.building_id) === String(selectedBuildingId)
    );
  }, [rooms, selectedBuildingId]);

  useEffect(() => {
    if (
      selectedRoomId &&
      !availableRooms.some((room) => String(room.id) === String(selectedRoomId))
    ) {
      setSelectedRoomId("");
    }
  }, [availableRooms, selectedRoomId]);

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    return `${Number(value).toLocaleString("ru-RU")} KGS`;
  };

  const filtered = furniture;

  const handleOpenDetail = (id) => {
    navigate(`/furniture/${id}`);
  };

  const handleAskDelete = (item, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !token) return;

    try {
      setDeleteLoading(true);
      await deleteFurniture(deleteTarget.id, token);

      setFurniture((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Ошибка удаления мебели:", err);
      alert(err.message || t("Delete error"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!token) return;

    if (!confirm("Удалить выбранные?")) return;

    try {
      await Promise.all(
        selectedIds.map((id) => deleteFurniture(id, token))
      );

      setFurniture((prev) =>
        prev.filter((item) => !selectedIds.includes(item.id))
      );

      setSelectedIds([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("Ошибка удаления");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedTypeId("");
    setSelectedBuildingId("");
    setSelectedRoomId("");
    setSelectedConditionId("");
    setManufacturerSearch("");
    setPurchaseDateFrom("");
    setPurchaseDateTo("");
  };

  const filterFieldClass =
    "w-full rounded-[16px] border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/40 focus:bg-white/10 sm:rounded-[18px] sm:px-4 sm:py-3";

  const filterButtonClass =
    "w-full rounded-[16px] border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/85 transition hover:bg-white/[0.10] sm:rounded-[18px] sm:px-4 sm:py-3";

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t("Assets")}
          </h1>
          <div className="mt-1.5 text-sm text-white/55">
            {t("Search assets text")}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="text-sm text-white/60">
            {t("Showing")} <span className="text-white">{filtered.length}</span>
          </div>

          {canManageAssets && (
            <Link
              to="/furniture/create"
              className="apple-btn apple-btn-primary w-full px-4 py-2.5 text-center text-sm sm:w-auto sm:px-5 sm:py-3"
            >
              {t("New Asset")}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search assets placeholder")}
          className="w-full rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20 sm:rounded-[22px] sm:px-4 sm:py-3 sm:text-base"
        />
      </div>

      <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl sm:mt-4 sm:rounded-[22px] sm:p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className={filterFieldClass}
          >
            <option value="" className="bg-slate-900 text-white">
              {t("All types")}
            </option>
            {types.map((type) => (
              <option
                key={type.id}
                value={type.id}
                className="bg-slate-900 text-white"
              >
                {type.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className={filterFieldClass}
          >
            <option value="" className="bg-slate-900 text-white">
              {t("All buildings")}
            </option>
            {buildings.map((building) => (
              <option
                key={building.id}
                value={building.id}
                className="bg-slate-900 text-white"
              >
                {building.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className={filterFieldClass}
          >
            <option value="" className="bg-slate-900 text-white">
              {t("All rooms")}
            </option>
            {availableRooms.map((room) => (
              <option
                key={room.id}
                value={room.id}
                className="bg-slate-900 text-white"
              >
                {room.name}
              </option>
            ))}
          </select>

          <select
            value={selectedConditionId}
            onChange={(e) => setSelectedConditionId(e.target.value)}
            className={filterFieldClass}
          >
            <option value="" className="bg-slate-900 text-white">
              {t("All conditions")}
            </option>
            {conditions.map((condition) => (
              <option
                key={condition.id}
                value={condition.id}
                className="bg-slate-900 text-white"
              >
                {condition.name}
              </option>
            ))}
          </select>

          <input
            value={manufacturerSearch}
            onChange={(e) => setManufacturerSearch(e.target.value)}
            placeholder={t("Search by manufacturer")}
            className={filterFieldClass}
          />

          <input
            type="date"
            value={purchaseDateFrom}
            onChange={(e) => setPurchaseDateFrom(e.target.value)}
            className={filterFieldClass}
          />

          <input
            type="date"
            value={purchaseDateTo}
            onChange={(e) => setPurchaseDateTo(e.target.value)}
            className={filterFieldClass}
          />

          <button
            type="button"
            onClick={resetFilters}
            className={filterButtonClass}
          >
            {t("Reset filters")}
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-white/50">
        {listLoading ? t("Loading") : `${t("Found")}: ${filtered.length}`}
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-white/70">
              <th className="w-[40px] px-2 py-4 text-left font-medium">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filtered.map((f) => f.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                />
              </th>
              <th className="w-[72px] px-4 py-4 text-left font-medium xl:w-[88px]"></th>
              <th className="w-[130px] px-4 py-4 text-left font-medium xl:w-[150px]">Inv #</th>
              <th className="px-4 py-4 text-left font-medium">{t("Name")}</th>
              <th className="px-4 py-4 text-left font-medium">{t("Type")}</th>
              <th className="px-4 py-4 text-left font-medium">Price</th>
              <th className="px-4 py-4 text-left font-medium">{t("Location")}</th>
              <th className="px-4 py-4 text-left font-medium">{t("Status")}</th>
              <th className="w-[140px] px-4 py-4 text-left font-medium">Inspection</th>
              {canManageAssets && (
                <th className="px-4 py-4 text-left font-medium">{t("Actions")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                onClick={() => handleOpenDetail(f.id)}
                className="cursor-pointer border-b border-white/5 transition hover:bg-white/10"
              >
                <td
                  className="px-2 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, f.id]);
                      } else {
                        setSelectedIds((prev) =>
                          prev.filter((id) => id !== f.id)
                        );
                      }
                    }}
                  />
                </td>
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {f.photo ? (
                    <img
                      src={f.photo}
                      alt={f.name || f.invNumber}
                      className="h-14 w-14 cursor-zoom-in rounded-xl object-cover xl:h-16 xl:w-16"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModalPhoto(f.photo);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        holdTimer.current = setTimeout(
                          () => setModalPhoto(f.photo),
                          600
                        );
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        if (holdTimer.current) {
                          clearTimeout(holdTimer.current);
                          holdTimer.current = null;
                        }
                      }}
                      onMouseLeave={() => {
                        if (holdTimer.current) {
                          clearTimeout(holdTimer.current);
                          holdTimer.current = null;
                        }
                      }}
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-white/5 text-[10px] text-white/40 xl:h-16 xl:w-16">
                      {t("No photo")}
                    </div>
                  )}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-blue-300">
                  {f.invNumber}
                </td>

                <td className="px-4 py-3 text-white">{f.name}</td>
                <td className="px-4 py-3 text-white/80">{f.type || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white/80">
                  {formatPrice(f.priceKgs)}
                </td>
                <td className="px-4 py-3 text-white/80">
                  {f.building || "—"}{f.room ? ` • ${f.room}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                    {f.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${f.inspection.className}`}
                  >
                    <span>{f.inspection.icon}</span>
                    <span>{f.inspection.label}</span>
                  </span>
                </td>

                {canManageAssets && (
                  <td
                    className="whitespace-nowrap px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/furniture/${f.id}/edit`)}
                        className="text-sm text-white/80 transition hover:text-white hover:underline"
                      >
                        {t("Edit")}
                      </button>

                      {canDeleteAssets && (
                        <button
                          onClick={(e) => handleAskDelete(f, e)}
                          className="text-sm text-red-300 transition hover:text-red-200 hover:underline"
                        >
                          {t("Delete")}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={canManageAssets ? 10 : 9}
                  className="px-6 py-10 text-center text-white/55"
                >
                  {t("No results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE / TABLET CARDS ── */}
      <div className="mt-5 grid grid-cols-1 gap-3 lg:hidden">
        {filtered.map((f) => (
          <Link
            key={f.id}
            to={`/furniture/${f.id}`}
            className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-xl transition hover:bg-white/5 sm:rounded-[1.5rem] sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="shrink-0">
                {f.photo ? (
                  <img
                    src={f.photo}
                    alt={f.name || f.invNumber}
                    className="h-32 w-full cursor-zoom-in rounded-[1rem] object-cover sm:h-28 sm:w-28 sm:rounded-[1.25rem]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setModalPhoto(f.photo);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      holdTimer.current = setTimeout(
                        () => setModalPhoto(f.photo),
                        600
                      );
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (holdTimer.current) {
                        clearTimeout(holdTimer.current);
                        holdTimer.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      if (holdTimer.current) {
                        clearTimeout(holdTimer.current);
                        holdTimer.current = null;
                      }
                    }}
                  />
                ) : (
                  <div className="grid h-32 w-full place-items-center rounded-[1rem] bg-white/5 text-xs text-white/50 sm:h-28 sm:w-28 sm:rounded-[1.25rem]">
                    {t("No photo")}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-blue-400">
                  {f.invNumber}
                </div>

                <div className="mt-2.5 break-words text-base font-medium text-white sm:mt-3 sm:text-lg">
                  {f.name}
                </div>

                <div className="mt-1 text-sm text-white/60">
                  {f.type || "—"}
                </div>

                <div className="mt-2.5 text-sm text-yellow-200">
                  {formatPrice(f.priceKgs)}
                </div>

                <div className="mt-2.5 text-sm text-white/55">
                  {t("Location")}: {f.building || "—"}{f.room ? ` • ${f.room}` : ""}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                    {f.status}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${f.inspection.className}`}
                  >
                    <span>{f.inspection.icon}</span>
                    <span>{f.inspection.label}</span>
                  </span>
                </div>

                {canManageAssets && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/furniture/${f.id}/edit`);
                      }}
                      className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/90 transition hover:bg-white/10"
                    >
                      {t("Edit")}
                    </button>

                    {canDeleteAssets && (
                      <button
                        onClick={(e) => handleAskDelete(f, e)}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition hover:bg-red-500/20"
                      >
                        {t("Delete")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="py-10 text-center text-white/55">
            {t("No results")}
          </div>
        )}
      </div>

      {/* ── BULK DELETE BUTTON ── */}
      {selectedIds.length > 0 && canDeleteAssets && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleBulkDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full shadow-lg transition font-semibold"
          >
            Удалить ({selectedIds.length})
          </button>
        </div>
      )}

      {/* ── PHOTO MODAL (через Portal — всегда по центру экрана) ── */}
      {modalPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-3 sm:px-4"
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="max-h-[90%] w-full max-w-4xl p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalPhoto}
              alt="Preview"
              className="max-h-[78vh] w-full rounded-2xl object-contain sm:max-h-[80vh]"
            />
            <div className="mt-3 text-right">
              <button
                onClick={() => setModalPhoto(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE MODAL (через Portal — всегда по центру экрана) ── */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0f1729]/95 p-5 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              {t("Delete asset")}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/70">
              {t("Are you sure you want to delete this asset?")}
            </p>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85">
              <div className="font-medium">{deleteTarget.name || "—"}</div>
              <div className="mt-1 break-all text-white/55">
                {deleteTarget.invNumber}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Cancel")}
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-2xl border border-red-400/20 bg-red-500/15 px-4 py-2.5 text-sm text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? t("Deleting") : t("Delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default FurnitureList;