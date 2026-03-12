import { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { API_URL, getFurniture } from "../api";
import { AuthContext } from "../context/AuthContext";

function FurnitureList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);

  const [furniture, setFurniture] = useState([]);
  const [modalPhoto, setModalPhoto] = useState(null);
  const holdTimer = useRef(null);
  const [search, setSearch] = useState("");

  const canManageAssets = role === "admin" || role === "manager";

  useEffect(() => {
    getFurniture()
      .then((data) => {
        const mapped = data.map((item) => ({
          id: item.id,
          invNumber: item.inv_number ?? `INV-${item.id}`,
          name: item.name,
          type: item.type_name,
          building: item.building_name,
          room: item.room_name,
          condition: item.condition_name || "",
          status: item.condition_name || "Active",
          priceKgs: item.price_kgs ?? null,
          photo: item.photo_url ? `${API_URL}${item.photo_url}` : null,
        }));

        setFurniture(mapped);
      })
      .catch((err) => {
        console.error("Ошибка загрузки мебели:", err);
      });
  }, []);

  const formatInv = (inv) => {
    if (!inv) return { first: "", second: "" };
    if (inv.length <= 30) return { first: inv, second: "" };

    const splitPos = Math.max(inv.lastIndexOf("-", 30), Math.floor(inv.length / 2));
    const first = inv.slice(0, splitPos);
    const second = inv.slice(splitPos + (inv[splitPos] === "-" ? 1 : 0));
    return { first, second };
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    return `${Number(value).toLocaleString("ru-RU")} KGS`;
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return furniture.filter((f) => {
      return (
        !s ||
        String(f.invNumber || "").toLowerCase().includes(s) ||
        String(f.name || "").toLowerCase().includes(s) ||
        String(f.id || "").includes(s) ||
        String(f.type || "").toLowerCase().includes(s) ||
        String(f.building || "").toLowerCase().includes(s) ||
        String(f.room || "").toLowerCase().includes(s) ||
        String(f.status || "").toLowerCase().includes(s) ||
        String(f.priceKgs || "").toLowerCase().includes(s)
      );
    });
  }, [furniture, search]);

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
            <Link
              to="/furniture/create"
              className="apple-btn apple-btn-primary"
            >
              {t("New Asset")}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search: INV-0001, name, type, room, price..."
          className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur-xl transition focus:border-blue-400/40 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
        />
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
                className="border-b border-white/5 transition hover:bg-white/10"
              >
                <td className="whitespace-nowrap px-6 py-4 text-blue-300">
                  <div className="flex items-center gap-3">
                    {f.photo ? (
                      <img
                        src={f.photo}
                        alt={f.name || f.invNumber}
                        className="h-20 w-20 cursor-zoom-in rounded-md object-cover"
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
                      <div className="grid h-20 w-20 place-items-center rounded-md bg-white/5 text-xs text-white/50">
                        {t("No photo")}
                      </div>
                    )}

                    <Link
                      to={`/furniture/${f.id}`}
                      className="max-w-[260px] hover:underline"
                    >
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
                    </Link>
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
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/furniture/${f.id}/edit`)}
                        className="text-sm text-white/80 hover:underline"
                      >
                        {t("Edit")}
                      </button>
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
              Location: {f.building || "—"} {f.room ? `• ${f.room}` : ""}
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
                    navigate(`/furniture/${f.id}/edit`);
                  }}
                  className="rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  Edit
                </button>
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
    </div>
  );
}

export default FurnitureList;