import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  markNotificationRead,
  type NotificationItem,
} from "../api/notification.api";
import { type NotificationContext } from "../layouts/DashboardLayout";

const formatNotificationType = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, setNotifications, refreshNotifications } =
    useOutletContext<NotificationContext>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const notificationList = useMemo(
    () => notifications || [],
    [notifications]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError("");
      try {
        await refreshNotifications();
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.error || "Failed to load notifications");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshNotifications]);

  const handleView = async (item: NotificationItem) => {
    setError("");
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === item.id
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }

      navigate(`/bugs/${item.referenceId}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Failed to open notification"
      );
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
        <p className="text-sm text-gray-600">
          Review updates related to your bugs and triage activity.
        </p>
      </div>

      {error ? (
        <div className="alert error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="notification-state">Loading notifications...</div>
      ) : notificationList.length === 0 ? (
        <div className="notification-state">No notifications yet.</div>
      ) : (
        <div className="notifications-list">
          {notificationList.map((item) => (
            <div
              key={item.id}
              className={`notification-card ${
                item.isRead ? "" : "unread"
              }`}
            >
              <div className="notification-details">
                <div className="notification-title">
                  {formatNotificationType(item.type)}
                </div>
                <div className="notification-meta-row">
                  <span className="notification-label">Bug ID</span>
                  <span className="notification-bugid">
                    {item.bugId || "Unknown"}
                  </span>
                </div>
                <div className="notification-meta-row">
                  <span className="notification-label">Created</span>
                  <span className="notification-date">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="notification-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => handleView(item)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
