import api from "./axios";


export const getTestRunItem = (id: string) => {
  return api.get(`/api/test-runs/items/${id}`);
};


export const startExecution = (id: string) =>
  api.post(`/api/test-runs/items/${id}/start`);

export const pauseExecution = (id: string) =>
  api.post(`/api/test-runs/items/${id}/pause`);

export const resumeExecution = (id: string) =>
  api.post(`/api/test-runs/items/${id}/resume`);

export const completeExecution = (id: string) =>
  api.post(`/api/test-runs/items/${id}/complete`);

export const getExecutionSteps = (id: string) =>
  api.get(`/api/test-runs/items/${id}/steps`);


export const updateStepStatus = (
  stepId: string,
  status: string
) =>
  api.patch(`/api/test-runs/steps/${stepId}/status`, {
    status
  });

export const createReExecution = (id: string) =>
  api.post(`/api/test-runs/items/${id}/re-execute`);

export const getExecutionComparison = (id: string) =>
  api.get(`/api/test-runs/items/${id}/comparison`);
