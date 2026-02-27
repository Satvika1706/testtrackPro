import api from "./axios";

export interface TestExecutionReportFilters {
  testRunId?: string;
  fromDate?: string;
  toDate?: string;
  module?: string;
  testerId?: string;
}

export interface BugReportFilters {
  fromDate?: string;
  toDate?: string;
  severity?: string;
  status?: string;
  developerId?: string;
  groupBy?: "week" | "month";
}

export interface DeveloperPerformanceFilters {
  fromDate?: string;
  toDate?: string;
  developerId?: string;
}

export interface TesterPerformanceFilters {
  fromDate?: string;
  toDate?: string;
  testRunId?: string;
  testerId?: string;
}

const toQueryParams = (
  filters:
    | TestExecutionReportFilters
    | BugReportFilters
    | DeveloperPerformanceFilters
    | TesterPerformanceFilters = {}
) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  );

export const getTestExecutionReport = (filters: TestExecutionReportFilters = {}) =>
  api.get("/reports/test-execution", {
    params: toQueryParams(filters)
  });

export const getBugReport = (filters: BugReportFilters = {}) =>
  api.get("/reports/bugs", {
    params: toQueryParams(filters)
  });

export const getDeveloperPerformanceReport = (
  filters: DeveloperPerformanceFilters = {}
) =>
  api.get("/reports/developer-performance", {
    params: toQueryParams(filters)
  });

export const getTesterPerformanceReport = (
  filters: TesterPerformanceFilters = {}
) =>
  api.get("/reports/tester-performance", {
    params: toQueryParams(filters)
  });

export const exportReport = (
  reportType:
    | "test-execution"
    | "bugs"
    | "developer-performance"
    | "tester-performance",
  filters:
    | TestExecutionReportFilters
    | BugReportFilters
    | DeveloperPerformanceFilters
    | TesterPerformanceFilters = {}
) =>
  api.get("/reports/export", {
    params: {
      reportType,
      ...toQueryParams(filters)
    },
    responseType: "blob"
  });
