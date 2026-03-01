import { Box, Paper } from "@mui/material";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f6fb",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 600,
          borderRadius: 4,
          p: { xs: 4, sm: 6, md: 8 },
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default AuthLayout;