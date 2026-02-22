import api from "./axios";

export type BugSeverity = "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "TRIVIAL";
export type BugPriority = "P1" | "P2" | "P3" | "P4";
export type BugStatus =
  | "NEW"
  | "TRIAGE_PENDING"
  | "TRIAGED"
  | "OPEN"
  | "IN_PROGRESS"
  | "FIXED"
  | "VERIFIED"
  | "CLOSED"
  | "REOPENED"
  | "WONT_FIX_REQUESTED"
  | "WONT_FIX"
  | "DUPLICATE";

export type DeveloperActionType =
  | "START_WORK"
  | "ADD_FIX_NOTES"
  | "LINK_COMMIT"
  | "MARK_FIXED"
  | "REQUEST_RETEST"
  | "WONT_FIX";

export interface BugItem {
  id: string;
  bugId: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  environment?: string | null;
  affectedVersion?: string | null;
  workStartedAt?: string | null;
  fixedAt?: string | null;
  retestRequestedAt?: string | null;
  fixNotes?: string | null;
  fixCommitRef?: string | null;
  resolutionSummary?: string | null;
  wontFixReason?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToId?: number | null;
  createdById: number;
  createdBy?: { id: number; email: string; role: string };
  assignedTo?: { id: number; email: string; role: string } | null;
  allowedTransitions?: BugStatus[];
}

export interface BugComment {
  id: string;
  bugId: string;
  parentCommentId?: string | null;
  content: string;
  contentFormat: "MARKDOWN" | "PLAIN_TEXT";
  createdById: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdBy: { id: number; email: string; role: string };
}

export interface CreateBugPayload {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: BugSeverity;
  priority: BugPriority;
  environment?: string;
  affectedVersion?: string;
  assignedToId?: number;
  linkedTestCaseId?: string;
}

export interface DeveloperActionPayload {
  action: DeveloperActionType;
  fixNotes?: string;
  commitRef?: string;
  resolutionSummary?: string;
  wontFixReason?: string;
}

export const createBug = (data: CreateBugPayload) => api.post<BugItem>("/api/bugs", data);
export const createBugFromExecution = (data: {
  executionId: string;
  failedStepId: string;
  additionalNotes?: string;
  severity: BugSeverity;
  priority: BugPriority;
  assignedToId?: number;
}) => api.post<{ bugId: string }>("/api/bugs/from-execution", data);
export const getAllBugs = () => api.get<BugItem[]>("/api/bugs");
export const getMyAssignedBugs = (params?: {
  status?: string;
  priority?: string;
  severity?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) => api.get<{ data: BugItem[] }>("/api/bugs/my", { params });
export const getBugById = (id: string) => api.get<BugItem>(`/api/bugs/${id}`);
export const updateBugStatus = (id: string, status: BugStatus) =>
  api.patch<BugItem>(`/api/bugs/${id}/status`, { status });
export const triageBug = (
  id: string,
  decision: "APPROVE" | "DUPLICATE" | "WONT_FIX" | "REJECT"
) =>
  api.patch<BugItem>(`/api/bugs/${id}/triage`, { decision });
export const assignBug = (id: string, assignedToId: number) =>
  api.patch<BugItem>(`/api/bugs/${id}/assign`, { assignedToId });
export const runDeveloperAction = (id: string, payload: DeveloperActionPayload) =>
  api.patch<BugItem>(`/api/bugs/${id}/developer-action`, payload);

export const getBugComments = (id: string) => api.get<BugComment[]>(`/api/bugs/${id}/comments`);
export const addBugComment = (
  id: string,
  payload: { content: string; parentCommentId?: string; contentFormat?: "MARKDOWN" | "PLAIN_TEXT" }
) => api.post<BugComment>(`/api/bugs/${id}/comments`, payload);
export const editBugComment = (commentId: string, content: string) =>
  api.patch<BugComment>(`/api/bugs/comments/${commentId}`, { content });
export const deleteBugComment = (commentId: string) =>
  api.delete(`/api/bugs/comments/${commentId}`);
