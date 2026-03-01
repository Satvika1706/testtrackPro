import { Box, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { BugStatusPoint } from "./types";

interface BugStatusPieChartProps {
  data: BugStatusPoint[];
}

const BugStatusPieChart = ({ data }: BugStatusPieChartProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={4}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: "#dbe3ef" }}
            formatter={(value: number | undefined) => [value ?? 0, "Count"]}
          />
        </PieChart>
      </ResponsiveContainer>

      <Stack spacing={0.8}>
        {data.map((entry) => (
          <Box key={entry.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: entry.color }} />
              <Typography variant="body2" color="text.secondary">
                {entry.name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {entry.value} ({total ? ((entry.value / total) * 100).toFixed(0) : 0}%)
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default BugStatusPieChart;
