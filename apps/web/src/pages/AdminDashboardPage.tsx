import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

const adminModules = [
  {
    title: "Users",
    description: "Create users, update roles, activate/deactivate accounts, and verify access.",
    to: "/admin/users",
  },
  {
    title: "Role Permissions",
    description: "Review role distribution and assign role changes for platform governance.",
    to: "/admin/roles",
  },
  {
    title: "Audit Logs",
    description: "Track critical platform activities and security-relevant administrative actions.",
    to: "/admin/audit-logs",
  },
  {
    title: "System Settings",
    description: "Configure global product controls, policy toggles, and maintenance preferences.",
    to: "/admin/system-settings",
  },
  {
    title: "Reports",
    description: "Open analytics hub for cross-functional visibility and operational reporting.",
    to: "/reports",
  },
];

const AdminDashboardPage = () => (
  <Box>
    <Stack spacing={0.75} sx={{ mb: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
        Admin Dashboard
      </Typography>
      <Typography color="text.secondary">
        Central control panel for users, permissions, auditability, settings, and reports.
      </Typography>
    </Stack>

    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
      }}
    >
      {adminModules.map((module) => (
        <Paper key={module.title} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Stack spacing={2} sx={{ minHeight: 180 }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                {module.title}
              </Typography>
              <Typography color="text.secondary">{module.description}</Typography>
            </Box>
            <Button component={RouterLink} to={module.to} variant="contained">
              Open {module.title}
            </Button>
          </Stack>
        </Paper>
      ))}
    </Box>
  </Box>
);

export default AdminDashboardPage;
