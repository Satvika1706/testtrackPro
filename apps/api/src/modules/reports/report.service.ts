import { prisma } from "../../prisma";
import { BugSeverity, BugStatus, Prisma, Role } from "@prisma/client";

export interface TestExecutionReportFilters {
  testRunId?: string;
  fromDate?: Date;
  toDate?: Date;
  module?: string;
  testerId?: number;
}

export interface BugReportFilters {
  fromDate?: Date;
  toDate?: Date;
  severity?: string;
  status?: string;
  developerId?: number;
  groupBy?: "week" | "month";
}

export interface DeveloperPerformanceFilters {
  fromDate?: Date;
  toDate?: Date;
  developerId?: number;
  viewerRole: Role;
  viewerUserId: number;
}

export interface TesterPerformanceFilters {
  fromDate?: Date;
  toDate?: Date;
  testRunId?: string;
  testerId?: number;
}

interface StatusCounts {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  inProgress: number;
}

const toDateOnlyKey = (value: Date) => value.toISOString().slice(0, 10);

const toCsvCell = (value: string | number) => {
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
};

const roundToTwo = (value: number) => Math.round(value * 100) / 100;
const clampPercentage = (value: number) =>
  Math.min(100, Math.max(0, value));
const computePercentage = (numerator: number, denominator: number) => {
  if (denominator <= 0) return 0;
  return roundToTwo(clampPercentage((numerator / denominator) * 100));
};

const getIsoWeek = (date: Date) => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const OVERDUE_BUG_DAYS = 7;

const TERMINAL_BUG_STATUSES = new Set(["CLOSED", "WONT_FIX", "DUPLICATE"]);
const RESOLVED_BUG_STATUSES = new Set(["CLOSED", "WONT_FIX", "DUPLICATE", "VERIFIED", "FIXED"]);
const BUG_SEVERITY_VALUES = Object.values(BugSeverity);
const BUG_STATUS_VALUES = Object.values(BugStatus);
const EXECUTED_TEST_RUN_ITEM_STATUSES = new Set([
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED"
]);

