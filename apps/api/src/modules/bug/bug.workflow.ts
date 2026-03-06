import { Role } from "@prisma/client";

export type WorkflowBugStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "FIXED"
  | "VERIFIED"
  | "CLOSED"
  | "REOPENED"
  | "DUPLICATE"
  | "WONT_FIX";

export const BUG_WORKFLOW_TRANSITIONS: Record<
  WorkflowBugStatus,
  WorkflowBugStatus[]
> = {
  NEW: ["OPEN", "DUPLICATE", "WONT_FIX"],
  OPEN: ["IN_PROGRESS", "WONT_FIX"],
  IN_PROGRESS: ["FIXED"],
  FIXED: ["VERIFIED", "REOPENED"],
  VERIFIED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CLOSED: [],
  WONT_FIX: [],
  DUPLICATE: [],
};

const ROLE_ALLOWED_TARGETS: Record<Role, WorkflowBugStatus[]> = {
  TESTER: ["VERIFIED", "REOPENED", "CLOSED"],
  DEVELOPER: ["IN_PROGRESS", "FIXED", "WONT_FIX"],
  TRIAGE: ["OPEN", "DUPLICATE", "WONT_FIX"],
  ADMIN: [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "FIXED",
    "VERIFIED",
    "CLOSED",
    "REOPENED",
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
