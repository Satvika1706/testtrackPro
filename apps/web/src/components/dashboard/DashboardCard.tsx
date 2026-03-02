import type { PropsWithChildren, ReactNode } from "react";
import { Box, Typography, useTheme } from "@mui/material";

interface DashboardCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  minHeight?: number;
}

const DashboardCard = ({
  title,
  subtitle,
  action,
  minHeight,
  children,
}: DashboardCardProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        backgroundColor: isDark ? "#0f172a" : "#fff",
        border: isDark ? "1px solid #334155" : "1px solid #e6ecf5",
        borderRadius: 4,
        p: 3,
        boxShadow: isDark ? "0 10px 24px rgba(2, 6, 23, 0.45)" : "0 10px 24px rgba(15, 23, 42, 0.07)",
        minHeight,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontSize: "1.05rem", mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
};

export default DashboardCard;
