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
        background:
          "radial-gradient(circle at 15% 20%, rgba(13,110,253,0.18) 0%, rgba(13,110,253,0) 35%), radial-gradient(circle at 85% 15%, rgba(15,23,42,0.16) 0%, rgba(15,23,42,0) 38%), linear-gradient(135deg, #eef3ff 0%, #f8fafc 45%, #edf6ff 100%)",
        px: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          width: { xs: 260, md: 360 },
          height: { xs: 260, md: 360 },
          borderRadius: "50%",
          background: "rgba(37, 99, 235, 0.14)",
          filter: "blur(70px)",
          top: { xs: -120, md: -140 },
          left: { xs: -90, md: -110 },
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: { xs: 260, md: 380 },
          height: { xs: 260, md: 380 },
          borderRadius: "50%",
          background: "rgba(14, 116, 144, 0.12)",
          filter: "blur(78px)",
          bottom: { xs: -120, md: -150 },
          right: { xs: -90, md: -120 },
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 600,
          borderRadius: 4,
          p: { xs: 4, sm: 6, md: 8 },
          border: "1px solid rgba(255, 255, 255, 0.55)",
          backgroundColor: "rgba(255, 255, 255, 0.78)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 24px 50px rgba(2, 12, 27, 0.12)",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default AuthLayout;
