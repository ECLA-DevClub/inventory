import { useContext, useMemo } from "react";
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
  const { furniture } = useContext(InventoryContext);

  const total = furniture.length;

  const totalValue = total * 15000;

  const needsRepair = furniture.filter(
    (f) => f.condition === "Needs Repair"
  ).length;

  const writtenOff = furniture.filter(
    (f) => f.status === "WrittenOff"
  ).length;

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
        <h1 className="text-4xl font-bold">Дашборд</h1>
        <p className="text-white/50 mt-2">
          Обзор состояния инвентаря учреждения
        </p>
      </div>

      {/* KPI BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">Всего мебели</div>
          <div className="text-3xl font-bold mt-2">{total}</div>
          <div className="text-green-400 text-sm mt-2">
            +12 за месяц
          </div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">Общая стоимость</div>
          <div className="text-3xl font-bold mt-2">
            {totalValue.toLocaleString()} KGS
          </div>
          <div className="text-green-400 text-sm mt-2">
            +2.5% за месяц
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-red-500/30 hover:scale-105 transition">
          <div className="text-white/50 text-sm">Требует ремонта</div>
          <div className="text-3xl font-bold mt-2">
            {needsRepair}
          </div>
          <div className="text-red-400 text-sm mt-2">
            -3 за месяц
          </div>
        </div>

        <div className="glass p-6 rounded-2xl hover:scale-105 transition">
          <div className="text-white/50 text-sm">Списано за месяц</div>
          <div className="text-3xl font-bold mt-2">
            {writtenOff}
          </div>
          <div className="text-white/40 text-sm mt-2">
            единиц списано
          </div>
        </div>

      </div>

      {/* DONUT SECTION */}
      <div className="glass p-8 rounded-3xl">

        <h2 className="text-xl mb-6">
          Распределение по состоянию
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
                  <span className="text-white/80">
                    {item.name}
                  </span>
                </div>

                <div className="text-white font-medium">
                  {item.percent}%
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