import { Alert, Box, Paper, Stack, Typography } from "@mui/material";

const AdminSystemSettingsPage = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
      System Configuration
    </Typography>
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Configure System-wide Settings
        </Typography>
        <Alert severity="info">
          System settings UI placeholder. Add system policy toggles and global configuration controls here.
        </Alert>
      </Stack>
    </Paper>
  </Box>
);

export default AdminSystemSettingsPage;
