import { Link } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { getCurrentUser } from "../utils/auth";

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

const reportCards = [
  {
    title: "Test Execution Report",
    description:
      "Track execution progress, pass/fail trends, and module/tester-level delivery quality.",
    route: "/reports/test-execution",
    enabled: true,
  },
  {
    title: "Bug Report",
    description:
      "Analyze bug severity, closure trends, and ownership across the release cycle.",
    route: "/reports/bugs",
    enabled: true,
  },
  {
    title: "Developer Performance Report",
    description:
      "Measure fix throughput, turnaround time, and verification outcomes by developer.",
    route: "/reports/developer-performance",
    enabled: true,
  },
  {
    title: "Tester Performance Report",
    description:
      "Review tester execution coverage, defect discovery rates, and report quality.",
    route: "/reports/tester-performance",
    enabled: true,
  },
];

const ReportsPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;

  if (!hasAccess) {
    return (
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 1 }}>
          Reports & Analytics
        </Typography>
        <Typography color="text.secondary">
          You do not have permission to view reports.
        </Typography>
      </Paper>
    );
  }

  const visibleCards = reportCards.filter((card) => {
    if (!user) return false;
    if (user.role === "DEVELOPER" && card.title === "Tester Performance Report") {
      return false;
    }
    return true;
  });

  return (
    <Box>
      <Stack spacing={0.75} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          Reports & Analytics
        </Typography>
        <Typography color="text.secondary">
          Choose a report to view detailed quality and execution insights.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {visibleCards.map((card) => (
          <Paper key={card.route} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2} justifyContent="space-between" sx={{ minHeight: 180 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography color="text.secondary">{card.description}</Typography>
              </Box>

              <Button
                component={Link}
                to={card.route}
                type="button"
                variant={card.enabled ? "contained" : "outlined"}
              >
                View Report
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ReportsPage;
