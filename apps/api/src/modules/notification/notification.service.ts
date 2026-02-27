import { Notification, NotificationType, Role } from "@prisma/client";
import { prisma } from "../../prisma";
import { emitToUser } from "../../socket";

export type AppNotificationType = NotificationType;

const nt = (value: string) => value as NotificationType;
const NOTIFICATION_TYPES = {
  BUG_ASSIGNED: nt("BUG_ASSIGNED"),
  BUG_CRITICAL_ASSIGNED: nt("BUG_CRITICAL_ASSIGNED"),
  BUG_REOPENED: nt("BUG_REOPENED"),
  BUG_RETEST_REQUESTED: nt("BUG_RETEST_REQUESTED"),
  BUG_MENTIONED: nt("BUG_MENTIONED"),
  BUG_STATUS_CHANGED: nt("BUG_STATUS_CHANGED"),
  BUG_TRIAGE_REQUIRED: nt("BUG_TRIAGE_REQUIRED"),
  BUG_WONT_FIX_REVIEW: nt("BUG_WONT_FIX_REVIEW"),
  BUG_COMMENTED: nt("BUG_COMMENTED"),
} as const;

const ROLE_NOTIFICATION_ALLOWLIST: Record<Role, Set<NotificationType>> = {
  ADMIN: new Set(Object.values(NOTIFICATION_TYPES)),
  TRIAGE: new Set(Object.values(NOTIFICATION_TYPES)),
  DEVELOPER: new Set([
    NOTIFICATION_TYPES.BUG_ASSIGNED,
    NOTIFICATION_TYPES.BUG_CRITICAL_ASSIGNED,
    NOTIFICATION_TYPES.BUG_REOPENED,
    NOTIFICATION_TYPES.BUG_RETEST_REQUESTED,
    NOTIFICATION_TYPES.BUG_MENTIONED,
    NOTIFICATION_TYPES.BUG_STATUS_CHANGED,
  ]),
  TESTER: new Set([
    NOTIFICATION_TYPES.BUG_STATUS_CHANGED,
    NOTIFICATION_TYPES.BUG_RETEST_REQUESTED,
    NOTIFICATION_TYPES.BUG_TRIAGE_REQUIRED,
    NOTIFICATION_TYPES.BUG_WONT_FIX_REVIEW,
    NOTIFICATION_TYPES.BUG_COMMENTED,
    NOTIFICATION_TYPES.BUG_MENTIONED,
  ]),
};

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

    const allowedTypes = ROLE_NOTIFICATION_ALLOWLIST[user.role];
    if (!allowedTypes.has(type)) {
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

    const bugsById = await prisma.bug.findMany({
      where: { id: { in: referenceIds } },
      select: { id: true, bugId: true },
    });

    const unresolvedReferenceIds = referenceIds.filter(
      (referenceId) => !bugsById.some((bug) => bug.id === referenceId)
    );

    const bugsByBugId = unresolvedReferenceIds.length
      ? await prisma.bug.findMany({
          where: { bugId: { in: unresolvedReferenceIds } },
          select: { id: true, bugId: true },
        })
      : [];

    const bugByReference = new Map<string, { id: string; bugId: string }>();
    for (const bug of bugsById) {
      bugByReference.set(bug.id, bug);
    }
    for (const bug of bugsByBugId) {
      bugByReference.set(bug.bugId, bug);
    }

    return notifications.map((notification) => ({
      ...notification,
      referenceId:
        bugByReference.get(notification.referenceId)?.id ??
        notification.referenceId,
      bugId: bugByReference.get(notification.referenceId)?.bugId ?? null,
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

    const bug =
      (await prisma.bug.findUnique({
        where: { id: notification.referenceId },
        select: { id: true, bugId: true },
      })) ??
      (await prisma.bug.findUnique({
        where: { bugId: notification.referenceId },
        select: { id: true, bugId: true },
      }));

    return {
      ...notification,
      referenceId: bug?.id ?? notification.referenceId,
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
