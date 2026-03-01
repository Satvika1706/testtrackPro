import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ModuleFailurePoint } from "./types";

interface ModuleFailuresBarChartProps {
  data: ModuleFailurePoint[];
}

const ModuleFailuresBarChart = ({ data }: ModuleFailuresBarChartProps) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 20 }}>
      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
      <XAxis
        dataKey="module"
        tick={{ fill: "#64748b", fontSize: 12 }}
        angle={-20}
        textAnchor="end"
      />
      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
      <Tooltip
        contentStyle={{ borderRadius: 12, borderColor: "#dbe3ef" }}
        formatter={(value: number | undefined) => [value ?? 0, "Failures"]}
      />
      <Bar dataKey="failures" fill="#2563eb" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default ModuleFailuresBarChart;
