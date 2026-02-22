import { Notification, NotificationType, Role } from "@prisma/client";
import { prisma } from "../../prisma";
import { emitToUser } from "../../socket";

export type AppNotificationType =
  | NotificationType
  | "BUG_TRIAGE_REQUIRED"
  | "BUG_WONT_FIX_REVIEW";

export class NotificationService {
  static async createNotification(
    userId: number,
    type: AppNotificationType,
    referenceId: string
  ): Promise<Notification | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === Role.TESTER && type !== "BUG_STATUS_CHANGED") {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        referenceId,
      },
    });

    emitToUser(userId, "notification:new", notification);
    return notification;
  }

  static async getUserNotifications(userId: number) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const referenceIds = [
      ...new Set(notifications.map((item) => item.referenceId)),
    ];

    const bugs = await prisma.bug.findMany({
      where: { id: { in: referenceIds } },
      select: { id: true, bugId: true },
    });

    const bugIdByReference = new Map(
      bugs.map((bug) => [bug.id, bug.bugId])
    );

    return notifications.map((notification) => ({
      ...notification,
      bugId: bugIdByReference.get(notification.referenceId) ?? null,
    }));
  }

  static async markNotificationRead(
    notificationId: string,
    userId: number
  ) {
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    if (updated.count === 0) {
      throw new Error("Notification not found");
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const bug = await prisma.bug.findUnique({
      where: { id: notification.referenceId },
      select: { bugId: true },
    });

    return {
      ...notification,
      bugId: bug?.bugId ?? null,
    };
  }

  static async notifyRoleUsers(
    role: Role,
    type: AppNotificationType,
    referenceId: string,
    excludeUserId?: number
  ) {
    const users = await prisma.user.findMany({
      where: {
        role,
      },
      select: { id: true },
    });

    const targetUserIds = users
      .map((user) => user.id)
      .filter((id) => id !== excludeUserId);

    await Promise.all(
      targetUserIds.map((userId) =>
        this.createNotification(userId, type, referenceId)
      )
    );
  }
}
