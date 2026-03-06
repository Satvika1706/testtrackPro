import api from "./axios";

export type Project = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  config?: Record<string, unknown> | null;
  isArchived: boolean;
};

export type Milestone = {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  dueDate?: string | null;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
};

export type CustomField = {
  id: string;
  entityType: "TEST_CASE" | "TEST_SUITE" | "TEST_RUN" | "BUG";
  name: string;
  fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT";
  required: boolean;
  options?: string[] | null;
  defaultValue?: string | null;
};

export type ProjectOverview = {
  testCasesCount: number;
  bugsCount: number;
  testRunsCount: number;
  milestonesCount: number;
};

export const getProjects = async () => {
  const res = await api.get("/api/projects");
  return (res.data?.data || []) as Project[];
};

export const createProject = async (payload: {
  key: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}) => {
  const res = await api.post("/api/projects", payload);
  return res.data?.data as Project;
};

export const updateProject = async (
  id: string,
  payload: Partial<Pick<Project, "name" | "description" | "isArchived" | "config">>
) => {
  const res = await api.patch(`/api/projects/${id}`, payload);
  return res.data?.data as Project;
};

export const updateProjectConfig = async (
  id: string,
  config: Record<string, unknown>
) => {
  const res = await api.put(`/api/projects/${id}/config`, { config });
  return res.data?.data as Project;
};

export const getProjectOverview = async (projectId: string) => {
  const res = await api.get(`/api/projects/${projectId}/overview`);
  return res.data?.data as ProjectOverview;
};

export const getProjectMilestones = async (projectId: string) => {
  const res = await api.get(`/api/projects/${projectId}/milestones`);
  return (res.data?.data || []) as Milestone[];
};

export const createProjectMilestone = async (
  projectId: string,
  payload: {
    name: string;
    description?: string;
    status?: "PLANNED" | "ACTIVE" | "COMPLETED";
    startDate?: string;
    targetDate?: string;
    dueDate?: string;
  }
) => {
  const res = await api.post(`/api/projects/${projectId}/milestones`, payload);
  return res.data?.data as Milestone;
};

export const getProjectCustomFields = async (projectId: string) => {
  const res = await api.get(`/api/projects/${projectId}/custom-fields`);
  return (res.data?.data || []) as CustomField[];
};

export const createProjectCustomField = async (
  projectId: string,
  payload: {
    entityType: "TEST_CASE" | "TEST_SUITE" | "TEST_RUN" | "BUG";
    name: string;
    fieldType: "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "SELECT";
    required?: boolean;
    options?: string[];
    defaultValue?: string;
  }
) => {
  const res = await api.post(`/api/projects/${projectId}/custom-fields`, payload);
  return res.data?.data as CustomField;
};

export const mapRunToMilestone = async (runId: string, milestoneId: string | null) => {
  const res = await api.patch(`/api/test-runs/${runId}/milestone`, { milestoneId });
  return res.data?.data;
};
