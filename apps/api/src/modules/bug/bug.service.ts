import {
  BugDeletionAction,
  BugSeverity,
  BugStatus,
  NotificationType,
  Role,
} from "@prisma/client";
import { prisma } from "../../prisma";
import { NotificationService } from "../notification/notification.service";
import {
  getAllowedTransitions,
  isRole,
  WorkflowBugStatus,
} from "./bug.workflow";

interface AuthUser {
  userId: number;
  role: string;
}

export class BugService {
  private static readonly COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;
  private static readonly NOTIFICATION_TYPES = {
    BUG_ASSIGNED: "BUG_ASSIGNED" as NotificationType,
    BUG_CRITICAL_ASSIGNED: "BUG_CRITICAL_ASSIGNED" as NotificationType,
    BUG_REOPENED: "BUG_REOPENED" as NotificationType,
    BUG_RETEST_REQUESTED: "BUG_RETEST_REQUESTED" as NotificationType,
    BUG_MENTIONED: "BUG_MENTIONED" as NotificationType,
    BUG_STATUS_CHANGED: "BUG_STATUS_CHANGED" as NotificationType,
    BUG_TRIAGE_REQUIRED: "BUG_TRIAGE_REQUIRED" as NotificationType,
    BUG_WONT_FIX_REVIEW: "BUG_WONT_FIX_REVIEW" as NotificationType,
  } as const;

  private static readonly CRITICAL_SEVERITIES = new Set<BugSeverity>([
    BugSeverity.BLOCKER,
    BugSeverity.CRITICAL,
  ]);

  /* =========================================================
     UTIL
  ========================================================= */

  private static toRole(role: string): Role {
    if (!isRole(role)) throw new Error("Invalid role");
    return role;
  }

  private static async notifyAssigneeOnAssignment(bug: {
    id: string;
    severity: BugSeverity;
    assignedToId: number | null;
  }) {
    if (!bug.assignedToId) {
      return;
    }

    await NotificationService.createNotification(
      bug.assignedToId,
      this.NOTIFICATION_TYPES.BUG_ASSIGNED,
      bug.id
    );

    if (this.CRITICAL_SEVERITIES.has(bug.severity)) {
      await NotificationService.createNotification(
        bug.assignedToId,
        this.NOTIFICATION_TYPES.BUG_CRITICAL_ASSIGNED,
        bug.id
      );
    }
  }

  private static async notifyStatusChangeStakeholders(input: {
    bugId: string;
    status: BugStatus;
    assignedToId: number | null;
    createdById: number;
    actorId: number;
  }) {
    const { bugId, status, assignedToId, createdById, actorId } = input;

    const notifyTargets = new Set<number>();
    if (createdById !== actorId) {
      notifyTargets.add(createdById);
    }
    if (assignedToId && assignedToId !== actorId) {
      notifyTargets.add(assignedToId);
    }

    const statusNotificationType =
      status === BugStatus.REOPENED
        ? this.NOTIFICATION_TYPES.BUG_REOPENED
        : this.NOTIFICATION_TYPES.BUG_STATUS_CHANGED;

    await Promise.all(
      [...notifyTargets].map((userId) =>
        NotificationService.createNotification(userId, statusNotificationType, bugId)
      )
    );
  }

  private static extractMentionTokens(content: string) {
    const matches = [...content.matchAll(/@([a-zA-Z0-9._%+-]+)/g)];
    return [...new Set(matches.map((match) => match[1].toLowerCase()))];
  }

