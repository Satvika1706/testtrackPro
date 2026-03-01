import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getCurrentUser, type AppRole } from "../utils/auth";
import { getTestCases } from "../api/testcases.api";
import { getAllTestRuns } from "../api/testrun.api";
import { getMyAssignedBugs, type BugItem } from "../api/bug.api";
import {
  getBugReport,
  getDeveloperPerformanceReport,
  getTestExecutionReport,
} from "../api/report.api";
import { getNotifications } from "../api/notification.api";
import KpiCard from "../components/dashboard/KpiCard";
import DashboardCard from "../components/dashboard/DashboardCard";
import TestExecutionTrendChart from "../components/dashboard/TestExecutionTrendChart";
import BugStatusPieChart from "../components/dashboard/BugStatusPieChart";
import ModuleFailuresBarChart from "../components/dashboard/ModuleFailuresBarChart";
import type {
  ActivityItem,
  AssignedItem,
  DashboardData,
  DashboardNotification,
  ModuleFailurePoint,
  TrendPoint,
} from "../components/dashboard/types";

type WidgetZone = "top" | "middle" | "bottom";

interface WidgetConfig {
  id: string;
  zone: WidgetZone;
}

interface TestCaseItem {
  id: string;
  title: string;
  module?: string;
}

interface TestRunItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  createdBy?: { email?: string };
}

interface ExecutionReportData {
  kpis?: {
    totalTestCases?: number;
    executed?: number;
    passed?: number;
    failed?: number;
    blocked?: number;
    inProgress?: number;
    passRatePercentage?: number;
  };
  charts?: {
    executionTimeline?: Array<{ date: string; count: number }>;
    statusBreakdown?: Array<{ status: string; count: number }>;
    executionByModule?: Array<{ module: string; executed: number }>;
  };
  tables?: {
    failedTestCases?: Array<{
      testCaseId: string;
      title: string;
      module: string;
      status: string;
      completedAt: string | null;
      testRunName?: string;
    }>;
  };
}

interface BugReportData {
  kpis?: {
    totalBugs?: number;
    openBugs?: number;
    reopenedBugs?: number;
  };
  charts?: {
    bugTrendOverTime?: Array<{ period: string; count: number }>;
    statusDistribution?: Array<{ status: string; count: number }>;
  };
  tables?: {
    highSeverityBugs?: Array<{
      bugId: string;
      title: string;
      severity: string;
      status: string;
      developerName: string;
      createdAt: string;
    }>;
    agingBugs?: Array<{
      bugId: string;
      title: string;
      status: string;
      severity: string;
      ageDays: number;
      createdAt: string;
    }>;
  };
}

interface DeveloperPerformanceData {
  personal?: {
    overview?: {
      totalAssigned?: number;
      criticalOrBlockerOpen?: number;
      openBugs?: number;
      averageResolutionTimeHours?: number;
    };
    quality?: {
      reopenCount?: number;
    };
    efficiency?: {
      weeklyResolutionTrend?: Array<{ week: string; resolved: number }>;
    };
    agingAndRisk?: {
      topOldestOpenBugs?: Array<{ ageDays: number }>;
    };
  };
}

const widgetLayout: WidgetConfig[] = [
  { id: "kpis", zone: "top" },
  { id: "charts", zone: "middle" },
  { id: "productivity", zone: "bottom" },
];

const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#14b8a6"];

const safeArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    const nested = (value as { data?: unknown }).data;
    return safeArray<T>(nested);
  }
  return [];
};

const percent = (num: number, den: number) => (den <= 0 ? 0 : (num / den) * 100);