export const getTestExecutionReport = async (
  filters: TestExecutionReportFilters
) => {
  const where: Prisma.TestRunItemWhereInput = {};

  if (filters.testRunId) {
    where.testRunId = filters.testRunId;
  }

  if (typeof filters.testerId === "number") {
    where.assignedToId = filters.testerId;
  }

  if (filters.module) {
    where.testCase = { module: filters.module };
  }

  if (filters.fromDate || filters.toDate) {
    const startedAt: { gte?: Date; lte?: Date } = {};
    const completedAt: { gte?: Date; lte?: Date } = {};

    if (filters.fromDate) {
      startedAt.gte = filters.fromDate;
      completedAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      startedAt.lte = filters.toDate;
      completedAt.lte = filters.toDate;
    }

    where.OR = [{ startedAt }, { completedAt }];
  }

  const items = await prisma.testRunItem.findMany({
    where,
    include: {
      testRun: {
        select: {
          id: true,
          name: true
        }
      },
      testCase: {
        select: {
          id: true,
          testCaseId: true,
          title: true,
          module: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          email: true
        }
      }
    },
    orderBy: {
      startedAt: "asc"
    }
  });

  const statusCounts: StatusCounts = {
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    inProgress: 0
  };

  const timelineMap = new Map<string, number>();
  const moduleMap = new Map<string, number>();
  const testerMap = new Map<
    string,
    {
      testerId: number | null;
      testerName: string;
      passed: number;
      failed: number;
      blocked: number;
      skipped: number;
      inProgress: number;
    }
  >();

  const failedDetails = [] as Array<{
    testRunId: string;
    testRunName: string;
    testCaseId: string;
    title: string;
    module: string;
    testerId: number | null;
    testerName: string;
    completedAt: string | null;
    status: "FAILED";
  }>;

  for (const item of items) {
    const executionDate = item.completedAt ?? item.startedAt;
    if (executionDate) {
      const dateKey = toDateOnlyKey(executionDate);
      timelineMap.set(dateKey, (timelineMap.get(dateKey) ?? 0) + 1);
    }

    const moduleName = item.testCase.module || "Unspecified";
    moduleMap.set(moduleName, (moduleMap.get(moduleName) ?? 0) + 1);

    const testerName = item.assignedTo?.email ?? "Unassigned";
    const testerId = item.assignedTo?.id ?? null;
    const testerKey = testerId ? `tester-${testerId}` : "tester-unassigned";

    if (!testerMap.has(testerKey)) {
      testerMap.set(testerKey, {
        testerId,
        testerName,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        inProgress: 0
      });
    }

    const tester = testerMap.get(testerKey)!;

    if (item.status === "PASSED") {
      statusCounts.passed += 1;
      tester.passed += 1;
    } else if (item.status === "FAILED") {
      statusCounts.failed += 1;
      tester.failed += 1;

      failedDetails.push({
        testRunId: item.testRun.id,
        testRunName: item.testRun.name,
        testCaseId: item.testCase.testCaseId ?? item.testCase.id,
        title: item.testCase.title,
        module: item.testCase.module,
        testerId: testerId,
        testerName,
        completedAt: item.completedAt ? item.completedAt.toISOString() : null,
        status: "FAILED"
      });
    } else if (item.status === "BLOCKED") {
      statusCounts.blocked += 1;
      tester.blocked += 1;
    } else if (item.status === "IN_PROGRESS") {
      statusCounts.inProgress += 1;
      tester.inProgress += 1;
    }
  }

  const totalTestCases = items.length;
  const executed =
    statusCounts.passed +
    statusCounts.failed +
    statusCounts.blocked +
    statusCounts.skipped;
  const completionPercentage = totalTestCases
    ? (executed / totalTestCases) * 100
    : 0;
  const passRatePercentage = executed
    ? (statusCounts.passed / executed) * 100
    : 0;

  const timeline = [...timelineMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const moduleBreakdown = [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, executedCount]) => ({
      module: name,
      executed: executedCount
    }));

  const testerBreakdown = [...testerMap.values()].sort((a, b) =>
    a.testerName.localeCompare(b.testerName)
  );

  const [runs, testers, modules] = await Promise.all([
    prisma.testRun.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.findMany({
      where: {
        role: "TESTER"
      },
      select: {
        id: true,
        email: true
      },
      orderBy: { email: "asc" }
    }),
    prisma.testCase.findMany({
      where: {
        module: {
          not: ""
        }
      },
      select: {
        module: true
      },
      distinct: ["module"],
      orderBy: { module: "asc" }
    })
  ]);

  return {
    filters: {
      selected: {
        testRunId: filters.testRunId ?? null,
        fromDate: filters.fromDate ? filters.fromDate.toISOString() : null,
        toDate: filters.toDate ? filters.toDate.toISOString() : null,
        module: filters.module ?? null,
        testerId: filters.testerId ?? null
      },
      options: {
        testRuns: runs,
        testers,
        modules: modules.map((entry) => entry.module).filter(Boolean)
      }
    },
    kpis: {
      totalTestCases,
      executed,
      passed: statusCounts.passed,
      failed: statusCounts.failed,
      blocked: statusCounts.blocked,
      skipped: statusCounts.skipped,
      inProgress: statusCounts.inProgress,
      completionPercentage,
      passRatePercentage
    },
    charts: {
      executionTimeline: timeline,
      statusBreakdown: [
        { status: "PASSED", count: statusCounts.passed },
        { status: "FAILED", count: statusCounts.failed },
        { status: "BLOCKED", count: statusCounts.blocked },
        { status: "SKIPPED", count: statusCounts.skipped },
        { status: "IN_PROGRESS", count: statusCounts.inProgress }
      ],
      executionByTester: testerBreakdown,
      executionByModule: moduleBreakdown
    },
    tables: {
      failedTestCases: failedDetails
    }
  };
};

export const exportTestExecutionReportCsv = async (
  filters: TestExecutionReportFilters
) => {
  const report = await getTestExecutionReport(filters);

  const lines: string[] = [];
  lines.push("Metric,Value");
  lines.push(`Total Test Cases,${report.kpis.totalTestCases}`);
  lines.push(`Executed,${report.kpis.executed}`);
  lines.push(`Passed,${report.kpis.passed}`);
  lines.push(`Failed,${report.kpis.failed}`);
  lines.push(`Blocked,${report.kpis.blocked}`);
  lines.push(`Skipped,${report.kpis.skipped}`);
  lines.push(`In Progress,${report.kpis.inProgress}`);
  lines.push(
    `Completion %,${report.kpis.completionPercentage.toFixed(2)}`
  );
  lines.push(`Pass Rate %,${report.kpis.passRatePercentage.toFixed(2)}`);
  lines.push("");

  lines.push("Failed Test Cases");
  lines.push(
    "Test Run,Test Case ID,Title,Module,Tester,Completed At,Status"
  );

  for (const failed of report.tables.failedTestCases) {
    lines.push(
      [
        failed.testRunName,
        failed.testCaseId,
        failed.title,
        failed.module,
        failed.testerName,
        failed.completedAt ?? "",
        failed.status
      ]
        .map((entry) => toCsvCell(entry))
        .join(",")
    );
  }

  return lines.join("\n");
};