  private static async notifyMentionedUsers(
    bugId: string,
    content: string,
    actorUserId: number
  ) {
    const mentionTokens = this.extractMentionTokens(content);
    if (!mentionTokens.length) {
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: mentionTokens.map((token) => ({
          OR: [{ email: token }, { email: { startsWith: `${token}@` } }],
        })),
      },
      select: { id: true },
    });

    const targetIds = users
      .map((user) => user.id)
      .filter((userId) => userId !== actorUserId);

    await Promise.all(
      targetIds.map((userId) =>
        NotificationService.createNotification(
          userId,
          this.NOTIFICATION_TYPES.BUG_MENTIONED,
          bugId
        )
      )
    );
  }

  static async generateBugId(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.bug.count();
    const padded = String(count + 1).padStart(5, "0");
    return `BUG-${year}-${padded}`;
  }

  /* =========================================================
     CREATE BUG
  ========================================================= */

  static async createBug(data: any, userId: number) {
    const bugId = await this.generateBugId();

    const bug = await prisma.bug.create({
      data: {
        bugId,
        ...data,
        createdById: userId,
      },
      include: { assignedTo: true, createdBy: true },
    });

    await NotificationService.notifyRoleUsers(
      Role.TRIAGE,
      this.NOTIFICATION_TYPES.BUG_TRIAGE_REQUIRED,
      bug.id
    );

    await this.notifyAssigneeOnAssignment(bug);

    return bug;
  }

  /* =========================================================
     CREATE BUG FROM EXECUTION
  ========================================================= */

  static async createBugFromExecution(payload: any, userId: number) {
    const bugId = await this.generateBugId();

    const bug = await prisma.bug.create({
      data: {
        bugId,
        ...payload,
        createdById: userId,
      },
      include: { assignedTo: true, createdBy: true },
    });

    await NotificationService.notifyRoleUsers(
      Role.TRIAGE,
      this.NOTIFICATION_TYPES.BUG_TRIAGE_REQUIRED,
      bug.id
    );

    await this.notifyAssigneeOnAssignment(bug);

    return bug;
  }

  /* =========================================================
     GET BUGS
  ========================================================= */

  static async getBugs() {
    return prisma.bug.findMany({
      where: {
        status: {
          notIn: [BugStatus.REJECTED, BugStatus.SOFT_DELETED],
        },
      },
      include: { assignedTo: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getBugById(id: string, role: string) {
    const bug = await prisma.bug.findUnique({
      where: { id },
      include: { assignedTo: true, createdBy: true },
    });

    if (!bug) return null;

    return {
      ...bug,
      allowedTransitions: getAllowedTransitions(
        bug.status as WorkflowBugStatus,
        this.toRole(role)
      ),
    };
  }

  /* =========================================================
     STATUS UPDATE
  ========================================================= */

  static async updateStatus(
    id: string,
    newStatus: WorkflowBugStatus,
    user: AuthUser
  ) {
    const existing = await prisma.bug.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw new Error("Bug not found");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data: { status: newStatus as BugStatus },
      include: { assignedTo: true, createdBy: true },
    });

    if (existing.status !== updated.status) {
      await this.notifyStatusChangeStakeholders({
        bugId: updated.id,
        status: updated.status,
        assignedToId: updated.assignedToId,
        createdById: updated.createdById,
        actorId: user.userId,
      });
    }

    return updated;
  }

  /* =========================================================
     TRIAGE
  ========================================================= */

  static async triageBug(id: string, decision: any, user: AuthUser) {
    return this.updateStatus(id, decision, user);
  }

  /* =========================================================
     DEVELOPER ACTION
  ========================================================= */

  static async performDeveloperAction(id: string, payload: any, user: AuthUser) {
    const bug = await prisma.bug.findUnique({
      where: { id },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        status: true,
      },
    });

    if (!bug) {
      throw new Error("Bug not found");
    }

    if (user.role === Role.DEVELOPER && bug.assignedToId !== user.userId) {
      throw new Error("You can only perform actions on your assigned bugs");
    }

    const now = new Date();
    const data: Record<string, unknown> = {};

    switch (payload.action) {
      case "START_WORK":
        data.status = BugStatus.IN_PROGRESS;
        data.workStartedAt = now;
        break;
      case "ADD_FIX_NOTES":
        data.fixNotes = payload.fixNotes;
        break;
      case "LINK_COMMIT":
        data.fixCommitRef = payload.commitRef;
        break;
      case "MARK_FIXED":
        data.status = BugStatus.FIXED;
        data.fixedAt = now;
        data.resolutionSummary = payload.resolutionSummary ?? null;
        break;
      case "REQUEST_RETEST":
        data.retestRequestedAt = now;
        data.resolutionSummary = payload.resolutionSummary ?? null;
        await NotificationService.createNotification(
          bug.createdById,
          this.NOTIFICATION_TYPES.BUG_RETEST_REQUESTED,
          bug.id
        );
        break;
      case "WONT_FIX":
        data.status = BugStatus.WONT_FIX_REQUESTED;
        data.wontFixReason = payload.wontFixReason ?? null;
        await NotificationService.notifyRoleUsers(
          Role.TRIAGE,
          this.NOTIFICATION_TYPES.BUG_WONT_FIX_REVIEW,
          bug.id,
          user.userId
        );
        break;
      default:
        throw new Error("Unsupported developer action");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data,
      include: { assignedTo: true, createdBy: true },
    });

    if (bug.status !== updated.status) {
      await this.notifyStatusChangeStakeholders({
        bugId: updated.id,
        status: updated.status,
        assignedToId: updated.assignedToId,
        createdById: updated.createdById,
        actorId: user.userId,
      });
    }

    return updated;
  }

  /* =========================================================
     COMMENTS
  ========================================================= */

  static async getComments(bugId: string) {
    return prisma.bugComment.findMany({
      where: { bugId },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: {
          select: { id: true, email: true, role: true },
        },
      },
    });
  }

  static async addComment(bugId: string, payload: any, userId: number) {
    const comment = await prisma.bugComment.create({
      data: {
        bugId,
        ...payload,
        createdById: userId,
      },
    });

    await this.notifyMentionedUsers(bugId, payload.content, userId);

    return comment;
  }

  static async updateComment(commentId: string, content: string, userId: number) {
    const comment = await prisma.bugComment.findUnique({
      where: { id: commentId },
      select: { createdById: true, createdAt: true },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.createdById !== userId) {
      throw new Error("You can only edit your own comments");
    }

    const commentAgeMs = Date.now() - new Date(comment.createdAt).getTime();
    if (commentAgeMs > this.COMMENT_EDIT_WINDOW_MS) {
      throw new Error("Comment edit window has expired");
    }

    return prisma.bugComment.update({
      where: { id: commentId },
      data: { content, editedAt: new Date() },
    });
  }

  static async deleteComment(commentId: string, userId: number) {
    const comment = await prisma.bugComment.findUnique({
      where: { id: commentId },
      select: { createdById: true },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.createdById !== userId) {
      throw new Error("You can only delete your own comments");
    }

    return prisma.bugComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), content: "[deleted]" },
    });
  }

  static async assignBug(id: string, assignedToId: number) {
    const developer = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true },
    });

    if (!developer || developer.role !== Role.DEVELOPER) {
      throw new Error("assignedToId must belong to a DEVELOPER");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data: { assignedToId, status: BugStatus.OPEN },
      include: { assignedTo: true, createdBy: true },
    });

    await this.notifyAssigneeOnAssignment(updated);

    return updated;
  }

  static async getMyAssignedBugs(developerId: number, filters: any) {
    const bugs = await prisma.bug.findMany({
      where: {
        assignedToId: developerId,
        status: {
          notIn: [BugStatus.REJECTED, BugStatus.SOFT_DELETED],
        },
      },
      include: { assignedTo: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: bugs,
      pagination: {
        total: bugs.length,
        page: 1,
        limit: bugs.length,
        totalPages: 1,
      },
    };
  }

  static async softDeleteBug(
    id: string,
    status: "REJECTED" | "SOFT_DELETED",
    deletionReason: string,
    user: AuthUser
  ) {
    const existing = await prisma.bug.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new Error("Bug not found");
    }

    const now = new Date();
    const updated = await prisma.bug.update({
      where: { id },
      data: {
        status: status as BugStatus,
        deletedById: user.userId,
        deletedAt: now,
        deletionReason,
      },
      include: { assignedTo: true, createdBy: true },
    });

    await prisma.bugDeletionAudit.create({
      data: {
        bugId: id,
        action: BugDeletionAction.SOFT_DELETE,
        performedById: user.userId,
        performedAt: now,
        reason: deletionReason,
        previousStatus: existing.status,
        newStatus: status as BugStatus,
      },
    });

    return updated;
  }

  static async restoreBug(id: string, user: AuthUser) {
    const existing = await prisma.bug.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new Error("Bug not found");
    }

    const lastDeletion = await prisma.bugDeletionAudit.findFirst({
      where: { bugId: id, action: BugDeletionAction.SOFT_DELETE },
      orderBy: { performedAt: "desc" },
    });

    const restoredStatus =
      lastDeletion?.previousStatus ?? BugStatus.TRIAGE_PENDING;

    const updated = await prisma.bug.update({
      where: { id },
      data: {
        status: restoredStatus,
        deletedById: null,
        deletedAt: null,
        deletionReason: null,
      },
      include: { assignedTo: true, createdBy: true },
    });

    await prisma.bugDeletionAudit.create({
      data: {
        bugId: id,
        action: BugDeletionAction.RESTORE,
        performedById: user.userId,
        reason: null,
        previousStatus: existing.status,
        newStatus: restoredStatus,
      },
    });

    return updated;
  }
}
