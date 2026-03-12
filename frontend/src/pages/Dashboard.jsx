import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getFurniture } from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  Хорошее: "#14b8a6",
  "Требует ремонта": "#ef4444",
  Списано: "#f59e0b",
  "Не указано": "#60a5fa",
  Good: "#14b8a6",
  "Needs Repair": "#ef4444",
  WrittenOff: "#f59e0b",
  Unknown: "#60a5fa",
};

function Dashboard() {
  const { t } = useTranslation();
  const [furniture, setFurniture] = useState([]);

  useEffect(() => {
    getFurniture()
      .then((data) => {
        setFurniture(data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки dashboard:", err);
      });
  }, []);

  const total = furniture.length;

  const needsRepair = furniture.filter(
    (f) =>
      f.condition_name === "Требует ремонта" ||
      f.condition_name === "Needs Repair"
  ).length;

  const writtenOff = furniture.filter(
    (f) =>
      f.condition_name === "Списано" ||
      f.condition_name === "WrittenOff"
  ).length;

  const addedLast30 = furniture.length;

  const totalValue = furniture.reduce(
    (sum, item) => sum + (Number(item.price_kgs) || 0),
    0
  );

  const pricedItemsCount = furniture.filter(
    (item) => Number(item.price_kgs) > 0
  ).length;

  const avgPrice =
    pricedItemsCount > 0 ? Math.round(totalValue / pricedItemsCount) : null;

  const needsRepairPercent =
    total > 0 ? Math.round((needsRepair / total) * 100) : 0;

  const conditionData = useMemo(() => {
    if (total === 0) return [];

    const map = {};
    furniture.forEach((f) => {
      const key = f.condition_name || "Не указано";
      map[key] = (map[key] || 0) + 1;
    });

    return Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
      percent: ((map[key] / total) * 100).toFixed(0),
    }));
  }, [furniture, total]);

  return (
    <div className="space-y-8 text-white animate-fadeIn">
      <div className="glass-strong liquid-card relative overflow-hidden rounded-[28px] p-8">
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-white/50">
              Inventory System
            </div>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-white/60 leading-relaxed">
              {t("Institution inventory overview")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/furniture/create"
              className="apple-btn apple-btn-primary shine-hover"
            >
              + {t("New Asset")}
            </Link>

            <Link to="/scan" className="apple-btn shine-hover">
              Scan Mode
            </Link>

            <Link to="/audit" className="apple-btn shine-hover">
              Inventory Audit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass liquid-card hover-lift interactive-panel rounded-[24px] p-6">
          <div className="text-sm text-white/50">{t("Total Assets")}</div>
          <div className="mt-3 text-3xl font-semibold text-blue-200 md:text-4xl">
            {total.toLocaleString("ru-RU")}
          </div>
          <div className="mt-3 text-sm text-white/60">
            {addedLast30} {t("added in 30 days")}
          </div>
        </div>

        <div className="glass liquid-card hover-lift interactive-panel rounded-[24px] p-6">
          <div className="text-sm text-white/50">{t("Total Value")}</div>
          <div className="mt-3 text-3xl font-semibold text-yellow-200 md:text-4xl">
            {totalValue.toLocaleString("ru-RU")} KGS
          </div>
          <div className="mt-3 text-sm text-white/60">
            {avgPrice
              ? `${t("Average price")}: ${avgPrice.toLocaleString("ru-RU")} KGS`
              : `${t("Average price")}: —`}
          </div>
        </div>

        <div className="glass liquid-card hover-lift interactive-panel rounded-[24px] border border-red-400/20 p-6">
          <div className="text-sm text-white/50">{t("Needs Repair")}</div>
          <div className="mt-3 text-3xl font-semibold text-red-300 md:text-4xl">
            {needsRepair.toLocaleString("ru-RU")}
          </div>
          <div className="mt-3 text-sm text-white/60">
            {needsRepairPercent}% {t("of total")}
          </div>
        </div>

        <div className="glass liquid-card hover-lift interactive-panel rounded-[24px] p-6">
          <div className="text-sm text-white/50">{t("WrittenOff")}</div>
          <div className="mt-3 text-3xl font-semibold text-orange-200 md:text-4xl">
            {writtenOff.toLocaleString("ru-RU")}
          </div>
          <div className="mt-3 text-sm text-white/60">
            {t("total written off")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass liquid-card rounded-[28px] p-8 xl:col-span-2">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {t("Condition Distribution")}
              </h2>
              <div className="mt-2 text-sm text-white/50">
                Актуальное распределение мебели по состоянию.
              </div>
            </div>

            <div className="liquid-badge">{total} assets</div>
          </div>

          <div className="flex flex-col items-center gap-10 lg:flex-row">
            <div className="relative flex h-[440px] w-full items-center justify-center lg:w-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={78}
                    outerRadius={108}
                    paddingAngle={2}
                    cornerRadius={10}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1}
                    isAnimationActive
                  >
                    {conditionData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[entry.name] || "#60a5fa"}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value, name) => [`${value}`, `${name}`]}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.88)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                      color: "white",
                      backdropFilter: "blur(14px)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Assets
                </div>
                <div className="mt-2 text-3xl font-semibold">{total}</div>
              </div>
            </div>

            <div className="w-full space-y-3">
              {conditionData.length === 0 ? (
                <div className="text-white/50">Нет данных для отображения.</div>
              ) : (
                conditionData.map((item, i) => (
                  <div
                    key={i}
                    className="glass flex items-center justify-between gap-6 rounded-2xl px-4 py-4 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[item.name] || "#60a5fa",
                          boxShadow: `0 0 18px ${COLORS[item.name] || "#60a5fa"}`,
                        }}
                      />
                      <span className="text-white/85">{item.name}</span>
                    </div>

                    <div className="font-medium text-white">
                      {item.value} • {item.percent}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="glass liquid-card rounded-[28px] p-8">
          <h2 className="text-2xl font-semibold">Quick Actions</h2>
          <div className="mt-2 text-sm text-white/50">
            Быстрые действия для работы с системой.
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link to="/furniture" className="apple-btn shine-hover text-center">
              Open Assets
            </Link>

            <Link
              to="/furniture/create"
              className="apple-btn apple-btn-primary shine-hover text-center"
            >
              Add New Asset
            </Link>

            <Link to="/scan" className="apple-btn shine-hover text-center">
              Start Scan Mode
            </Link>

            <Link to="/audit" className="apple-btn shine-hover text-center">
              Start Inventory Audit
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="text-sm text-white/50">System Health</div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Assets loaded</span>
                <span className="liquid-badge">{total}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Needs repair</span>
                <span className="liquid-badge">{needsRepair}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Written off</span>
                <span className="liquid-badge">{writtenOff}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;