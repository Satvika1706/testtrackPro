import { BugStatus, Role } from "@prisma/client";

export type WorkflowBugStatus = BugStatus | "WONT_FIX_REQUESTED";

export const BUG_WORKFLOW_TRANSITIONS: Record<
  WorkflowBugStatus,
  WorkflowBugStatus[]
> = {
  NEW: ["TRIAGE_PENDING"],
  TRIAGE_PENDING: ["TRIAGED", "DUPLICATE", "WONT_FIX"],
  TRIAGED: ["OPEN"],
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["FIXED", "WONT_FIX_REQUESTED"],
  FIXED: ["VERIFIED", "REOPENED"],
  VERIFIED: ["CLOSED"],
  REOPENED: ["IN_PROGRESS"],
  WONT_FIX_REQUESTED: ["WONT_FIX", "OPEN"],
  CLOSED: [],
  WONT_FIX: [],
  DUPLICATE: [],
  REJECTED: [],
  SOFT_DELETED: [],
};

const ROLE_ALLOWED_TARGETS: Record<Role, WorkflowBugStatus[]> = {
  TESTER: ["VERIFIED", "REOPENED"],
  DEVELOPER: [
    "IN_PROGRESS",
    "FIXED",
    "WONT_FIX_REQUESTED",
  ],
  TRIAGE: ["TRIAGED", "WONT_FIX", "DUPLICATE", "OPEN"],
  ADMIN: [
    "NEW",
    "TRIAGE_PENDING",
    "TRIAGED",
    "OPEN",
    "IN_PROGRESS",
    "FIXED",
    "VERIFIED",
    "CLOSED",
    "REOPENED",
    "WONT_FIX_REQUESTED",
    "WONT_FIX",
    "DUPLICATE",
  ],
};

export const isRole = (value: string): value is Role => {
  return value in ROLE_ALLOWED_TARGETS;
};

export const getAllowedTransitions = (
  currentStatus: WorkflowBugStatus,
  role: Role
): WorkflowBugStatus[] => {
  const nextStatuses = BUG_WORKFLOW_TRANSITIONS[currentStatus] ?? [];
  if (role === Role.ADMIN) {
    return nextStatuses;
  }

  const roleTargets = ROLE_ALLOWED_TARGETS[role] ?? [];
  return nextStatuses.filter((status) => roleTargets.includes(status));
};
