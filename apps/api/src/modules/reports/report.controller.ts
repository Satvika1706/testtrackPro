import { Response } from "express";
import { Role } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  exportDeveloperPerformanceReportCsv,
  exportBugsReportCsv,
  exportTesterPerformanceReportCsv,
  exportTestExecutionReportCsv,
  getBugsReport,
  getDeveloperPerformanceReport,
  getTesterPerformanceReport,
  getTestExecutionReport
} from "./report.service";

const parseDate = (value: unknown) => {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseTesterId = (value: unknown) => {
  if (!value || typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseGroupBy = (value: unknown): "week" | "month" => {
  if (value === "week") return "week";
  return "month";
};

const extractFilters = (query: AuthRequest["query"]) => {
  const toDate = parseDate(query.toDate);
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return {
    testRunId:
      typeof query.testRunId === "string" && query.testRunId
        ? query.testRunId
        : undefined,
    fromDate: parseDate(query.fromDate),
    toDate,
    module:
      typeof query.module === "string" && query.module
        ? query.module
        : undefined,
    testerId: parseTesterId(query.testerId)
  };
};

export const getTestExecutionReportHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const data = await getTestExecutionReport(extractFilters(req.query));

    return res.status(200).json({
      message: "Test execution report fetched successfully",
      data
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message ?? "Failed to fetch test execution report"
    });
  }
};

export const getBugsReportHandler = async (_req: AuthRequest, res: Response) =>
  {
    try {
      const toDate = parseDate(_req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const developerId = parseTesterId(_req.query.developerId);
      const data = await getBugsReport({
        fromDate: parseDate(_req.query.fromDate),
        toDate,
        severity:
          typeof _req.query.severity === "string" && _req.query.severity
            ? _req.query.severity
            : undefined,
        status:
          typeof _req.query.status === "string" && _req.query.status
            ? _req.query.status
            : undefined,
        developerId,
        groupBy: parseGroupBy(_req.query.groupBy)
      });

      return res.status(200).json({
        message: "Bug report fetched successfully",
        data
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message ?? "Failed to fetch bug report"
      });
    }
  };

export const getDeveloperPerformanceReportHandler = async (
  req: AuthRequest,
  res: Response
) =>
  {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!["ADMIN", "DEVELOPER"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Developer performance report is restricted to ADMIN and DEVELOPER roles"
        });
      }

      const toDate = parseDate(req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const requestedDeveloperId = parseTesterId(req.query.developerId);
      const developerId =
        req.user.role === "DEVELOPER" ? req.user.userId : requestedDeveloperId;

      const data = await getDeveloperPerformanceReport({
        fromDate: parseDate(req.query.fromDate),
        toDate,
        developerId,
        viewerRole: req.user.role as Role,
        viewerUserId: req.user.userId
      });

      return res.status(200).json({
        message: "Developer performance report fetched successfully",
        data
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message ?? "Failed to fetch developer performance report"
      });
    }
  };

export const getTesterPerformanceReportHandler = async (
  req: AuthRequest,
  res: Response
) =>
  {
    try {
      const toDate = parseDate(req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const data = await getTesterPerformanceReport({
        fromDate: parseDate(req.query.fromDate),
        toDate,
        testRunId:
          typeof req.query.testRunId === "string" && req.query.testRunId
            ? req.query.testRunId
            : undefined,
        testerId: parseTesterId(req.query.testerId)
      });

      return res.status(200).json({
        message: "Tester performance report fetched successfully",
        data
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message ?? "Failed to fetch tester performance report"
      });
    }
  };

export const exportReportHandler = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const reportType =
      typeof req.query.reportType === "string"
        ? req.query.reportType
        : "test-execution";

    const reportDate = new Date().toISOString().slice(0, 10);
    let csv = "";
    let filename = "";

    if (reportType === "test-execution") {
      csv = await exportTestExecutionReportCsv(extractFilters(req.query));
      filename = `test-execution-report-${reportDate}.csv`;
    } else if (reportType === "bugs") {
      const toDate = parseDate(req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
      csv = await exportBugsReportCsv({
        fromDate: parseDate(req.query.fromDate),
        toDate,
        severity:
          typeof req.query.severity === "string" && req.query.severity
            ? req.query.severity
            : undefined,
        status:
          typeof req.query.status === "string" && req.query.status
            ? req.query.status
            : undefined,
        developerId: parseTesterId(req.query.developerId),
        groupBy: parseGroupBy(req.query.groupBy)
      });
      filename = `bug-report-${reportDate}.csv`;
    } else if (reportType === "developer-performance") {
      if (!["ADMIN", "DEVELOPER"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Developer performance export is restricted to ADMIN and DEVELOPER roles"
        });
      }

      const toDate = parseDate(req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
      csv = await exportDeveloperPerformanceReportCsv({
        fromDate: parseDate(req.query.fromDate),
        toDate,
        developerId:
          req.user.role === "DEVELOPER"
            ? req.user.userId
            : parseTesterId(req.query.developerId),
        viewerRole: req.user.role as Role,
        viewerUserId: req.user.userId
      });
      filename = `developer-performance-report-${reportDate}.csv`;
    } else if (reportType === "tester-performance") {
      if (req.user.role === "DEVELOPER") {
        return res.status(403).json({
          message: "Tester performance export is not available for DEVELOPER role"
        });
      }

      const toDate = parseDate(req.query.toDate);
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
      csv = await exportTesterPerformanceReportCsv({
        fromDate: parseDate(req.query.fromDate),
        toDate,
        testRunId:
          typeof req.query.testRunId === "string" && req.query.testRunId
            ? req.query.testRunId
            : undefined,
        testerId: parseTesterId(req.query.testerId)
      });
      filename = `tester-performance-report-${reportDate}.csv`;
    } else {
      return res.status(400).json({
        message:
          "Unsupported reportType. Allowed: test-execution, bugs, developer-performance, tester-performance"
      });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(csv);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message ?? "Failed to export report"
    });
  }
};
