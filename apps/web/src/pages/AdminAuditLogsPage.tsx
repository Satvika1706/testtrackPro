import { Alert, Box, Paper, Stack, Typography } from "@mui/material";

const AdminAuditLogsPage = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
      View Audit Logs
    </Typography>
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Complete System Audit Trail
        </Typography>
        <Alert severity="info">
          Audit log viewer UI is reserved here. Connect this page to audit log APIs when backend audit endpoints are ready.
        </Alert>
      </Stack>
    </Paper>
  </Box>
);

export default AdminAuditLogsPage;
