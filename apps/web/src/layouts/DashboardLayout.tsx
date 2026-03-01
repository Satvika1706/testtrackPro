import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  type NotificationPayload,
} from "../realtime/notifications";
import { getCurrentUser } from "../utils/auth";
import {
  getNotifications,
  type NotificationItem,
} from "../api/notification.api";
import {
  Alert,
  Badge,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";

const drawerWidth = 260;

export interface NotificationContext {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  refreshNotifications: () => Promise<void>;
}

const dashboardTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
    },
    error: {
      main: "#f97362",
    },
    background: {
      default: "#f7f9fc",
    },
  },
  typography: {
    fontSize: 16,
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    h6: {
      fontSize: "1.45rem",
      fontWeight: 800,
    },
    body1: {
      fontSize: "1rem",
    },
    body2: {
      fontSize: "0.95rem",
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      fontSize: "0.98rem",
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "0.86rem",
          fontWeight: 700,
          color: "#334155",
          letterSpacing: "0.02em",
        },
        body: {
          fontSize: "0.95rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "0.8rem",
          fontWeight: 600,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "0.98rem",
          fontWeight: 600,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState, theme }) => {
          const base = {
            borderRadius: 40,
            boxShadow: "none",
          };

          if (ownerState.variant === "contained") {
            const colorKey = (ownerState.color || "primary") as
              | "primary"
              | "secondary"
              | "error"
              | "info"
              | "success"
              | "warning";
            const fixedColor = theme.palette[colorKey]?.main || theme.palette.primary.main;
            return {
              ...base,
              "&:hover": {
                backgroundColor: fixedColor,
                boxShadow: "none",
              },
            };
          }

          return {
            ...base,
            paddingInline: 16,
            "&:hover": {
              backgroundColor: "transparent",
            },
          };
        },
      },
    },
  },
});

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastNotification, setToastNotification] =
    useState<NotificationPayload | null>(null);

  const user = useMemo(() => getCurrentUser(), []);

  const navItems = useMemo(() => {
    if (!user) return [];

    if (user.role === "DEVELOPER") {
      return [
        { to: "/developer/dashboard", label: "Dashboard" },
        { to: "/bugs", label: "My Bugs" },
        { to: "/reports", label: "Reports" },
      ];
    }

    if (user.role === "TESTER") {
      return [
        { to: "/test-cases", label: "Test Cases" },
        { to: "/test-runs", label: "Test Runs" },
        { to: "/templates", label: "Templates" },
        { to: "/test-suites", label: "Test Suites" },
        { to: "/bugs", label: "Bugs" },
        { to: "/reports", label: "Reports" },
      ];
    }

    if (user.role === "ADMIN") {
      return [
        { to: "/bugs", label: "Bugs" },
        { to: "/reports", label: "Reports" },
        { to: "/admin/users", label: "Manage Users" },
        { to: "/admin/roles", label: "Manage Roles" },
      ];
    }

    return [
      { to: "/bugs", label: "Bugs" },
      { to: "/reports", label: "Reports" },
    ];
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch {
      setNotifications((prev) => prev);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    void refreshNotifications();

    connectNotificationSocket(
      token,
      user.userId,
      user.role,
      (notification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setToastNotification(notification);
      }
    );

    return () => {
      disconnectNotificationSocket();
    };
  }, [user, refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    disconnectNotificationSocket();
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              p: 3,
            },
          }}
        >
          <Typography variant="h6" fontWeight={800} mb={1}>
            TestTrack Pro
          </Typography>

          {user ? (
            <Typography variant="body2" color="text.secondary" mb={3}>
              {user.email}
            </Typography>
          ) : null}

          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  "&.active": {
                    backgroundColor: "primary.main",
                    color: "#fff",
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate("/notifications")}
            sx={{ mb: 2 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              Notifications
            </Badge>
          </Button>

          <Button variant="contained" fullWidth onClick={handleLogout}>
            Logout
          </Button>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 5,
            backgroundColor: "#f7f9fc",
          }}
        >
          <Outlet
            context={{
              notifications,
              setNotifications,
              refreshNotifications,
            }}
          />
        </Box>

        <Snackbar
          open={Boolean(toastNotification)}
          autoHideDuration={4000}
          onClose={() => setToastNotification(null)}
        >
          <Alert
            severity="info"
            sx={{ width: "100%" }}
            onClose={() => setToastNotification(null)}
          >
            {toastNotification?.type} - {toastNotification?.referenceId}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardLayout;
