import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

const adminModules = [
  {
    title: "Manage Users",
    description: "Create, edit, and deactivate user accounts.",
    to: "/admin/users",
  },
  {
    title: "Manage Projects",
    description: "Create and configure projects.",
    to: "/projects",
  },
  {
    title: "Manage Roles",
    description: "Customize role permissions.",
    to: "/admin/roles",
  },
  {
    title: "Manage Webhooks",
    description: "Configure outbound bug lifecycle webhook integrations.",
    to: "/admin/webhooks",
  },
  {
    title: "View Audit Logs",
    description: "Access complete system audit trail.",
    to: "/admin/audit-logs",
  },
  {
    title: "System Configuration",
    description: "Configure system-wide settings.",
    to: "/admin/system-settings",
  },
  {
    title: "Backup Management",
    description: "Trigger and manage data backups.",
    to: "/admin/backups",
  },
];

const AdminDashboardPage = () => (
  <Box>
    <Stack spacing={0.75} sx={{ mb: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
        Admin Dashboard
      </Typography>
      <Typography color="text.secondary">
        Central control panel for core administration modules.
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
