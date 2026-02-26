import { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { InventoryContext } from "../context/InventoryContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  Excellent: "#22c55e",
  Good: "#14b8a6",
  Fair: "#f59e0b",
  "Needs Repair": "#ef4444",
};

function Dashboard() {
  const { t } = useTranslation();
  const { furniture } = useContext(InventoryContext);

  const total = furniture.length;

  // Sum only real prices entered by user (ignore null/undefined)
  const totalValue = furniture.reduce((sum, f) => {
    const p = typeof f.price === "number" && !isNaN(f.price) ? f.price : 0;
    return sum + p;
  }, 0);

  const needsRepair = furniture.filter(
    (f) => f.condition === "Needs Repair"
  ).length;

  const writtenOff = furniture.filter(
    (f) => f.status === "WrittenOff"
  ).length;

  // added in last 30 days (based on item history CREATE entries)
  const addedLast30 = furniture.reduce((acc, f) => {
    const hasRecentCreate = (f.history || []).some((h) => {
      if (h.action !== "CREATE") return false;
      const t = Date.parse(h.at);
      if (isNaN(t)) return false;
      return Date.now() - t <= 1000 * 60 * 60 * 24 * 30; // 30 days
    });
    return acc + (hasRecentCreate ? 1 : 0);
  }, 0);

  const priceCount = furniture.reduce((c, f) => (typeof f.price === "number" && !isNaN(f.price) ? c + 1 : c), 0);
  const avgPrice = priceCount > 0 ? Math.round(totalValue / priceCount) : null;
  const needsRepairPercent = total > 0 ? Math.round((needsRepair / total) * 100) : 0;

  const conditionData = useMemo(() => {
    if (total === 0) return [];

    const map = {};

    furniture.forEach((f) => {
      map[f.condition] = (map[f.condition] || 0) + 1;
    });

    return Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
      percent: ((map[key] / total) * 100).toFixed(0),
    }));
  }, [furniture, total]);

  return (
    <div className="space-y-10 text-white animate-fadeIn">

      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-bold">{t("Dashboard Overview")}</h1>
        <p className="text-white/50 mt-2">{t("Institution inventory overview")}</p>
      </div>

      {/* KPI BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Total Assets")}</div>
          <div className="text-3xl font-bold mt-2 text-blue-200">{total.toLocaleString("ru-RU")}</div>
          <div className="text-white/60 text-sm mt-2">{addedLast30} {t("added in 30 days")}</div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Total Value")}</div>
          <div className="text-3xl font-bold mt-2 text-yellow-200">{totalValue.toLocaleString("ru-RU")} KGS</div>
          <div className="text-white/60 text-sm mt-2">{avgPrice ? `${t("Average price")}: ${avgPrice.toLocaleString("ru-RU")} KGS` : `${t("Average price")}: —`}</div>
        </div>

        <div className="glass p-6 rounded-2xl border border-red-500/30 hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Needs Repair")}</div>
          <div className="text-3xl font-bold mt-2 text-red-300">{needsRepair.toLocaleString("ru-RU")}</div>
          <div className="text-white/60 text-sm mt-2">{needsRepairPercent}% {t("of total")}</div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("WrittenOff")}</div>
          <div className="text-3xl font-bold mt-2 text-white">{writtenOff.toLocaleString("ru-RU")}</div>
          <div className="text-white/60 text-sm mt-2">{t("total written off")}</div>
        </div>

      </div>

      {/* DONUT SECTION */}
      <div className="glass p-8 rounded-3xl">

        <h2 className="text-xl mb-6">
          {t("Condition Distribution")}
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-10">

          {/* FIXED HEIGHT CONTAINER */}
          <div className="w-full md:w-[350px] h-[350px]">

            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={conditionData}
                  dataKey="value"
                  innerRadius={90}
                  outerRadius={130}
                  paddingAngle={4}
                  isAnimationActive
                >
                  {conditionData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[entry.name] || "#3b82f6"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

          </div>

          {/* LEGEND */}
          <div className="space-y-3 w-full md:w-auto">
              {conditionData.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor:
                          COLORS[item.name] || "#3b82f6",
                      }}
                    />
                    <span className="text-white/80">{t(item.name)}</span>
                  </div>

                  <div className="text-white font-medium">{item.value} • {item.percent}%</div>
                </div>
              ))}
          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;