const toRelativeTime = (isoValue?: string | null): string => {
  if (!isoValue) return "recently";
  const date = new Date(isoValue);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "recently";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatStatus = (status: string) => status.replace(/_/g, " ");

const getSeverityLevel = (value: string): "info" | "warning" | "critical" => {
  if (value === "critical") return "critical";
  if (value === "warning") return "warning";
  return "info";
};

const getLevelStyles = (level: "info" | "warning" | "critical") => {
  if (level === "critical") return { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" };
  if (level === "warning") return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
  return { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" };
};

const buildFallbackData = (role: AppRole): DashboardData => ({
  kpis: [
    { id: "k1", label: "Total Test Cases", value: "0", subtext: "No data yet", icon: "testCases" },
    { id: "k2", label: "Active Test Runs", value: "0", subtext: "No data yet", icon: "testRuns" },
    { id: "k3", label: "Open Bugs", value: "0", subtext: "No data yet", icon: "bugs" },
    { id: "k4", label: "Pass Rate %", value: "0.0%", subtext: "No execution data", icon: "passRate" },
    { id: "k5", label: "My Pending Items", value: "0", subtext: "No assignments", icon: "pending" },
    {
      id: "k6",
      label: role === "DEVELOPER" ? "Reopened Bugs" : "Bug Detection Rate",
      value: "0",
      subtext: "No trend data",
      icon: "bugRate",
    },
  ],
  trend: [],
  bugStatus: [],
  moduleFailures: [],
  recentActivity: [],
  assignedItems: [],
  notifications: [],
  roleMetrics: {
    primaryLabel: role === "DEVELOPER" ? "Bugs Assigned to Me" : "My Pending Tests",
    primaryValue: "0",
    secondaryLabel: role === "DEVELOPER" ? "Critical / P1 Bugs" : "Tests Due Today",
    secondaryValue: "0",
    tertiaryLabel: role === "DEVELOPER" ? "Bug Aging (days open)" : "Recent Failures",
    tertiaryValue: "0",
    quaternaryLabel: role === "DEVELOPER" ? "Reopened Bugs" : "Execution Trend",
    quaternaryValue: "0",
  },
  bugDetectionRate: "0.0%",
});

const buildDashboardFromApi = async (role: AppRole): Promise<DashboardData> => {
  const [testCasesRes, testRunsRes, executionRes, bugRes, notificationsRes, myBugsRes, devPerfRes] =
    await Promise.allSettled([
      getTestCases(),
      getAllTestRuns(),
      getTestExecutionReport({}),
      getBugReport({ groupBy: "week" }),
      getNotifications(),
      role === "DEVELOPER" ? getMyAssignedBugs({ page: 1, limit: 50 }) : Promise.resolve(null),
      role === "DEVELOPER" ? getDeveloperPerformanceReport({}) : Promise.resolve(null),
    ]);

  const testCases = testCasesRes.status === "fulfilled" ? safeArray<TestCaseItem>(testCasesRes.value) : [];
  const testRunsRaw = testRunsRes.status === "fulfilled" ? (testRunsRes.value as { data?: unknown }).data : [];
  const testRuns = safeArray<TestRunItem>(testRunsRaw);
  const executionReport = executionRes.status === "fulfilled"
    ? ((executionRes.value as { data?: { data?: ExecutionReportData } }).data?.data ?? null)
    : null;
  const bugReport = bugRes.status === "fulfilled"
    ? ((bugRes.value as { data?: { data?: BugReportData } }).data?.data ?? null)
    : null;
  const notificationsApi = notificationsRes.status === "fulfilled"
    ? safeArray<DashboardNotification | { id: string; type: string; message?: string | null; referenceId: string; createdAt: string; isRead: boolean }>(
      (notificationsRes.value as { data?: unknown }).data
    )
    : [];
  const myAssignedBugs: BugItem[] =
    myBugsRes.status === "fulfilled" && myBugsRes.value
      ? safeArray<BugItem>((myBugsRes.value as { data?: { data?: BugItem[] } }).data?.data)
      : [];
  const developerPerf: DeveloperPerformanceData | null =
    devPerfRes.status === "fulfilled" && devPerfRes.value
      ? ((devPerfRes.value as { data?: { data?: DeveloperPerformanceData } }).data?.data ?? null)
      : null;

  const executionTimeline = executionReport?.charts?.executionTimeline ?? [];
  const passRate =
    executionReport?.kpis?.passRatePercentage ??
    percent(executionReport?.kpis?.passed ?? 0, executionReport?.kpis?.executed ?? 0);
  const trend: TrendPoint[] = executionTimeline.slice(-7).map((point) => {
    const passedEstimate = Math.round(point.count * (passRate / 100));
    return {
      day: point.date?.slice(5) || point.date,
      executed: point.count,
      passed: passedEstimate,
      failed: Math.max(point.count - passedEstimate, 0),
      resolved: 0,
    };
  });

  const developerTrend: TrendPoint[] =
    role === "DEVELOPER"
      ? (developerPerf?.personal?.efficiency?.weeklyResolutionTrend ?? []).slice(-7).map((point) => ({
        day: point.week,
        executed: point.resolved,
        passed: point.resolved,
        failed: 0,
        resolved: point.resolved,
      }))
      : [];

  const statusDistribution = bugReport?.charts?.statusDistribution ?? [];
  const bugStatus = statusDistribution.slice(0, 6).map((entry, index) => ({
    name: formatStatus(entry.status),
    value: entry.count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const failedCases = executionReport?.tables?.failedTestCases ?? [];
  const moduleFailureMap = new Map<string, number>();
  failedCases.forEach((entry) => {
    const key = entry.module || "Unknown";
    moduleFailureMap.set(key, (moduleFailureMap.get(key) ?? 0) + 1);
  });
  const moduleFailures: ModuleFailurePoint[] =
    moduleFailureMap.size > 0
      ? Array.from(moduleFailureMap.entries())
        .map(([module, failures]) => ({ module, failures }))
        .sort((a, b) => b.failures - a.failures)
        .slice(0, 8)
      : (executionReport?.charts?.executionByModule ?? []).slice(0, 8).map((item) => ({
        module: item.module,
        failures: item.executed,
      }));

  const totalTestCases = executionReport?.kpis?.totalTestCases ?? testCases.length;
  const activeTestRuns = testRuns.filter((run) => run.status !== "COMPLETED").length;
  const openBugs =
    bugReport?.kpis?.openBugs ??
    statusDistribution
      .filter((entry) => !["CLOSED", "VERIFIED", "FIXED", "DUPLICATE", "WONT_FIX"].includes(entry.status))
      .reduce((sum, entry) => sum + entry.count, 0);

  const testerPending = (executionReport?.kpis?.inProgress ?? 0) + (executionReport?.kpis?.blocked ?? 0);
  const testerDueToday = activeTestRuns;
  const testerRecentFailures = failedCases.length;
  const detectionRate = percent(executionReport?.kpis?.failed ?? 0, executionReport?.kpis?.executed ?? 0);

  const developerAssigned = developerPerf?.personal?.overview?.totalAssigned ?? myAssignedBugs.length;
  const developerCritical = developerPerf?.personal?.overview?.criticalOrBlockerOpen ??
    myAssignedBugs.filter((bug) => bug.priority === "P1" || bug.severity === "CRITICAL" || bug.severity === "BLOCKER").length;
  const developerReopened = developerPerf?.personal?.quality?.reopenCount ??
    myAssignedBugs.filter((bug) => bug.status === "REOPENED").length;
  const developerAging = (() => {
    const oldest = developerPerf?.personal?.agingAndRisk?.topOldestOpenBugs ?? [];
    if (!oldest.length) return "0.0";
    const avg = oldest.reduce((sum, bug) => sum + bug.ageDays, 0) / oldest.length;
    return avg.toFixed(1);
  })();

  const kpis = [
    {
      id: "k1",
      label: "Total Test Cases",
      value: String(totalTestCases),
      subtext: "Synced from test case catalog",
      icon: "testCases" as const,
    },
    {
      id: "k2",
      label: "Active Test Runs",
      value: String(activeTestRuns),
      subtext: `${testRuns.length} total runs`,
      icon: "testRuns" as const,
    },
    {
      id: "k3",
      label: "Open Bugs",
      value: String(openBugs),
      subtext: `${bugReport?.kpis?.totalBugs ?? openBugs} total reported`,
      icon: "bugs" as const,
    },
    {
      id: "k4",
      label: "Pass Rate %",
      value: `${passRate.toFixed(1)}%`,
      subtext: `${executionReport?.kpis?.executed ?? 0} executed`,
      icon: "passRate" as const,
    },
    {
      id: "k5",
      label: "My Pending Items",
      value: role === "DEVELOPER" ? String(developerAssigned) : String(testerPending),
      subtext: role === "DEVELOPER" ? "Assigned bugs pending" : "In progress + blocked tests",
      icon: "pending" as const,
    },
    {
      id: "k6",
      label: role === "DEVELOPER" ? "Reopened Bugs" : "Bug Detection Rate",
      value: role === "DEVELOPER" ? String(developerReopened) : `${detectionRate.toFixed(1)}%`,
      subtext: role === "DEVELOPER" ? "From personal quality metrics" : "Failed vs executed tests",
      icon: "bugRate" as const,
    },
  ];

  const assignedItems: AssignedItem[] =
    role === "DEVELOPER"
      ? myAssignedBugs.slice(0, 8).map((bug) => ({
        id: bug.bugId || bug.id,
        item: bug.title,
        type: "Bug",
        priority: bug.priority,
        status: formatStatus(bug.status),
        dueDate: toRelativeTime(bug.createdAt),
      }))
      : failedCases.slice(0, 8).map((item) => ({
        id: item.testCaseId,
        item: item.title,
        type: "Test Case",
        priority: "High",
        status: formatStatus(item.status),
        dueDate: toRelativeTime(item.completedAt),
      }));

  const notifications: DashboardNotification[] = notificationsApi.slice(0, 8).map((note) => {
    const source = note as { id: string; type?: string; title?: string; message?: string | null; referenceId?: string; createdAt?: string; isRead?: boolean };
    const level = source.isRead ? "info" : "warning";
    return {
      id: source.id,
      title: source.type ? formatStatus(source.type) : "Notification",
      message: source.message || source.referenceId || "Activity update available",
      level: getSeverityLevel(level),
      createdAt: toRelativeTime(source.createdAt),
    };
  });

  const activityFromBugs: ActivityItem[] = (bugReport?.tables?.highSeverityBugs ?? []).slice(0, 3).map((bug) => ({
    id: `bug-${bug.bugId}`,
    title: `High severity bug ${bug.bugId}`,
    description: `${bug.severity} - ${formatStatus(bug.status)} - ${bug.title}`,
    when: toRelativeTime(bug.createdAt),
  }));
  const activityFromFailures: ActivityItem[] = failedCases.slice(0, 3).map((item) => ({
    id: `failure-${item.testCaseId}`,
    title: `Failed test ${item.testCaseId}`,
    description: `${item.title} (${item.module}) in ${item.testRunName || "run"}`,
    when: toRelativeTime(item.completedAt),
  }));
  const recentActivity = [...activityFromBugs, ...activityFromFailures]
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, 6);

  const roleMetrics =
    role === "DEVELOPER"
      ? {
        primaryLabel: "Bugs Assigned to Me",
        primaryValue: String(developerAssigned),
        secondaryLabel: "Critical / P1 Bugs",
        secondaryValue: String(developerCritical),
        tertiaryLabel: "Bug Aging (days open)",
        tertiaryValue: developerAging,
        quaternaryLabel: "Reopened Bugs",
        quaternaryValue: String(developerReopened),
      }
      : {
        primaryLabel: "My Pending Tests",
        primaryValue: String(testerPending),
        secondaryLabel: "Tests Due Today",
        secondaryValue: String(testerDueToday),
        tertiaryLabel: "Recent Failures",
        tertiaryValue: String(testerRecentFailures),
        quaternaryLabel: "Execution Trend",
        quaternaryValue: trend.length > 1
          ? trend[trend.length - 1].executed >= trend[trend.length - 2].executed
            ? "Upward"
            : "Downward"
          : "Stable",
      };

  const baseData: DashboardData = {
    kpis,
    trend: role === "DEVELOPER" && developerTrend.length ? developerTrend : trend,
    bugStatus,
    moduleFailures,
    recentActivity,
    assignedItems,
    notifications,
    roleMetrics,
    bugDetectionRate: `${detectionRate.toFixed(1)}%`,
  };

  const hasAnyData =
    baseData.kpis.some((item) => Number(item.value.replace(/[^\d.]/g, "")) > 0) ||
    baseData.trend.length > 0 ||
    baseData.assignedItems.length > 0;

  return hasAnyData ? baseData : buildFallbackData(role);
};

const Dashboard = () => {
  const user = useMemo(() => getCurrentUser(), []);
  const role: AppRole = user?.role ?? "TESTER";
  const isDeveloper = role === "DEVELOPER";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await buildDashboardFromApi(role);
        if (!active) return;
        setData(response);
      } catch {
        if (!active) return;
        setData(buildFallbackData(role));
        setError("Some live metrics are unavailable. Showing fallback values where needed.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [role]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, display: "grid", gap: 3 }}>
        <Skeleton variant="rounded" height={88} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} variant="rounded" height={150} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: 360, display: "grid", placeItems: "center" }}>
        <DashboardCard title="Dashboard unavailable" subtitle="No data found for this user.">
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </DashboardCard>
      </Box>
    );
  }

  const topWidgets = widgetLayout.filter((w) => w.zone === "top");
  const middleWidgets = widgetLayout.filter((w) => w.zone === "middle");
  const bottomWidgets = widgetLayout.filter((w) => w.zone === "bottom");

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, display: "grid", gap: 3, minWidth: 0 }}>
      <Box
        sx={{
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          color: "#fff",
          background: "linear-gradient(125deg, #0f172a 0%, #1d4ed8 55%, #0ea5e9 100%)",
          boxShadow: "0 18px 38px rgba(30, 64, 175, 0.24)",
        }}
      >
        <Typography sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 800 }}>
          {isDeveloper ? "Developer Dashboard" : "Tester Dashboard"}
        </Typography>
        <Typography sx={{ opacity: 0.92 }}>
          {isDeveloper
            ? "Live metrics from assigned bugs and developer performance report."
            : "Live metrics from test execution, test runs, and bug reports."}
        </Typography>
      </Box>

      {error ? (
        <Box
          sx={{
            borderRadius: 3,
            p: 1.5,
            border: "1px solid #fde68a",
            backgroundColor: "#fffbeb",
          }}
        >
          <Typography variant="body2" sx={{ color: "#92400e" }}>
            {error}
          </Typography>
        </Box>
      ) : null}

      <DashboardCard
        title={isDeveloper ? "Developer Focus" : "Tester Focus"}
        subtitle={isDeveloper ? "Role-specific live indicators and bug actions" : "Role-specific live indicators and QA actions"}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.5 }}>
          <Chip label={`${data.roleMetrics.primaryLabel}: ${data.roleMetrics.primaryValue}`} />
          <Chip label={`${data.roleMetrics.secondaryLabel}: ${data.roleMetrics.secondaryValue}`} />
          <Chip label={`${data.roleMetrics.tertiaryLabel}: ${data.roleMetrics.tertiaryValue}`} />
          <Chip label={`${data.roleMetrics.quaternaryLabel}: ${data.roleMetrics.quaternaryValue}`} />
        </Box>
        {!isDeveloper ? (
          <Typography variant="body2" color="text.secondary">
            Bug Detection Rate: <strong>{data.bugDetectionRate}</strong>
          </Typography>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {isDeveloper ? (
            <>
              <Button component={RouterLink} to="/bugs" variant="contained">View Assigned Bugs</Button>
              <Button component={RouterLink} to="/bugs" variant="outlined">Update Status</Button>
              <Button component={RouterLink} to="/bugs" variant="outlined">Link Commit</Button>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/test-cases/create" variant="contained">Create Test Case</Button>
              <Button component={RouterLink} to="/test-runs" variant="outlined">Create Test Run</Button>
              <Button component={RouterLink} to="/reports" variant="outlined">View Reports</Button>
            </>
          )}
        </Stack>
      </DashboardCard>

      {topWidgets.some((w) => w.id === "kpis") ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
          {data.kpis.map((metric) => (
            <KpiCard key={metric.id} metric={metric} />
          ))}
        </Box>
      ) : null}

      {middleWidgets.some((w) => w.id === "charts") ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.5fr 1fr 1.2fr" }, gap: 2, minWidth: 0 }}>
          <DashboardCard
            title={isDeveloper ? "Resolution Trend Chart" : "Test Execution Trend"}
            subtitle={isDeveloper ? "Weekly resolution from developer performance" : "Execution timeline from test report"}
            minHeight={360}
          >
            <TestExecutionTrendChart data={data.trend} mode={isDeveloper ? "resolution" : "execution"} />
          </DashboardCard>
          <DashboardCard title="Bug Status Distribution" subtitle="Derived from bug report status distribution" minHeight={360}>
            <BugStatusPieChart data={data.bugStatus} />
          </DashboardCard>
          <DashboardCard title="Module-wise Failures" subtitle="Grouped from failed test case table" minHeight={360}>
            <ModuleFailuresBarChart data={data.moduleFailures} />
          </DashboardCard>
        </Box>
      ) : null}

      {bottomWidgets.some((w) => w.id === "productivity") ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.2fr 1.6fr 1fr" }, gap: 2, minWidth: 0 }}>
          <DashboardCard title="Recent Activity Feed" subtitle="Pulled from recent failures and high-severity bugs" minHeight={360}>
            <Stack spacing={1.25}>
              {data.recentActivity.length ? data.recentActivity.map((item) => (
                <Box key={item.id} sx={{ border: "1px solid #e6ecf5", borderRadius: 3, p: 1.5 }}>
                  <Typography fontWeight={700}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.when}</Typography>
                </Box>
              )) : <Typography color="text.secondary">No recent activity.</Typography>}
            </Stack>
          </DashboardCard>

          <DashboardCard
            title="My Assigned Items"
            subtitle={isDeveloper ? "My assigned bugs (live)" : "Recent failed test cases (live)"}
            minHeight={360}
          >
            {data.assignedItems.length ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Due</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.assignedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{item.id}</TableCell>
                        <TableCell>{item.item}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{item.priority}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.dueDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : <Typography color="text.secondary">No assigned items.</Typography>}
          </DashboardCard>

          <DashboardCard title="Notifications" subtitle="Live notifications from notification service" minHeight={360}>
            <Stack spacing={1.25}>
              {data.notifications.length ? data.notifications.map((notification) => {
                const styles = getLevelStyles(notification.level);
                return (
                  <Box key={notification.id} sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${styles.border}`, backgroundColor: styles.bg }}>
                    <Typography fontWeight={700} sx={{ color: styles.color }}>{notification.title}</Typography>
                    <Typography variant="body2" sx={{ color: styles.color }}>{notification.message}</Typography>
                    <Typography variant="caption" sx={{ color: styles.color }}>{notification.createdAt}</Typography>
                  </Box>
                );
              }) : <Typography color="text.secondary">No notifications right now.</Typography>}
            </Stack>
          </DashboardCard>
        </Box>
      ) : null}
    </Box>
  );
};

export default Dashboard;
