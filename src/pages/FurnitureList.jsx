import { useContext, useMemo, useState } from "react";
import { InventoryContext } from "../context/InventoryContext";
import { Link } from "react-router-dom";

function FurnitureList() {
  const { furniture, regions } = useContext(InventoryContext);

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
            Assets
          </h1>
          <div className="mt-2 text-sm text-white/55">
            Search by inventory number, name, or ID
          </div>
        </div>

        <div className="text-sm text-white/60">
          Showing <span className="text-white">{filtered.length}</span>
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
            All Regions
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
            All Organizations
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
              <th className="px-6 py-4 text-left font-medium">Name</th>
              <th className="px-6 py-4 text-left font-medium">Type</th>
              <th className="px-6 py-4 text-left font-medium">Region</th>
              <th className="px-6 py-4 text-left font-medium">Org</th>
              <th className="px-6 py-4 text-left font-medium">Location</th>
              <th className="px-6 py-4 text-left font-medium">Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-b border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4 text-blue-300 whitespace-nowrap">
                  <Link
                    to={`/furniture/${f.id}`}
                    className="hover:underline"
                  >
                    {f.invNumber}
                  </Link>
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
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-white/55"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mt-6 md:hidden flex flex-col gap-4">
        {filtered.map((f) => (
          <Link
            key={f.id}
            to={`/furniture/${f.id}`}
            className="glass p-4 rounded-2xl hover:bg-white/5 transition"
          >
            <div className="text-blue-400 font-semibold break-all">
              {f.invNumber}
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
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-white/55 py-10">
            No results
          </div>
        )}
      </div>
    </div>
  );
}

export default FurnitureList;