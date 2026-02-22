import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { NotificationService } from "./notification.service";

export const getMyNotifications = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const notifications =
      await NotificationService.getUserNotifications(req.user.userId);

    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch notifications",
    });
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const updated = await NotificationService.markNotificationRead(
      id,
      req.user.userId
    );

    return res.json(updated);
  } catch (error: any) {
    if (error?.message === "Notification not found") {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(400).json({
      error: error.message || "Failed to mark notification read",
    });
  }
};
