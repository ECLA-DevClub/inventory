import { useContext, useEffect, useMemo, useRef, useState } from "react";
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

      const mapped = data.map((item) => ({
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
        photo: resolveAssetUrl(item.photo_url),
      }));

      setFurniture(mapped);
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

  const formatInv = (inv) => {
    if (!inv) return { first: "", second: "" };
    if (inv.length <= 30) return { first: inv, second: "" };

    const splitPos = Math.max(
      inv.lastIndexOf("-", 30),
      Math.floor(inv.length / 2)
    );
    const first = inv.slice(0, splitPos);
    const second = inv.slice(splitPos + (inv[splitPos] === "-" ? 1 : 0));

    return { first, second };
  };

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
      setDeleteTarget(null);
    } catch (err) {
      console.error("Ошибка удаления мебели:", err);
      alert(err.message || t("Delete error"));
    } finally {
      setDeleteLoading(false);
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

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t("Assets")}
          </h1>
          <div className="mt-2 text-sm text-white/55">
            {t("Search assets text")}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-white/60">
            {t("Showing")} <span className="text-white">{filtered.length}</span>
          </div>

          {canManageAssets && (
            <Link to="/furniture/create" className="apple-btn apple-btn-primary">
              {t("New Asset")}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search assets placeholder")}
          className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
        />
      </div>

      <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
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
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
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
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
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
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
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
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-blue-400/40 focus:bg-white/10"
          />

          <input
            type="date"
            value={purchaseDateFrom}
            onChange={(e) => setPurchaseDateFrom(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
          />

          <input
            type="date"
            value={purchaseDateTo}
            onChange={(e) => setPurchaseDateTo(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-blue-400/40 focus:bg-white/10"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white/85 transition hover:bg-white/[0.10]"
          >
            {t("Reset filters")}
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-white/50">
        {listLoading ? t("Loading") : `${t("Found")}: ${filtered.length}`}
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-white/70">
              <th className="px-6 py-4 text-left font-medium">Inv #</th>
              <th className="px-6 py-4 text-left font-medium">{t("Name")}</th>
              <th className="px-6 py-4 text-left font-medium">{t("Type")}</th>
              <th className="px-6 py-4 text-left font-medium">Price</th>
              <th className="px-6 py-4 text-left font-medium">{t("Location")}</th>
              <th className="px-6 py-4 text-left font-medium">{t("Status")}</th>
              {canManageAssets && (
                <th className="px-6 py-4 text-left font-medium">{t("Actions")}</th>
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
                <td className="whitespace-nowrap px-6 py-4 text-blue-300">
                  <div className="flex items-center gap-3">
                    {f.photo ? (
                      <img
                        src={f.photo}
                        alt={f.name || f.invNumber}
                        className="h-20 w-20 cursor-zoom-in rounded-md object-cover"
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
                      <div
                        className="grid h-20 w-20 place-items-center rounded-md bg-white/5 text-xs text-white/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("No photo")}
                      </div>
                    )}

                    <div className="max-w-[260px]">
                      {(() => {
                        const { first, second } = formatInv(f.invNumber);
                        return (
                          <div className="text-xs leading-tight text-blue-300">
                            <div className="max-w-[260px] truncate">{first}</div>
                            {second ? (
                              <div className="max-w-[260px] truncate text-[0.7rem] text-blue-200">
                                {second}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-white">{f.name}</td>
                <td className="px-6 py-4 text-white/80">{f.type || "—"}</td>
                <td className="px-6 py-4 text-white/80">
                  {formatPrice(f.priceKgs)}
                </td>
                <td className="px-6 py-4 text-white/80">
                  {f.building || "—"} {f.room ? `• ${f.room}` : ""}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                    {f.status}
                  </span>
                </td>

                {canManageAssets && (
                  <td
                    className="whitespace-nowrap px-6 py-4"
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
                  colSpan={canManageAssets ? 7 : 6}
                  className="px-6 py-10 text-center text-white/55"
                >
                  {t("No results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:hidden">
        {canManageAssets && (
          <div className="flex justify-end">
            <Link
              to="/furniture/create"
              className="apple-btn apple-btn-primary text-sm"
            >
              {t("New Asset")}
            </Link>
          </div>
        )}

        {filtered.map((f) => (
          <Link
            key={f.id}
            to={`/furniture/${f.id}`}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              {f.photo ? (
                <img
                  src={f.photo}
                  alt={f.name || f.invNumber}
                  className="h-32 w-32 cursor-zoom-in rounded-md object-cover"
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
                <div className="grid h-32 w-32 place-items-center rounded-md bg-white/5 text-xs text-white/50">
                  {t("No photo")}
                </div>
              )}

              <div className="min-w-0">
                <div className="max-w-[220px] text-xs font-semibold leading-tight text-blue-400">
                  {(() => {
                    const { first, second } = formatInv(f.invNumber);
                    return (
                      <>
                        <div className="truncate">{first}</div>
                        {second ? (
                          <div className="truncate text-[0.7rem] text-blue-300">
                            {second}
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="mt-3 font-medium text-white">{f.name}</div>
                <div className="mt-1 text-sm text-white/60">{f.type || "—"}</div>
                <div className="mt-2 text-sm text-yellow-200">
                  {formatPrice(f.priceKgs)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/50">
              {t("Location")}: {f.building || "—"} {f.room ? `• ${f.room}` : ""}
            </div>

            <div className="mt-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                {f.status}
              </span>
            </div>

            {canManageAssets && (
              <div className="mt-3 flex gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/furniture/${f.id}/edit`);
                  }}
                  className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                >
                  {t("Edit")}
                </button>

                {canDeleteAssets && (
                  <button
                    onClick={(e) => handleAskDelete(f, e)}
                    className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                  >
                    {t("Delete")}
                  </button>
                )}
              </div>
            )}
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="py-10 text-center text-white/55">
            {t("No results")}
          </div>
        )}
      </div>

      {modalPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="max-h-[90%] max-w-[90%] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalPhoto}
              alt="Preview"
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 text-right">
              <button
                onClick={() => setModalPhoto(null)}
                className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1729]/95 p-6 shadow-2xl backdrop-blur-2xl"
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
              <div className="mt-1 text-white/55">{deleteTarget.invNumber}</div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Cancel")}
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-2xl border border-red-400/20 bg-red-500/15 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? t("Deleting") : t("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FurnitureList;