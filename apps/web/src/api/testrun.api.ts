import api from "./axios";

export const getAllTestRuns = () =>
  api.get("/api/test-runs");


export const getTestRun = (id: string) =>
  api.get(`/api/test-runs/${id}`);

export const getRunProgress = (id: string) =>
  api.get(`/api/test-runs/${id}/progress`);

export const getTestRunItems = (id: string) =>
  api.get(`/api/test-runs/${id}/items`);

export const createTestRun = (data: {
  name: string;
  description?: string;
  testCaseIds: string[];
}) => api.post("/api/test-runs", data);