export const getBugsReport = async (filters: BugReportFilters) => {
  const where: Prisma.BugWhereInput = {
    status: {
      notIn: ["SOFT_DELETED", "REJECTED"]
    }
  };

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      where.createdAt.gte = filters.fromDate;
    }
    if (filters.toDate) {
      where.createdAt.lte = filters.toDate;
    }
  }

  if (filters.severity && BUG_SEVERITY_VALUES.includes(filters.severity as BugSeverity)) {
    where.severity = filters.severity as BugSeverity;
  }

  if (filters.status && BUG_STATUS_VALUES.includes(filters.status as BugStatus)) {
    where.status = filters.status as BugStatus;
  }

  if (typeof filters.developerId === "number") {
    where.assignedToId = filters.developerId;
  }

  const bugs = await prisma.bug.findMany({
    where,
    select: {
      id: true,
      bugId: true,
      title: true,
      severity: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      fixedAt: true,
      assignedTo: {
        select: {
          id: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const now = new Date();
  const groupBy = filters.groupBy ?? "month";

  const trendMap = new Map<string, number>();
  const severityMap = new Map<string, number>();
  const developerMap = new Map<string, { developerId: number | null; developerName: string; count: number }>();
  const statusMap = new Map<string, number>();

  const agingRows: Array<{
    bugId: string;
    title: string;
    severity: string;
    status: string;
    developerId: number | null;
    developerName: string;
    createdAt: string;
    ageDays: number;
  }> = [];

  const highSeverityRows: Array<{
    bugId: string;
    title: string;
    severity: string;
    status: string;
    developerId: number | null;
    developerName: string;
    createdAt: string;
    resolutionTimeHours: number | null;
  }> = [];

  let openBugs = 0;
  let closedBugs = 0;
  let reopenedBugs = 0;
  let overdueBugs = 0;
  let resolutionCount = 0;
  let resolutionHoursTotal = 0;

  for (const bug of bugs) {
    const trendKey = groupBy === "week" ? getIsoWeek(bug.createdAt) : getMonthKey(bug.createdAt);
    trendMap.set(trendKey, (trendMap.get(trendKey) ?? 0) + 1);

    const severityKey = bug.severity;
    severityMap.set(severityKey, (severityMap.get(severityKey) ?? 0) + 1);

    const statusKey = bug.status;
    statusMap.set(statusKey, (statusMap.get(statusKey) ?? 0) + 1);

    const developerId = bug.assignedTo?.id ?? null;
    const developerName = bug.assignedTo?.email ?? "Unassigned";
    const developerKey = developerId ? `dev-${developerId}` : "dev-unassigned";

    if (!developerMap.has(developerKey)) {
      developerMap.set(developerKey, {
        developerId,
        developerName,
        count: 0
      });
    }
    developerMap.get(developerKey)!.count += 1;

    const ageDays = Math.floor((now.getTime() - bug.createdAt.getTime()) / 86400000);
    const isClosed = TERMINAL_BUG_STATUSES.has(bug.status);
    if (isClosed) {
      closedBugs += 1;
    } else {
      openBugs += 1;
      if (ageDays > OVERDUE_BUG_DAYS) {
        overdueBugs += 1;
      }
      agingRows.push({
        bugId: bug.bugId,
        title: bug.title,
        severity: bug.severity,
        status: bug.status,
        developerId,
        developerName,
        createdAt: bug.createdAt.toISOString(),
        ageDays
      });
    }

    if (bug.status === "REOPENED") {
      reopenedBugs += 1;
    }

    const resolvedAt =
      bug.fixedAt ??
      (RESOLVED_BUG_STATUSES.has(bug.status) ? bug.updatedAt : null);
    if (resolvedAt) {
      const resolutionHours =
        (resolvedAt.getTime() - bug.createdAt.getTime()) / 3600000;
      if (resolutionHours >= 0) {
        resolutionHoursTotal += resolutionHours;
        resolutionCount += 1;
      }
    }

    if (bug.severity === "BLOCKER" || bug.severity === "CRITICAL") {
      highSeverityRows.push({
        bugId: bug.bugId,
        title: bug.title,
        severity: bug.severity,
        status: bug.status,
        developerId,
        developerName,
        createdAt: bug.createdAt.toISOString(),
        resolutionTimeHours: resolvedAt
          ? (resolvedAt.getTime() - bug.createdAt.getTime()) / 3600000
          : null
      });
    }
  }

  agingRows.sort((a, b) => b.ageDays - a.ageDays);
  highSeverityRows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const [developers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DEVELOPER" },
      select: { id: true, email: true },
      orderBy: { email: "asc" }
    })
  ]);

  return {
    filters: {
      selected: {
        fromDate: filters.fromDate ? filters.fromDate.toISOString() : null,
        toDate: filters.toDate ? filters.toDate.toISOString() : null,
        severity: filters.severity ?? null,
        status: filters.status ?? null,
        developerId: filters.developerId ?? null,
        groupBy
      },
      options: {
        severities: ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "TRIVIAL"],
        statuses: [
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
          "DUPLICATE"
        ],
        developers
      }
    },
    kpis: {
      totalBugs: bugs.length,
      openBugs,
      closedBugs,
      reopenedBugs,
      averageResolutionTimeHours:
        resolutionCount > 0 ? resolutionHoursTotal / resolutionCount : 0,
      overdueBugs
    },
    metrics: {
      bugAgingDefinition: "Current Date - createdAt",
      resolutionTimeDefinition: "resolvedAt - createdAt"
    },
    charts: {
      bugTrendOverTime: [...trendMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, count]) => ({ period, count })),
      severityDistribution: [...severityMap.entries()].map(([severity, count]) => ({
        severity,
        count
      })),
      bugsByDeveloper: [...developerMap.values()].sort((a, b) =>
        a.developerName.localeCompare(b.developerName)
      ),
      statusDistribution: [...statusMap.entries()].map(([status, count]) => ({
        status,
        count
      }))
    },
    tables: {
      agingBugs: agingRows,
      highSeverityBugs: highSeverityRows
    }
  };
};

