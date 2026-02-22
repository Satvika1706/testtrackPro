import { z } from "zod";

export const bugStatusSchema = z.enum([
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
  "REJECTED",
  "SOFT_DELETED",
]);

export const createBugSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  stepsToReproduce: z.string().min(5),
  expectedBehavior: z.string().min(5),
  actualBehavior: z.string().min(5),
  severity: z.enum(["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "TRIVIAL"]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  environment: z.string().optional(),
  affectedVersion: z.string().optional(),
  assignedToId: z.number().optional(),
  linkedTestCaseId: z.string().optional(),
});

export const developerActionSchema = z.object({
  action: z.enum([
    "START_WORK",
    "ADD_FIX_NOTES",
    "LINK_COMMIT",
    "MARK_FIXED",
    "REQUEST_RETEST",
    "WONT_FIX",
  ]),
  fixNotes: z.string().min(5).optional(),
  commitRef: z.string().min(3).optional(),
  resolutionSummary: z.string().min(5).optional(),
  wontFixReason: z.string().min(5).optional(),
});

export const createBugCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional(),
  contentFormat: z.enum(["MARKDOWN", "PLAIN_TEXT"]).optional(),
});

export const updateBugCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const createBugFromExecutionSchema = z.object({
  executionId: z.string().uuid(),
  failedStepId: z.string().uuid(),
  additionalNotes: z.string().optional(),
  severity: z.enum(["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "TRIVIAL"]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  assignedToId: z.number().optional(),
});

export const updateBugStatusSchema = z.object({
  status: bugStatusSchema,
});

export const softDeleteBugSchema = z.object({
  status: z.enum(["REJECTED", "SOFT_DELETED"]),
  deletionReason: z.string().min(5).max(500),
});

export const triageDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "DUPLICATE", "WONT_FIX", "REJECT"]),
});
