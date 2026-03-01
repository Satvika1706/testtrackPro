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
  Avatar,
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

const drawerWidth = 280;

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
          fontSize: "0.96rem",
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

  const navSections = useMemo(() => {
    if (!user) return [];

    const main = [{ to: "/dashboard", label: "\uD83C\uDFE0 Dashboard", end: true }];

    const testManagement = user.role === "TESTER"
      ? [
          { to: "/test-cases", label: "\uD83D\uDCC4 Test Cases", end: false },
          { to: "/test-suites", label: "\uD83D\uDDD2 Test Suites", end: false },
          { to: "/test-runs", label: "\u25B6 Test Runs", end: false },
          { to: "/templates", label: "\uD83D\uDCD1 Templates", end: false },
        ]
      : [];

    const defects = [{ to: "/bugs", label: "\uD83D\uDC1E Bugs", end: false }];
    const insights = [{ to: "/reports", label: "\uD83D\uDCCA Reports", end: false }];

    const sections = [
      { title: "MAIN", items: main },
      { title: "TEST MANAGEMENT", items: testManagement },
      { title: "DEFECTS", items: defects },
      { title: "INSIGHTS", items: insights },
    ].filter((section) => section.items.length > 0);

    if (user.role === "ADMIN") {
      sections.push({
        title: "ADMIN",
        items: [
          { to: "/admin/users", label: "Manage Users", end: false },
          { to: "/admin/roles", label: "Manage Roles", end: false },
        ],
      });
    }

    return sections;
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

  const username = user?.email ? user.email.split("@")[0] : "username";
  const initials = username.slice(0, 2).toUpperCase();

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
              p: 2.5,
            },
          }}
        >
          <Box sx={{ mb: 1 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: "primary.main", fontSize: "0.9rem", mb: 1 }}>
              {initials}
            </Avatar>
            <Typography variant="h6" fontWeight={800} mb={0.5}>
              TestTrack Pro
            </Typography>
            <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 700 }}>
              {username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <List sx={{ pt: 0, flexGrow: 1 }}>
            {navSections.map((section) => (
              <Box key={section.title} sx={{ mb: 1.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.25,
                    color: "#64748b",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  {section.title}
                </Typography>

                {section.items.map((item) => (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.end}
                    sx={{
                      borderRadius: 2,
                      mt: 0.45,
                      mb: 0.2,
                      "&.active": {
                        backgroundColor: "primary.main",
                        color: "#fff",
                      },
                    }}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </Box>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate("/notifications")}
            sx={{ mb: 1.5 }}
          >
            {"\uD83D\uDD14"} Notifications ({unreadCount})
          </Button>

          <Button variant="contained" fullWidth onClick={handleLogout}>
            Logout {"\u21AA"}
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