export const exportBugsReportCsv = async (filters: BugReportFilters) => {
  const report = await getBugsReport(filters);

  const lines: string[] = [];
  lines.push("Metric,Value");
  lines.push(`Total Bugs,${report.kpis.totalBugs}`);
  lines.push(`Open Bugs,${report.kpis.openBugs}`);
  lines.push(`Closed Bugs,${report.kpis.closedBugs}`);
  lines.push(`Reopened Bugs,${report.kpis.reopenedBugs}`);
  lines.push(
    `Average Resolution Time (Hours),${report.kpis.averageResolutionTimeHours.toFixed(2)}`
  );
  lines.push(`Overdue Bugs,${report.kpis.overdueBugs}`);
  lines.push("");

  lines.push("Aging Bugs");
  lines.push("Bug ID,Title,Severity,Status,Developer,Created At,Age (Days)");
  for (const row of report.tables.agingBugs) {
    lines.push(
      [
        row.bugId,
        row.title,
        row.severity,
        row.status,
        row.developerName,
        row.createdAt,
        row.ageDays
      ]
        .map((value) => toCsvCell(value))
        .join(",")
    );
  }
  lines.push("");

  lines.push("High Severity Bugs");
  lines.push(
    "Bug ID,Title,Severity,Status,Developer,Created At,Resolution Time (Hours)"
  );
  for (const row of report.tables.highSeverityBugs) {
    lines.push(
      [
        row.bugId,
        row.title,
        row.severity,
        row.status,
        row.developerName,
        row.createdAt,
        row.resolutionTimeHours?.toFixed(2) ?? ""
      ]
        .map((value) => toCsvCell(value))
        .join(",")
    );
  }

  return lines.join("\n");
};

