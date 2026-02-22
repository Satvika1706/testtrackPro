import {
  BugDeletionAction,
  BugPriority,
  BugSeverity,
  BugStatus,
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

  /* =========================================================
     UTIL
  ========================================================= */

  private static toRole(role: string): Role {
    if (!isRole(role)) throw new Error("Invalid role");
    return role;
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
      "BUG_TRIAGE_REQUIRED",
      bug.bugId   // 🔥 FIX
    );

    if (bug.assignedToId) {
      await NotificationService.createNotification(
        bug.assignedToId,
        "BUG_ASSIGNED",
        bug.bugId   // 🔥 FIX
      );
    }

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
      "BUG_TRIAGE_REQUIRED",
      bug.bugId   // 🔥 FIX
    );

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
    const updated = await prisma.bug.update({
      where: { id },
      data: { status: newStatus as BugStatus },
      include: { assignedTo: true, createdBy: true },
    });

    if (updated.createdById !== user.userId) {
      await NotificationService.createNotification(
        updated.createdById,
        "BUG_STATUS_CHANGED",
        updated.bugId   // 🔥 FIX
      );
    }

    return updated;
  }

  /* =========================================================
     TRIAGE
  ========================================================= */

  static async triageBug(
    id: string,
    decision: any,
    user: AuthUser
  ) {
    return this.updateStatus(id, decision, user);
  }

  /* =========================================================
     DEVELOPER ACTION
  ========================================================= */

  static async performDeveloperAction(
    id: string,
    payload: any,
    user: AuthUser
  ) {
    return prisma.bug.update({
      where: { id },
      data: payload,
      include: { assignedTo: true, createdBy: true },
    });
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

  static async addComment(
    bugId: string,
    payload: any,
    userId: number
  ) {
    return prisma.bugComment.create({
      data: {
        bugId,
        ...payload,
        createdById: userId,
      },
    });
  }

  static async updateComment(
    commentId: string,
    content: string,
    userId: number
  ) {
    return prisma.bugComment.update({
      where: { id: commentId },
      data: { content },
    });
  }

  static async deleteComment(commentId: string, userId: number) {
    return prisma.bugComment.delete({
      where: { id: commentId },
    });
  }

  /* =========================================================
     ASSIGN BUG
  ========================================================= */

  static async assignBug(id: string, assignedToId: number) {
    const updated = await prisma.bug.update({
      where: { id },
      data: { assignedToId, status: BugStatus.OPEN },
      include: { assignedTo: true, createdBy: true },
    });

    await NotificationService.createNotification(
      assignedToId,
      "BUG_ASSIGNED",
      updated.bugId   // 🔥 FIX
    );

    return updated;
  }

  /* =========================================================
     MY ASSIGNED BUGS
  ========================================================= */

  static async getMyAssignedBugs(
    developerId: number,
    filters: any
  ) {
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

  /* =========================================================
     SOFT DELETE
  ========================================================= */

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

  /* =========================================================
     RESTORE
  ========================================================= */

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
