import api from "./axios";

// GET ALL TEST CASES
export const getTestCases = async () => {
  const res = await api.get("/api/test-cases");
  return res.data;
};

// CREATE TEST CASE
export const createTestCase = async (payload: any) => {
  const res = await api.post("/api/", payload);
  return res.data;
};

// UPDATE TEST CASE
export const updateTestCase = async (id: string, payload: any) => {
  const res = await api.put(`/api/${id}`, payload);
  return res.data;
};

// CLONE TEST CASE
export const cloneTestCase = async (id: string) => {
  const res = await api.post(`/api/test-cases/${id}/clone`);
  return res.data;
};

// SOFT DELETE TEST CASE
export const deleteTestCase = async (id: string) => {
  const res = await api.delete(`/api/test-cases/${id}`);
  return res.data;
};

export const saveTestCaseAsTemplate = (
  testCaseId: string,
  data: {
    name: string;
    category: string;
    description?: string;
  }
) => {
  return api.post(
    `/api/test-cases/${testCaseId}/template`,
    data
  );
};
export const getTestCaseTemplates = () => {
  return api.get("/api/test-case-templates").then(res => res.data);
};

