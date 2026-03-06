import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  type NotificationPayload,
} from "../realtime/notifications";
import { clearAuthTokens, getCurrentUser } from "../utils/auth";
import {
  getNotifications,
  type NotificationItem,
} from "../api/notification.api";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Collapse,
  CssBaseline,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { useProjectContext } from "../context/ProjectContext";

const drawerWidth = 248;

export interface NotificationContext {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  refreshNotifications: () => Promise<void>;
}

const buildDashboardTheme = (mode: "light" | "dark") => createTheme({
  palette: {
    mode,
    primary: {
      main: "#2563eb",
    },
    error: {
      main: "#f97362",
    },
    background: {
      default: mode === "dark" ? "#0b1220" : "#f7f9fc",
      paper: mode === "dark" ? "#0f172a" : "#ffffff",
    },
    text: {
      primary: mode === "dark" ? "#e2e8f0" : "#0f172a",
      secondary: mode === "dark" ? "#94a3b8" : "#64748b",
    },
  },
  typography: {
    fontSize: 13,
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    h6: {
      fontSize: "1.25rem",
      fontWeight: 800,
    },
    body1: {
      fontSize: "1rem",
    },
    body2: {
      fontSize: "0.875rem",
    },
    caption: {
      fontSize: "0.75rem",
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      fontSize: "0.9rem",
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#334155",
          letterSpacing: "0.02em",
        },
        body: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "0.82rem",
          fontWeight: 600,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "0.9rem",
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
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastNotification, setToastNotification] =
    useState<NotificationPayload | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    () => (localStorage.getItem("themeMode") as "light" | "dark") || "light"
  );
  const { projects, activeProjectId, setActiveProjectId, refreshProjects, loading, loadError } = useProjectContext();
  const [testMgmtOpen, setTestMgmtOpen] = useState(
    location.pathname.startsWith("/test-") ||
      location.pathname === "/templates" ||
      location.pathname.startsWith("/projects")
  );

  const user = useMemo(() => getCurrentUser(), []);
  const dashboardTheme = useMemo(() => buildDashboardTheme(themeMode), [themeMode]);

  const navSections = useMemo(() => {
    if (!user) return [];

    if (user.role === "ADMIN") {
      return [
        {
          title: "ADMIN",
          items: [
            { to: "/admin/users", label: "Manage Users", end: false },
            { to: "/projects", label: "Manage Projects", end: false },
            { to: "/admin/roles", label: "Manage Roles", end: false },
            { to: "/admin/webhooks", label: "Manage Webhooks", end: false },
            { to: "/admin/audit-logs", label: "View Audit Logs", end: false },
            { to: "/admin/system-settings", label: "System Configuration", end: false },
            { to: "/admin/backups", label: "Backup Management", end: false },
          ],
        },
      ];
    }

    const main = [{ to: "/dashboard", label: "\uD83C\uDFE0 Dashboard", end: true }];

    const testManagement = user.role === "TESTER"
      ? [
          { to: "/test-cases", label: "\uD83D\uDCC4 Test Cases", end: false },
          { to: "/test-suites", label: "\uD83D\uDDD2 Test Suites", end: false },
          { to: "/test-runs", label: "\u25B6 Test Runs", end: false },
        ]
      : [];

    const defects = [{ to: "/bugs", label: "\uD83D\uDC1E Bugs", end: false }];
    const projectsNav =
      user.role === "TESTER" || user.role === "DEVELOPER" || user.role === "TRIAGE"
        ? [{ to: "/projects", label: "\u2699 Projects", end: false }]
        : [];
    const insights = [{ to: "/reports", label: "\uD83D\uDCCA Reports", end: false }];

    const sections = [
      { title: "MAIN", items: main },
      { title: "TEST MANAGEMENT", items: testManagement },
      { title: "DEFECTS", items: defects },
      { title: "PROJECTS", items: projectsNav },
      { title: "INSIGHTS", items: insights },
    ].filter((section) => section.items.length > 0);

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

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (
      location.pathname.startsWith("/test-") ||
      location.pathname === "/templates" ||
      location.pathname.startsWith("/projects")
    ) {
      setTestMgmtOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    disconnectNotificationSocket();
    clearAuthTokens();
    navigate("/login");
  };

  const username = user?.email ? user.email.split("@")[0] : "username";
  const initials = username.slice(0, 2).toUpperCase();
  const roleHome = user?.role === "ADMIN" ? "/admin/users" : "/dashboard";
  const isRoleHome =
    location.pathname === roleHome ||
    (user?.role === "ADMIN" && location.pathname === "/dashboard");

  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(roleHome);
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
              p: 2.5,
              backgroundColor: themeMode === "dark" ? "#0f172a" : "#ffffff",
              borderRight: themeMode === "dark" ? "1px solid #1e293b" : "1px solid #e2e8f0",
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
            <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
              <InputLabel id="active-project-label">Project</InputLabel>
              <Select
                labelId="active-project-label"
                label="Project"
                value={projects.length ? activeProjectId : ""}
                onChange={(e) => {
                  const nextProjectId = e.target.value;
                  setActiveProjectId(nextProjectId);
                }}
                disabled={!projects.length}
              >
                {projects.length ? (
                  projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    {loading ? "Loading projects..." : "No projects available"}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            {loadError ? (
              <Button
                variant="text"
                size="small"
                sx={{ mt: 0.5, px: 0.5, justifyContent: "flex-start" }}
                onClick={() => void refreshProjects()}
              >
                Retry loading projects
              </Button>
            ) : null}
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

                {section.title === "TEST MANAGEMENT" ? (
                  <>
                    <ListItemButton
                      onClick={() => setTestMgmtOpen((prev) => !prev)}
                      sx={{ borderRadius: 2, mt: 0.45, mb: 0.2 }}
                    >
                      <ListItemText
                        primary={`\uD83D\uDCC2 Test Management ${testMgmtOpen ? "\u25B2" : "\u25BC"}`}
                      />
                    </ListItemButton>
                    <Collapse in={testMgmtOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ pl: 1 }}>
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
                    </Collapse>
                  </>
                ) : (
                  section.items.map((item) => (
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
                  ))
                )}
              </Box>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            fullWidth
            onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
            sx={{ mb: 1.5 }}
          >
            {themeMode === "light" ? "Switch to Dark \u263E" : "Switch to Light \u263C"}
          </Button>

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
            p: { xs: 2, sm: 3, md: 4 },
            backgroundColor: themeMode === "dark" ? "#0b1220" : "#f7f9fc",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 1320, mx: "auto" }}>
            <Box sx={{ mb: 2.5 }}>
              <Button
                variant="outlined"
                onClick={handleBackNavigation}
                disabled={isRoleHome}
                sx={{
                  minWidth: 0,
                  px: 2,
                  borderRadius: 2.5,
                  fontWeight: 700,
                }}
              >
                {"\u2190"} Back
              </Button>
            </Box>

            <Outlet
              key={activeProjectId || "no-project"}
              context={{
                notifications,
                setNotifications,
                refreshNotifications,
              }}
            />
          </Box>
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