export const getDeveloperPerformanceReport = async (
  filters: DeveloperPerformanceFilters
) => {
  const activeStatuses = new Set<BugStatus>([
    BugStatus.NEW,
    BugStatus.TRIAGE_PENDING,
    BugStatus.TRIAGED,
    BugStatus.OPEN,
    BugStatus.IN_PROGRESS,
    BugStatus.REOPENED,
    BugStatus.FIXED,
    BugStatus.VERIFIED,
    BugStatus.WONT_FIX_REQUESTED,
  ]);

  const selectedDeveloperId =
    filters.viewerRole === Role.DEVELOPER
      ? filters.viewerUserId
      : filters.developerId;

  const where: Prisma.BugWhereInput = {
    status: { notIn: [BugStatus.SOFT_DELETED, BugStatus.REJECTED] },
    assignedToId: { not: null },
  };

  if (typeof selectedDeveloperId === "number") {
    where.assignedToId = selectedDeveloperId;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) where.createdAt.gte = filters.fromDate;
    if (filters.toDate) where.createdAt.lte = filters.toDate;
  }

  const [bugs, allProjectBugs, developerOptions] = await Promise.all([
    prisma.bug.findMany({
      where,
      select: {
        id: true,
        bugId: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        workStartedAt: true,
        fixedAt: true,
        assignedToId: true,
        assignedTo: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bug.findMany({
      where: {
        status: { notIn: [BugStatus.SOFT_DELETED, BugStatus.REJECTED] },
        ...(filters.fromDate || filters.toDate
          ? {
              createdAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        fixedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: Role.DEVELOPER },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  type AggregateStats = {
    developerId: number;
    developerName: string;
    assigned: number;
    resolved: number;
    reopened: number;
    resolutionHoursTotal: number;
    resolutionCount: number;
  };

  const map = new Map<number, AggregateStats>();
  const personalWeekly = new Map<string, number>();
  const now = new Date();

  let personalResolved = 0;
  let personalOpen = 0;
  let personalOverdue = 0;
  let personalCriticalOpen = 0;
  let personalReopened = 0;
  let personalReopenedAfterFix = 0;
  let personalWontFix = 0;
  let personalResolutionHoursTotal = 0;
  let personalResolutionCount = 0;
  let startWorkHoursTotal = 0;
  let startWorkCount = 0;
  let fixHoursTotal = 0;
  let fixCount = 0;

  const agingBuckets = {
    "0-3": 0,
    "4-7": 0,
    "8-14": 0,
    "15+": 0,
  };

  const oldestOpen: Array<{
    id: string;
    bugId: string;
    title: string;
    status: string;
    severity: string;
    ageDays: number;
    createdAt: string;
  }> = [];

  for (const bug of bugs) {
    if (!bug.assignedToId || !bug.assignedTo) continue;

    if (!map.has(bug.assignedToId)) {
      map.set(bug.assignedToId, {
        developerId: bug.assignedToId,
        developerName: bug.assignedTo.email,
        assigned: 0,
        resolved: 0,
        reopened: 0,
        resolutionHoursTotal: 0,
        resolutionCount: 0,
      });
    }

    const row = map.get(bug.assignedToId)!;
    row.assigned += 1;

    const resolvedAt =
      bug.fixedAt ??
      (RESOLVED_BUG_STATUSES.has(bug.status) ? bug.updatedAt : null);
    const isResolved = Boolean(resolvedAt);

    if (isResolved) {
      row.resolved += 1;
      const hours = (resolvedAt!.getTime() - bug.createdAt.getTime()) / 3600000;
      if (hours >= 0) {
        row.resolutionHoursTotal += hours;
        row.resolutionCount += 1;
      }
    }

    if (bug.status === BugStatus.REOPENED) {
      row.reopened += 1;
    }

    const isPersonal = bug.assignedToId === selectedDeveloperId;
    if (!isPersonal) continue;

    if (isResolved) {
      personalResolved += 1;

      const resolutionHours =
        (resolvedAt!.getTime() - bug.createdAt.getTime()) / 3600000;
      if (resolutionHours >= 0) {
        personalResolutionHoursTotal += resolutionHours;
        personalResolutionCount += 1;
      }

      const weekKey = getIsoWeek(resolvedAt!);
      personalWeekly.set(weekKey, (personalWeekly.get(weekKey) ?? 0) + 1);
    }

    if (activeStatuses.has(bug.status)) {
      personalOpen += 1;
      const ageDays = Math.floor((now.getTime() - bug.createdAt.getTime()) / 86400000);
      if (ageDays > OVERDUE_BUG_DAYS) personalOverdue += 1;

      if (bug.severity === BugSeverity.BLOCKER || bug.severity === BugSeverity.CRITICAL) {
        personalCriticalOpen += 1;
      }

      if (ageDays <= 3) agingBuckets["0-3"] += 1;
      else if (ageDays <= 7) agingBuckets["4-7"] += 1;
      else if (ageDays <= 14) agingBuckets["8-14"] += 1;
      else agingBuckets["15+"] += 1;

      oldestOpen.push({
        id: bug.id,
        bugId: bug.bugId,
        title: bug.title,
        status: bug.status,
        severity: bug.severity,
        ageDays,
        createdAt: bug.createdAt.toISOString(),
      });
    }

    if (bug.status === BugStatus.REOPENED) {
      personalReopened += 1;
      if (bug.fixedAt) {
        personalReopenedAfterFix += 1;
      }
    }

    if (bug.status === BugStatus.WONT_FIX || bug.status === BugStatus.WONT_FIX_REQUESTED) {
      personalWontFix += 1;
    }

    if (bug.workStartedAt) {
      const startHours = (bug.workStartedAt.getTime() - bug.createdAt.getTime()) / 3600000;
      if (startHours >= 0) {
        startWorkHoursTotal += startHours;
        startWorkCount += 1;
      }
    }

    if (bug.workStartedAt && bug.fixedAt) {
      const fixHours = (bug.fixedAt.getTime() - bug.workStartedAt.getTime()) / 3600000;
      if (fixHours >= 0) {
        fixHoursTotal += fixHours;
        fixCount += 1;
      }
    }
  }

  const byDeveloper = [...map.values()]
    .sort((a, b) => a.developerName.localeCompare(b.developerName))
    .map((entry) => ({
      developerId: entry.developerId,
      developerName: entry.developerName,
      assigned: entry.assigned,
      resolved: entry.resolved,
      averageResolutionTimeHours:
        entry.resolutionCount > 0
          ? roundToTwo(entry.resolutionHoursTotal / entry.resolutionCount)
          : 0,
      reopenRatePercentage: computePercentage(entry.reopened, entry.resolved),
    }));

  const projectResolved = allProjectBugs.filter((bug) =>
    RESOLVED_BUG_STATUSES.has(bug.status)
  ).length;
  const projectResolutionRows = allProjectBugs
    .map((bug) => {
      const resolvedAt =
        bug.fixedAt ??
        (RESOLVED_BUG_STATUSES.has(bug.status) ? bug.updatedAt : null);
      if (!resolvedAt) return null;
      const diff = (resolvedAt.getTime() - bug.createdAt.getTime()) / 3600000;
      return diff >= 0 ? diff : null;
    })
    .filter((value): value is number => value !== null);
  const projectReopened = allProjectBugs.filter(
    (bug) => bug.status === BugStatus.REOPENED
  ).length;

  oldestOpen.sort((a, b) => b.ageDays - a.ageDays);

  const personalAssignedCount = bugs.filter(
    (bug) => bug.assignedToId === selectedDeveloperId
  ).length;

  return {
    viewer: {
      role: filters.viewerRole,
      userId: filters.viewerUserId,
      developerMode: filters.viewerRole === Role.DEVELOPER,
    },
    filters: {
      selected: {
        fromDate: filters.fromDate ? filters.fromDate.toISOString() : null,
        toDate: filters.toDate ? filters.toDate.toISOString() : null,
        developerId: selectedDeveloperId ?? null,
      },
      options: {
        developers: developerOptions,
      },
    },
    personal: {
      overview: {
        totalAssigned: personalAssignedCount,
        totalResolved: personalResolved,
        openBugs: personalOpen,
        criticalOrBlockerOpen: personalCriticalOpen,
        overdueBugs: personalOverdue,
        averageResolutionTimeHours:
          personalResolutionCount > 0
            ? roundToTwo(personalResolutionHoursTotal / personalResolutionCount)
            : 0,
        reopenRatePercentage: computePercentage(personalReopened, personalResolved),
      },
      efficiency: {
        averageTimeToStartHours:
          startWorkCount > 0 ? roundToTwo(startWorkHoursTotal / startWorkCount) : 0,
        averageFixTimeHours: fixCount > 0 ? roundToTwo(fixHoursTotal / fixCount) : 0,
        weeklyResolutionTrend: [...personalWeekly.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, resolved]) => ({ week, resolved })),
        throughputPerWeek: [...personalWeekly.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, resolved]) => ({ week, resolved })),
      },
      quality: {
        reopenCount: personalReopened,
        reopenPercentage: computePercentage(personalReopened, personalResolved),
        bugsReopenedAfterFix: personalReopenedAfterFix,
        wontFixPercentage: computePercentage(personalWontFix, personalAssignedCount),
        fixQualityScore: roundToTwo(
          100 - computePercentage(personalReopened, personalResolved)
        ),
      },
      agingAndRisk: {
        buckets: agingBuckets,
        topOldestOpenBugs: oldestOpen.slice(0, 5),
      },
    },
    project: {
      totalBugs: allProjectBugs.length,
      totalResolved: projectResolved,
      resolutionRatePercentage: computePercentage(projectResolved, allProjectBugs.length),
      averageResolutionTimeHours:
        projectResolutionRows.length > 0
          ? roundToTwo(
              projectResolutionRows.reduce((sum, item) => sum + item, 0) /
                projectResolutionRows.length
            )
          : 0,
      reopenRatePercentage: computePercentage(projectReopened, projectResolved),
      sprintHealth: {
        status: "NOT_AVAILABLE",
        note: "Sprint health requires milestone/sprint entities, which are not configured.",
      },
    },
    adminComparison:
      filters.viewerRole === Role.ADMIN
        ? {
            assignedVsResolved: byDeveloper.map((row) => ({
              developerId: row.developerId,
              developerName: row.developerName,
              assigned: row.assigned,
              resolved: row.resolved,
            })),
            avgResolutionPerDeveloper: byDeveloper.map((row) => ({
              developerId: row.developerId,
              developerName: row.developerName,
              averageResolutionTimeHours: row.averageResolutionTimeHours,
            })),
            reopenRatePerDeveloper: byDeveloper.map((row) => ({
              developerId: row.developerId,
              developerName: row.developerName,
              reopenRatePercentage: row.reopenRatePercentage,
            })),
          }
        : null,
  };
};

export const exportDeveloperPerformanceReportCsv = async (
  filters: DeveloperPerformanceFilters
) => {
  const report = await getDeveloperPerformanceReport(filters);

  const lines: string[] = [];
  lines.push("Personal Developer Metrics");
  lines.push("Metric,Value");
  lines.push(`Total Assigned,${report.personal.overview.totalAssigned}`);
  lines.push(`Total Resolved,${report.personal.overview.totalResolved}`);
  lines.push(`Open Bugs,${report.personal.overview.openBugs}`);
  lines.push(`Critical/Blocker Open,${report.personal.overview.criticalOrBlockerOpen}`);
  lines.push(`Overdue Bugs,${report.personal.overview.overdueBugs}`);
  lines.push(
    `Average Resolution Time (Hours),${report.personal.overview.averageResolutionTimeHours.toFixed(2)}`
  );
  lines.push(`Reopen Rate (%),${report.personal.overview.reopenRatePercentage.toFixed(2)}`);
  lines.push("");

  lines.push("Project Metrics");
  lines.push("Metric,Value");
  lines.push(`Total Bugs,${report.project.totalBugs}`);
  lines.push(`Total Resolved,${report.project.totalResolved}`);
  lines.push(`Resolution Rate (%),${report.project.resolutionRatePercentage.toFixed(2)}`);
  lines.push(`Average Resolution Time (Hours),${report.project.averageResolutionTimeHours.toFixed(2)}`);
  lines.push(`Reopen Rate (%),${report.project.reopenRatePercentage.toFixed(2)}`);
  lines.push("");

  if (report.adminComparison) {
    lines.push("Admin Developer Comparison");
    lines.push("Developer,Assigned,Resolved,Avg Resolution Time (Hours),Reopen Rate (%)");

    for (const row of report.adminComparison.assignedVsResolved) {
      const avgResolution =
        report.adminComparison.avgResolutionPerDeveloper.find(
          (entry) => entry.developerId === row.developerId
        )?.averageResolutionTimeHours ?? 0;
      const reopenRate =
        report.adminComparison.reopenRatePerDeveloper.find(
          (entry) => entry.developerId === row.developerId
        )?.reopenRatePercentage ?? 0;

      lines.push(
        [
          row.developerName,
          row.assigned,
          row.resolved,
          avgResolution.toFixed(2),
          reopenRate.toFixed(2),
        ]
          .map((value) => toCsvCell(value))
          .join(",")
      );
    }
  }

  return lines.join("\n");
};

export const getTesterPerformanceReport = async (
  filters: TesterPerformanceFilters
) => {
  const testRunItemWhere: Prisma.TestRunItemWhereInput = {
    assignedToId: {
      not: null
    }
  };

  if (filters.testRunId) {
    testRunItemWhere.testRunId = filters.testRunId;
  }

  if (typeof filters.testerId === "number") {
    testRunItemWhere.assignedToId = filters.testerId;
  }

  if (filters.fromDate || filters.toDate) {
    const startedAt: { gte?: Date; lte?: Date } = {};
    const completedAt: { gte?: Date; lte?: Date } = {};

    if (filters.fromDate) {
      startedAt.gte = filters.fromDate;
      completedAt.gte = filters.fromDate;
    }
    if (filters.toDate) {
      startedAt.lte = filters.toDate;
      completedAt.lte = filters.toDate;
    }

    testRunItemWhere.OR = [{ startedAt }, { completedAt }];
  }

  const bugWhere: Prisma.BugWhereInput = {
    status: {
      notIn: ["SOFT_DELETED", "REJECTED"]
    },
    createdBy: {
      role: "TESTER"
    }
  };

  if (typeof filters.testerId === "number") {
    bugWhere.createdById = filters.testerId;
  }

  if (filters.fromDate || filters.toDate) {
    bugWhere.createdAt = {};
    if (filters.fromDate) {
      bugWhere.createdAt.gte = filters.fromDate;
    }
    if (filters.toDate) {
      bugWhere.createdAt.lte = filters.toDate;
    }
  }

  const [runItems, bugs, testCaseCount, testers, testRuns] = await Promise.all([
    prisma.testRunItem.findMany({
      where: testRunItemWhere,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        testRunId: true,
        testCaseId: true,
        assignedToId: true,
        testRun: {
          select: {
            name: true
          }
        },
        testCase: {
          select: {
            title: true,
            testCaseId: true,
            module: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { completedAt: "asc" }
    }),
    prisma.bug.findMany({
      where: bugWhere,
      select: {
        id: true,
        createdById: true
      }
    }),
    prisma.testCase.count({
      where: { isDeleted: false }
    }),
    prisma.user.findMany({
      where: { role: "TESTER" },
      select: { id: true, email: true },
      orderBy: { email: "asc" }
    }),
    prisma.testRun.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  type TesterStats = {
    testerId: number;
    testerName: string;
    planned: number;
    executed: number;
    passed: number;
    failed: number;
  };

  const statsMap = new Map<number, TesterStats>();
  const trendMap = new Map<string, Map<number, number>>();
  const failedTestCases: Array<{
    testRunId: string;
    testRunName: string;
    testCaseId: string;
    title: string;
    module: string;
    testerId: number;
    testerName: string;
    completedAt: string | null;
    status: "FAILED";
  }> = [];

  for (const item of runItems) {
    if (!item.assignedToId || !item.assignedTo) continue;

    if (!statsMap.has(item.assignedToId)) {
      statsMap.set(item.assignedToId, {
        testerId: item.assignedToId,
        testerName: item.assignedTo.email,
        planned: 0,
        executed: 0,
        passed: 0,
        failed: 0
      });
    }

    const stats = statsMap.get(item.assignedToId)!;
    stats.planned += 1;

    const isExecuted = EXECUTED_TEST_RUN_ITEM_STATUSES.has(item.status);
    if (isExecuted) {
      stats.executed += 1;

      if (item.status === "PASSED") {
        stats.passed += 1;
      } else if (item.status === "FAILED") {
        stats.failed += 1;
        failedTestCases.push({
          testRunId: item.testRunId,
          testRunName: item.testRun.name,
          testCaseId: item.testCase.testCaseId ?? item.testCaseId,
          title: item.testCase.title,
          module: item.testCase.module,
          testerId: item.assignedToId,
          testerName: item.assignedTo.email,
          completedAt: item.completedAt ? item.completedAt.toISOString() : null,
          status: "FAILED"
        });
      }

      const trendDate = item.completedAt ?? item.startedAt;
      if (trendDate) {
        const period = trendDate.toISOString().slice(0, 10);
        if (!trendMap.has(period)) {
          trendMap.set(period, new Map<number, number>());
        }
        const periodMap = trendMap.get(period)!;
        periodMap.set(
          item.assignedToId,
          (periodMap.get(item.assignedToId) ?? 0) + 1
        );
      }
    }
  }

  const bugsByTester = bugs.reduce((acc, bug) => {
    acc.set(bug.createdById, (acc.get(bug.createdById) ?? 0) + 1);
    return acc;
  }, new Map<number, number>());

  const testerRows = [...statsMap.values()]
    .sort((a, b) => a.testerName.localeCompare(b.testerName))
    .map((row) => {
      const bugsReported = bugsByTester.get(row.testerId) ?? 0;
      const bugDetectionRatePercentage = computePercentage(
        row.failed,
        row.executed
      );

      return {
        testerId: row.testerId,
        testerName: row.testerName,
        planned: row.planned,
        executed: row.executed,
        passed: row.passed,
        failed: row.failed,
        bugsReported,
        bugDetectionRatePercentage
      };
    });

  const totals = testerRows.reduce(
    (acc, row) => {
      acc.planned += row.planned;
      acc.executed += row.executed;
      acc.passed += row.passed;
      acc.failed += row.failed;
      acc.bugsReported += row.bugsReported;
      return acc;
    },
    {
      planned: 0,
      executed: 0,
      passed: 0,
      failed: 0,
      bugsReported: 0
    }
  );

  const bugDetectionRatePercentage = computePercentage(
    totals.failed,
    totals.executed
  );
  const executionEfficiencyPercentage = computePercentage(
    totals.executed,
    totals.planned
  );
  const coveragePercentage = computePercentage(
    totals.executed,
    testCaseCount
  );

  const trendSeries = testerRows.map((tester) => ({
    testerId: tester.testerId,
    testerName: tester.testerName,
    points: [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, counts]) => ({
        period,
        count: counts.get(tester.testerId) ?? 0
      }))
  }));

  return {
    filters: {
      selected: {
        fromDate: filters.fromDate ? filters.fromDate.toISOString() : null,
        toDate: filters.toDate ? filters.toDate.toISOString() : null,
        testRunId: filters.testRunId ?? null,
        testerId: filters.testerId ?? null
      },
      options: {
        testers,
        testRuns
      }
    },
    kpis: {
      totalExecuted: totals.executed,
      passed: totals.passed,
      failed: totals.failed,
      bugDetectionRatePercentage,
      executionEfficiencyPercentage,
      coveragePercentage
    },
    charts: {
      testExecutionCountPerTester: testerRows.map((row) => ({
        testerId: row.testerId,
        testerName: row.testerName,
        executed: row.executed
      })),
      bugDetectionRatePerTester: testerRows.map((row) => ({
        testerId: row.testerId,
        testerName: row.testerName,
        bugDetectionRatePercentage: row.bugDetectionRatePercentage
      })),
      executionTrendPerTester: trendSeries
    },
    tables: {
      failedTestCases: failedTestCases.sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      )
    }
  };
};

export const exportTesterPerformanceReportCsv = async (
  filters: TesterPerformanceFilters
) => {
  const report = await getTesterPerformanceReport(filters);

  const lines: string[] = [];
  lines.push("Metric,Value");
  lines.push(`Total Executed,${report.kpis.totalExecuted}`);
  lines.push(`Passed,${report.kpis.passed}`);
  lines.push(`Failed,${report.kpis.failed}`);
  lines.push(
    `Bug Detection Rate (%),${report.kpis.bugDetectionRatePercentage.toFixed(2)}`
  );
  lines.push(
    `Execution Efficiency (%),${report.kpis.executionEfficiencyPercentage.toFixed(2)}`
  );
  lines.push(`Coverage (%),${report.kpis.coveragePercentage.toFixed(2)}`);
  lines.push("");

  lines.push(
    "Tester,Executed,Failed,Bug Detection Rate (%)"
  );
  for (const executionRow of report.charts.testExecutionCountPerTester) {
    const bugRate =
      report.charts.bugDetectionRatePerTester.find(
        (row) => row.testerId === executionRow.testerId
      )?.bugDetectionRatePercentage ?? 0;
    const failedCount =
      report.tables.failedTestCases.filter(
        (row) => row.testerId === executionRow.testerId
      ).length;

    lines.push(
      [
        executionRow.testerName,
        executionRow.executed,
        failedCount,
        bugRate.toFixed(2),
      ]
        .map((value) => toCsvCell(value))
        .join(",")
    );
  }

  lines.push("");
  lines.push("Failed Test Cases");
  lines.push(
    "Test Run,Test Case ID,Title,Module,Tester,Completed At,Status"
  );
  for (const row of report.tables.failedTestCases) {
    lines.push(
      [
        row.testRunName,
        row.testCaseId,
        row.title,
        row.module,
        row.testerName,
        row.completedAt ?? "",
        row.status
      ]
        .map((value) => toCsvCell(value))
        .join(",")
    );
  }

  return lines.join("\n");
};
