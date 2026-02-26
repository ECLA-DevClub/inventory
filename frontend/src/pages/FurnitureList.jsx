import { useContext, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { InventoryContext } from "../context/InventoryContext";
import { Link, useNavigate } from "react-router-dom";

function FurnitureList() {
  const { t } = useTranslation();
  const { furniture, regions, deleteFurniture } = useContext(InventoryContext);
  const navigate = useNavigate();

  const [modalPhoto, setModalPhoto] = useState(null);
  const holdTimer = useRef(null);

  const formatInv = (inv) => {
    if (!inv) return "";
    if (inv.length <= 30) return { first: inv, second: "" };

    // try to split at a hyphen near the middle (prefer last hyphen before 30 chars)
    const splitPos = Math.max(inv.lastIndexOf("-", 30), Math.floor(inv.length / 2));
    const first = inv.slice(0, splitPos);
    const second = inv.slice(splitPos + (inv[splitPos] === "-" ? 1 : 0));
    return { first, second };
  };

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [org, setOrg] = useState("");

  const orgOptions = useMemo(() => {
    const set = new Set();
    furniture.forEach((f) => set.add(f.organization));
    return Array.from(set).sort();
  }, [furniture]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return furniture.filter((f) => {
      const matchSearch =
        !s ||
        String(f.invNumber).toLowerCase().includes(s) ||
        String(f.name).toLowerCase().includes(s) ||
        String(f.id).includes(s);

      const matchRegion = region ? f.region === region : true;
      const matchOrg = org ? f.organization === org : true;

      return matchSearch && matchRegion && matchOrg;
    });
  }, [furniture, search, region, org]);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
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

          <Link
            to="/furniture/create"
            className="ml-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:opacity-90"
          >
            {t("New Asset")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search: INV-2026..., name, id..."
          className="bg-white/5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 px-4 py-3 rounded-xl text-white placeholder-white/35 outline-none transition hover:bg-white/10"
        />

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-white/5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 px-4 py-3 rounded-xl text-white outline-none transition hover:bg-white/10"
        >
          <option value="" className="bg-slate-900">
            {t("All Regions")}
          </option>
          {regions.map((r) => (
            <option key={r} value={r} className="bg-slate-900">
              {r}
            </option>
          ))}
        </select>

        <select
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          className="bg-white/5 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 px-4 py-3 rounded-xl text-white outline-none transition hover:bg-white/10"
        >
          <option value="" className="bg-slate-900">
            {t("All Organizations")}
          </option>
          {orgOptions.map((o) => (
            <option key={o} value={o} className="bg-slate-900">
              {o}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="mt-6 hidden md:block glass rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-white/70">
              <th className="px-6 py-4 text-left font-medium">Inv #</th>
              <th className="px-6 py-4 text-left font-medium">{t("Name")}</th>
              <th className="px-6 py-4 text-left font-medium">{t("Type")}</th>
              <th className="px-6 py-4 text-left font-medium">Region</th>
              <th className="px-6 py-4 text-left font-medium">Org</th>
              <th className="px-6 py-4 text-left font-medium">{t("Location")}</th>
              <th className="px-6 py-4 text-left font-medium">{t("Status")}</th>
              <th className="px-6 py-4 text-left font-medium">{t("Actions")}</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-b border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4 text-blue-300 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {f.photo ? (
                      <img
                        src={f.photo}
                        alt={f.name || f.invNumber}
                        className="w-20 h-20 object-cover rounded-md cursor-zoom-in"
                        onClick={() => setModalPhoto(f.photo)}
                        onMouseDown={() => {
                          holdTimer.current = setTimeout(() => setModalPhoto(f.photo), 600);
                        }}
                        onMouseUp={() => {
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
                      <div className="w-20 h-20 bg-white/5 rounded-md grid place-items-center text-xs text-white/50">{t("No photo")}</div>
                    )}

                    <Link to={`/furniture/${f.id}`} className="hover:underline max-w-[260px]">
                      {(() => {
                        const { first, second } = formatInv(f.invNumber);
                        return (
                          <div className="text-blue-300 text-xs leading-tight">
                                <div className="truncate max-w-[260px]">{first}</div>
                                {second ? <div className="text-[0.7rem] text-blue-200 truncate max-w-[260px]">{second}</div> : null}
                              </div>
                        );
                      })()}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 text-white">{f.name}</td>
                <td className="px-6 py-4 text-white/80">{f.type}</td>
                <td className="px-6 py-4 text-white/80">{f.region}</td>
                <td className="px-6 py-4 text-white/80">{f.organization}</td>
                <td className="px-6 py-4 text-white/80">
                  {f.building}-{f.room}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                    {f.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/furniture/${f.id}/edit`)}
                      className="text-sm text-white/80 hover:underline"
                    >
                      {t("Edit")}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`${t("Delete")} ${f.invNumber}?`)) deleteFurniture(f.id);
                      }}
                      className="text-sm text-red-400 hover:underline"
                    >
                      {t("Delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-white/55"
                >
                  {t("No results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mt-6 md:hidden flex flex-col gap-4">
        <div className="flex justify-end">
          <Link to="/furniture/create" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
            {t("New Asset")}
          </Link>
        </div>
        {filtered.map((f) => (
          <Link
            key={f.id}
            to={`/furniture/${f.id}`}
            className="glass p-4 rounded-2xl hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">

              {f.photo ? (
                <img
                  src={f.photo}
                  alt={f.name || f.invNumber}
                  className="w-32 h-32 object-cover rounded-md cursor-zoom-in"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setModalPhoto(f.photo);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    holdTimer.current = setTimeout(() => setModalPhoto(f.photo), 600);
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
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
                <div className="w-32 h-32 bg-white/5 rounded-md grid place-items-center text-xs text-white/50">{t("No photo")}</div>
              )}

              <div className="text-blue-400 font-semibold max-w-[220px] text-xs leading-tight">
                {(() => {
                  const { first, second } = formatInv(f.invNumber);
                  return (
                    <>
                      <div className="truncate">{first}</div>
                      {second ? <div className="text-[0.7rem] text-blue-300 truncate">{second}</div> : null}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mt-2 font-medium text-white">
              {f.name}
            </div>

            <div className="mt-1 text-sm text-white/60">
              {f.type}
            </div>

            <div className="mt-3 text-xs text-white/60">
              {f.region} • {f.organization}
            </div>

            <div className="mt-2 text-xs text-white/50">
              Location: {f.building}-{f.room}
            </div>

            <div className="mt-2">
              <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
                {f.status}
              </span>
            </div>

            <div className="mt-3 flex gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/furniture/${f.id}/edit`);
                }}
                className="text-sm bg-white/5 px-3 py-2 rounded-lg"
              >
                Edit
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm(`Delete ${f.invNumber}?`)) deleteFurniture(f.id);
                }}
                className="text-sm bg-red-500/20 px-3 py-2 rounded-lg text-red-300"
              >
                Delete
              </button>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-white/55 py-10">
            {t("No results")}
          </div>
        )}
      </div>

      {/* PHOTO MODAL */}
      {modalPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setModalPhoto(null)}>
          <div className="max-w-[90%] max-h-[90%] p-4" onClick={(e) => e.stopPropagation()}>
            <img src={modalPhoto} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
            <div className="mt-3 text-right">
              <button onClick={() => setModalPhoto(null)} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">{t("Cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FurnitureList;