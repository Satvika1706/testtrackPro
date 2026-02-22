import api from "./axios";

export interface NotificationItem {
  id: string;
  type: string;
  referenceId: string;
  createdAt: string;
  isRead: boolean;
  bugId?: string | null;
  message?: string | null;
}

export const getNotifications = () =>
  api.get<NotificationItem[]>("/api/notifications");

export const markNotificationRead = (id: string) =>
  api.patch<NotificationItem>(`/api/notifications/${id}/read`);
