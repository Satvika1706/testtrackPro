import { Box, Typography } from "@mui/material";
import type { IconKey, KpiMetric } from "./types";

const iconByKey: Record<IconKey, string> = {
  testCases: "M4 6h16M4 12h16M4 18h10",
  testRuns: "M7 4v16M17 4v16M4 8h16M4 16h16",
  bugs: "M7 7h10v10H7zM4 12h3M17 12h3M12 4v3M12 17v3",
  passRate: "M4 12l5 5 11-11",
  pending: "M12 7v6l4 2",
  bugRate: "M5 18l14-14M5 6h6v6M19 18h-6v-6",
};

interface KpiCardProps {
  metric: KpiMetric;
}

const KpiCard = ({ metric }: KpiCardProps) => (
  <Box
    sx={{
      p: 3,
      backgroundColor: "#fff",
      border: "1px solid #e6ecf5",
      borderRadius: 4,
      boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)",
      transition: "transform 0.18s ease, box-shadow 0.18s ease",
      minHeight: 150,
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "start",
      gap: 1,
      "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: "0 18px 30px rgba(15, 23, 42, 0.12)",
      },
    }}
  >
    <Box>
      <Typography variant="body2" color="text.secondary">
        {metric.label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: "1.8rem", md: "2rem" },
          fontWeight: 800,
          lineHeight: 1.2,
          mt: 1,
          color: "#0f172a",
        }}
      >
        {metric.value}
      </Typography>
      <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5 }}>
        {metric.subtext}
      </Typography>
    </Box>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 2.5,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        stroke="#1d4ed8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={iconByKey[metric.icon]} />
      </svg>
    </Box>
  </Box>
);

export default KpiCard;
