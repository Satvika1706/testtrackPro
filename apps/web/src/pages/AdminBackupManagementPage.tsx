import { Alert, Box, Paper, Stack, Typography } from "@mui/material";

const AdminBackupManagementPage = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
      Backup Management
    </Typography>
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Trigger and Manage Data Backups
        </Typography>
        <Alert severity="info">
          Backup operations UI placeholder. Hook this page to backup trigger/status APIs when available.
        </Alert>
      </Stack>
    </Paper>
  </Box>
);

export default AdminBackupManagementPage;
