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

export interface NotificationContext {
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<
    React.SetStateAction<NotificationItem[]>
  >;
  refreshNotifications: () => Promise<void>;
}

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
        { to: "/developer/dashboard", label: "Developer Dashboard" },
        { to: "/bugs", label: "My Assigned Bugs" },
        { to: "/reports", label: "Reports & Analytics" },
      ];
    }

    if (user.role === "TESTER") {
      return [
        { to: "/test-cases", label: "Test Cases" },
        { to: "/test-runs", label: "Test Runs" },
        { to: "/templates", label: "Templates" },
        { to: "/test-suites", label: "Test Suites" },
        { to: "/bugs", label: "Bugs" },
        { to: "/reports", label: "Reports & Analytics" },
      ];
    }

    return [
      { to: "/bugs", label: "Bugs" },
      { to: "/reports", label: "Reports & Analytics" },
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

  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => {
      setToastNotification(null);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastNotification]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const formatNotificationType = (type: string) =>
    type
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const handleOpenNotifications = () => {
    navigate("/notifications");
  };

  const handleLogout = () => {
    disconnectNotificationSocket();
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--primary-color)", margin: 0 }}
          >
            TestTrack Pro
          </h1>
          {user ? <p className="sidebar-user">{user.email}</p> : null}
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="w-full secondary notification-toggle"
            onClick={handleOpenNotifications}
          >
            Notifications
            {unreadCount > 0 ? (
              <span className="notification-count">{unreadCount}</span>
            ) : null}
          </button>

          <button onClick={handleLogout} className="w-full secondary">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet
          context={{
            notifications,
            setNotifications,
            refreshNotifications,
          }}
        />
      </main>

      {toastNotification ? (
        <div className="notification-toast" role="status" aria-live="polite">
          <strong>{formatNotificationType(toastNotification.type)}</strong>
          <span>Reference: {toastNotification.referenceId}</span>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardLayout;
