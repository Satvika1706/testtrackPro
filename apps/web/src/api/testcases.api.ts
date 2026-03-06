import api from "./axios";

export type TestCaseImportMapping = Record<string, string>;

export type TestCaseImportRow = Record<string, unknown>;

export type TestCaseImportPreviewResponse = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: Array<{
    rowNumber: number;
    errors: string[];
    data: {
      title: string;
      description: string;
      module: string;
      priority: string;
      severity: string;
      type: string;
      status: string;
      preConditions: string;
      testData: string;
      environment: string;
      steps: Array<{
        action: string;
        expectedResult: string;
      }>;
    };
  }>;
};

export const getTestCases = async () => {
  const res = await api.get("/api/test-cases");
  return res.data;
};
export const createTestCase = async (payload: any) => {
  const res = await api.post("/api/test-cases", payload);
  return res.data;
};

export const updateTestCase = async (id: string, payload: any) => {
  const res = await api.put(`/api/test-cases/${id}`, payload);
  return res.data;
};

export const cloneTestCase = async (id: string) => {
  const res = await api.post(`/api/test-cases/${id}/clone`);
  return res.data;
};
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

export const getTestCaseImportMeta = async () => {
  const res = await api.get("/api/test-cases/import/meta");
  return res.data as {
    supportedFormats: string[];
    targetFields: string[];
    requiredFields: string[];
  };
};

export const previewTestCaseImport = async (
  rows: TestCaseImportRow[],
  mapping: TestCaseImportMapping
) => {
  const res = await api.post("/api/test-cases/import/preview", { rows, mapping });
  return res.data as TestCaseImportPreviewResponse;
};

export const commitTestCaseImport = async (
  rows: TestCaseImportRow[],
  mapping: TestCaseImportMapping,
  mode: "skip_errors" | "all_or_nothing" = "skip_errors"
) => {
  const res = await api.post("/api/test-cases/import/commit", { rows, mapping, mode });
  return res.data as TestCaseImportPreviewResponse & {
    importedCount: number;
    importedIds: string[];
  };
};

