import {
  BugDeletionAction,
  BugPriority,
  BugSeverity,
  BugStatus,
  NotificationType,
  Role,
  WebhookEventType,
} from "@prisma/client";
import { prisma } from "../../prisma";
import { NotificationService } from "../notification/notification.service";
import { WebhookService } from "../integrations/webhook.service";
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
          OR: [
            { email: token },
            { email: { startsWith: `${token}@`, mode: "insensitive" } },
            { username: token },
            { username: { startsWith: token, mode: "insensitive" } },
          ],
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

  

  static async createBug(data: any, userId: number, projectId: string) {
    const bugId = await this.generateBugId();
    const sanitized = {
      title: data.title,
      description: data.description,
      stepsToReproduce: data.stepsToReproduce,
      expectedBehavior: data.expectedBehavior,
      actualBehavior: data.actualBehavior,
      severity: data.severity,
      priority: data.priority,
      environment: data.environment,
      affectedVersion: data.affectedVersion,
      assignedToId: data.assignedToId,
    };

    const bug = await prisma.bug.create({
      data: {
        bugId,
        ...sanitized,
        projectId,
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
    await WebhookService.emitBugEvent(WebhookEventType.BUG_CREATED, bug);

    return bug;
  }

  static async createBugFromExecution(payload: any, userId: number, projectId: string) {
    const bugId = await this.generateBugId();
    const runItem = await prisma.testRunItem.findUnique({
      where: { id: payload.executionId },
      include: {
        testRun: {
          select: { projectId: true },
        },
        testCase: {
          select: {
            title: true,
            environment: true,
          },
        },
      },
    });

    if (!runItem) {
      throw new Error("Execution not found");
    }
    if (runItem.testRun.projectId !== projectId) {
      throw new Error("Execution does not belong to selected project");
    }

    const failedStep = await prisma.testExecutionStep.findUnique({
      where: { id: payload.failedStepId },
      select: {
        id: true,
        testRunItemId: true,
        stepNumber: true,
        action: true,
        expectedResult: true,
        actualResult: true,
      },
    });

    if (!failedStep) {
      throw new Error("Failed step not found");
    }

    if (failedStep.testRunItemId !== runItem.id) {
      throw new Error("Failed step does not belong to execution");
    }

    const derivedTitle = `Execution Failure: ${runItem.testCase.title} (Step ${failedStep.stepNumber})`;
    const baseDescription = `Failed during test execution ${runItem.id}.`;
    const noteSuffix = payload.additionalNotes ? ` Notes: ${payload.additionalNotes}` : "";
    const actualBehavior =
      failedStep.actualResult?.trim() || "Step marked as FAIL during execution.";

    const bug = await prisma.bug.create({
      data: {
        bugId,
        title: derivedTitle,
        description: `${baseDescription}${noteSuffix}`.trim(),
        stepsToReproduce: failedStep.action,
        expectedBehavior: failedStep.expectedResult,
        actualBehavior,
        severity: payload.severity,
        priority: payload.priority,
        environment: runItem.testCase.environment || undefined,
        assignedToId: payload.assignedToId,
        projectId,
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
    await WebhookService.emitBugEvent(WebhookEventType.BUG_CREATED, bug);

    return bug;
  }

  static async getBugs(projectId: string) {
    return prisma.bug.findMany({
      where: {
        projectId,
        status: {
          notIn: [BugStatus.REJECTED, BugStatus.SOFT_DELETED],
        },
      },
      include: { assignedTo: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getBugById(id: string, role: string, projectId: string) {
    const bug = await prisma.bug.findFirst({
      where: { id, projectId },
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

    const role = this.toRole(user.role);
    const currentStatus = existing.status as WorkflowBugStatus;
    const allowedTransitions = getAllowedTransitions(currentStatus, role);

    if (newStatus !== currentStatus && !allowedTransitions.includes(newStatus)) {
      throw new Error(`Transition from ${currentStatus} to ${newStatus} is not allowed for ${role}`);
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

      const resolvedStatuses = new Set<BugStatus>([
        BugStatus.FIXED,
        BugStatus.VERIFIED,
        BugStatus.CLOSED,
      ]);
      const eventType = resolvedStatuses.has(updated.status) && !resolvedStatuses.has(existing.status)
        ? WebhookEventType.BUG_RESOLVED
        : WebhookEventType.BUG_UPDATED;
      await WebhookService.emitBugEvent(eventType, updated);
    }

    return updated;
  }

  static async triageBug(id: string, decision: any, user: AuthUser) {
    return this.updateStatus(id, decision as WorkflowBugStatus, user);
  }

  static async updateTriageClassification(
    id: string,
    payload: { priority?: BugPriority; severity?: BugSeverity }
  ) {
    const existing = await prisma.bug.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new Error("Bug not found");
    }

    if (existing.status !== BugStatus.NEW) {
      throw new Error("Priority/Severity can be changed only during NEW triage review");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data: {
        ...(payload.priority ? { priority: payload.priority } : {}),
        ...(payload.severity ? { severity: payload.severity } : {}),
      },
      include: { assignedTo: true, createdBy: true },
    });

    await WebhookService.emitBugEvent(WebhookEventType.BUG_UPDATED, updated);
    return updated;
  }

 

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
    let statusChangedByTransition = false;

    switch (payload.action) {
      case "START_WORK":
        await this.updateStatus(id, "IN_PROGRESS", user);
        statusChangedByTransition = true;
        data.workStartedAt = now;
        break;
      case "ADD_FIX_NOTES":
        data.fixNotes = payload.fixNotes;
        break;
      case "LINK_COMMIT":
        data.fixCommitRef = payload.commitRef;
        break;
      case "MARK_FIXED":
        await this.updateStatus(id, "FIXED", user);
        statusChangedByTransition = true;
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
        await this.updateStatus(id, "WONT_FIX", user);
        statusChangedByTransition = true;
        data.wontFixReason = payload.wontFixReason ?? null;
        break;
      default:
        throw new Error("Unsupported developer action");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data,
      include: { assignedTo: true, createdBy: true },
    });

    if (!statusChangedByTransition && bug.status !== updated.status) {
      await this.notifyStatusChangeStakeholders({
        bugId: updated.id,
        status: updated.status,
        assignedToId: updated.assignedToId,
        createdById: updated.createdById,
        actorId: user.userId,
      });
    }

    if (Object.keys(data).length > 0) {
      await WebhookService.emitBugEvent(WebhookEventType.BUG_UPDATED, updated);
    }

    return updated;
  }

  

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

    const bug = await prisma.bug.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!bug) {
      throw new Error("Bug not found");
    }

    if (bug.status !== BugStatus.NEW && bug.status !== BugStatus.OPEN) {
      throw new Error("Assignment is allowed only for NEW or OPEN bugs");
    }

    const updated = await prisma.bug.update({
      where: { id },
      data: {
        assignedToId,
        ...(bug.status === BugStatus.NEW ? { status: BugStatus.OPEN } : {}),
      },
      include: { assignedTo: true, createdBy: true },
    });

    await this.notifyAssigneeOnAssignment(updated);
    await WebhookService.emitBugEvent(WebhookEventType.BUG_UPDATED, updated);

    return updated;
  }

  static async getMyAssignedBugs(
    developerId: number,
    filters: any,
    projectId: string
  ) {
    const bugs = await prisma.bug.findMany({
      where: {
        projectId,
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

    await WebhookService.emitBugEvent(WebhookEventType.BUG_DELETED, updated);

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
      (lastDeletion?.previousStatus as BugStatus | null) ?? BugStatus.NEW;

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

    await WebhookService.emitBugEvent(WebhookEventType.BUG_UPDATED, updated);

    return updated;
  }

  static async getMentionableUsers(query?: string) {
    const normalized = (query ?? "").trim();

    const users = await prisma.user.findMany({
      where: {
        role: { in: [Role.TESTER, Role.DEVELOPER, Role.TRIAGE, Role.ADMIN] },
        ...(normalized
          ? {
              OR: [
                { username: { contains: normalized, mode: "insensitive" } },
                { email: { contains: normalized, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
      orderBy: [{ email: "asc" }],
      take: 100,
    });

    return users.map((item) => ({
      id: item.id,
      username: item.username,
      email: item.email,
      role: item.role,
      mentionToken: item.username || item.email.split("@")[0],
    }));
  }

  static async getAssignableDevelopers(query?: string) {
    const normalized = (query ?? "").trim();

    const users = await prisma.user.findMany({
      where: {
        role: Role.DEVELOPER,
        ...(normalized
          ? {
              OR: [
                { username: { contains: normalized, mode: "insensitive" } },
                { email: { contains: normalized, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: [{ email: "asc" }],
      take: 100,
    });

    return users;
  }
}
