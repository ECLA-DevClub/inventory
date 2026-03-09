import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFurniture } from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  "Хорошее": "#14b8a6",
  "Требует ремонта": "#ef4444",
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
  const totalValue = 0;

  const needsRepair = furniture.filter(
    (f) => f.condition_name === "Требует ремонта"
  ).length;

  const writtenOff = 0;
  const addedLast30 = furniture.length;
  const avgPrice = null;
  const needsRepairPercent = total > 0 ? Math.round((needsRepair / total) * 100) : 0;

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
    <div className="space-y-10 text-white animate-fadeIn">
      <div>
        <h1 className="text-4xl font-bold">{t("Dashboard Overview")}</h1>
        <p className="text-white/50 mt-2">{t("Institution inventory overview")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Total Assets")}</div>
          <div className="text-3xl font-bold mt-2 text-blue-200">
            {total.toLocaleString("ru-RU")}
          </div>
          <div className="text-white/60 text-sm mt-2">
            {addedLast30} {t("added in 30 days")}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Total Value")}</div>
          <div className="text-3xl font-bold mt-2 text-yellow-200">
            {totalValue.toLocaleString("ru-RU")} KGS
          </div>
          <div className="text-white/60 text-sm mt-2">
            {avgPrice ? `${t("Average price")}: ${avgPrice.toLocaleString("ru-RU")} KGS` : `${t("Average price")}: —`}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-red-500/30 hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("Needs Repair")}</div>
          <div className="text-3xl font-bold mt-2 text-red-300">
            {needsRepair.toLocaleString("ru-RU")}
          </div>
          <div className="text-white/60 text-sm mt-2">
            {needsRepairPercent}% {t("of total")}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">{t("WrittenOff")}</div>
          <div className="text-3xl font-bold mt-2 text-white">
            {writtenOff.toLocaleString("ru-RU")}
          </div>
          <div className="text-white/60 text-sm mt-2">{t("total written off")}</div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl">
        <h2 className="text-xl mb-6">{t("Condition Distribution")}</h2>

        <div className="flex flex-col md:flex-row items-center gap-10">
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

          <div className="space-y-3 w-full md:w-auto">
            {conditionData.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor: COLORS[item.name] || "#3b82f6",
                    }}
                  />
                  <span className="text-white/80">{item.name}</span>
                </div>

                <div className="text-white font-medium">
                  {item.value} • {item.percent}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;