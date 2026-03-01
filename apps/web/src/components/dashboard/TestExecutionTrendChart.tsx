import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "./types";

interface TestExecutionTrendChartProps {
  data: TrendPoint[];
  mode: "execution" | "resolution";
}

const TestExecutionTrendChart = ({
  data,
  mode,
}: TestExecutionTrendChartProps) => (
  <ResponsiveContainer width="100%" height={280}>
    <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
      <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} />
      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
      <Tooltip
        contentStyle={{ borderRadius: 12, borderColor: "#dbe3ef" }}
        labelStyle={{ color: "#334155", fontWeight: 700 }}
      />
      <Legend />
      {mode === "execution" ? (
        <>
          <Line type="monotone" dataKey="executed" stroke="#2563eb" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="passed" stroke="#059669" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="failed" stroke="#dc2626" strokeWidth={3} dot={false} />
        </>
      ) : (
        <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={3} dot={false} />
      )}
    </LineChart>
  </ResponsiveContainer>
);

export default TestExecutionTrendChart;
