import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportReport, getBugReport, getTestExecutionReport } from "../api/report.api";
import { getCurrentUser, type AppRole } from "../utils/auth";

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

interface ReportCard {
 
  title: string;
  description: string;
  route: string;
  roles: AppRole[];
  accent: string;
  soft: string;
  statPreview: (kpis: SnapshotMetrics) => string;
  exportType: "test-execution" | "bugs" | "developer-performance" | "tester-performance";
}

interface SnapshotMetrics {
  totalExecutionsThisMonth: number;
  overallPassRate: number;
  openCriticalBugs: number;
  averageBugResolutionTime: number;
}

interface ExecutionResponse {
  kpis?: {
    executed?: number;
    passRatePercentage?: number;
  };
  charts?: {
    executionTimeline?: Array<{ date: string; count: number }>;
  };
}

interface BugResponse {
  kpis?: {
    openBugs?: number;
    averageResolutionTimeHours?: number;
  };
  charts?: {
    statusDistribution?: Array<{ status: string; count: number }>;
    severityDistribution?: Array<{ severity: string; count: number }>;
  };
}

const reportCards: ReportCard[] = [
  {
   
    title: "Test Execution Report",
    description: "Track execution progress, pass/fail trends, and module/tester-level delivery quality.",
    route: "/reports/test-execution",
    roles: ["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"],
    accent: "#f59e0b",
    soft: "#fff7e6",
    statPreview: (kpis) => `Last run pass rate: ${kpis.overallPassRate.toFixed(1)}%`,
    exportType: "test-execution",
  },
  {
    
    title: "Bug Report",
    description: "Analyze bug severity, closure trends, and ownership across the release cycle.",
    route: "/reports/bugs",
    roles: ["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"],
    accent: "#22c55e",
    soft: "#ecfdf3",
    statPreview: (kpis) => `Open critical bugs: ${kpis.openCriticalBugs}`,
    exportType: "bugs",
  },
  {
    
    title: "Developer Performance Report",
    description: "Measure fix throughput, turnaround time, and verification outcomes by developer.",
    route: "/reports/developer-performance",
    roles: ["DEVELOPER", "ADMIN"],
    accent: "#2563eb",
    soft: "#eff6ff",
    statPreview: (kpis) => `Avg resolution: ${kpis.averageBugResolutionTime.toFixed(1)} hrs`,
    exportType: "developer-performance",
  },
  {
    
    title: "Tester Performance Report",
    description: "Review tester execution coverage, defect discovery rates, and report quality.",
    route: "/reports/tester-performance",
    roles: ["TESTER", "ADMIN", "TRIAGE"],
    accent: "#7c3aed",
    soft: "#f5f3ff",
    statPreview: (kpis) => `Execution volume: ${kpis.totalExecutionsThisMonth} this month`,
    exportType: "tester-performance",
  },
];

const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#14b8a6"];

const formatStatus = (value: string) => value.replace(/_/g, " ");

const ReportsPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotMetrics>({
    totalExecutionsThisMonth: 0,
    overallPassRate: 0,
    openCriticalBugs: 0,
    averageBugResolutionTime: 0,
  });
  const [executionTrend, setExecutionTrend] = useState<Array<{ date: string; count: number }>>([]);
  const [bugStatusDistribution, setBugStatusDistribution] = useState<Array<{ name: string; value: number }>>([]);

  const visibleCards = useMemo(
    () => reportCards.filter((card) => (user ? card.roles.includes(user.role) : false)),
    [user]
  );

  useEffect(() => {
    if (!hasAccess) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [executionRes, bugRes] = await Promise.all([
          getTestExecutionReport({}),
          getBugReport({ groupBy: "month" }),
        ]);

        const execution = ((executionRes as { data?: { data?: ExecutionResponse } }).data?.data ?? {}) as ExecutionResponse;
        const bug = ((bugRes as { data?: { data?: BugResponse } }).data?.data ?? {}) as BugResponse;

        const passRate = execution.kpis?.passRatePercentage ?? 0;
        const executed = execution.kpis?.executed ?? 0;
        const avgResolution = bug.kpis?.averageResolutionTimeHours ?? 0;
        const severityDist = bug.charts?.severityDistribution ?? [];
        const criticalCount = severityDist
          .filter((item) => item.severity === "CRITICAL" || item.severity === "BLOCKER")
          .reduce((sum, item) => sum + item.count, 0);

        if (!active) return;

        setSnapshot({
          totalExecutionsThisMonth: executed,
          overallPassRate: passRate,
          openCriticalBugs: criticalCount,
          averageBugResolutionTime: avgResolution,
        });

        setExecutionTrend((execution.charts?.executionTimeline ?? []).slice(-8));
        setBugStatusDistribution(
          (bug.charts?.statusDistribution ?? []).slice(0, 6).map((item) => ({
            name: formatStatus(item.status),
            value: item.count,
          }))
        );
      } catch {
        if (!active) return;
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [hasAccess]);

  const recentReports = useMemo(
    () =>
      visibleCards.slice(0, 4).map((card, idx) => ({
        id: card.route,
        name: card.title,
        type: card.title.includes("Bug")
          ? "Bug Analytics"
          : card.title.includes("Developer")
            ? "Developer Analytics"
            : card.title.includes("Tester")
              ? "Tester Analytics"
              : "Execution Analytics",
        generatedBy: user?.email ?? "System",
        date: new Date(Date.now() - idx * 86400000).toLocaleDateString(),
        exportType: card.exportType,
      })),
    [visibleCards, user?.email]
  );

  const handleDownload = async (
    reportType: "test-execution" | "bugs" | "developer-performance" | "tester-performance"
  ) => {
    setDownloading(reportType);
    try {
      const res = await exportReport(reportType, {});
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  if (!hasAccess) {
    return (
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 1 }}>
          Reports & Analytics
        </Typography>
        <Typography color="text.secondary">
          You do not have permission to view reports.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack spacing={0.75} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          Reports & Analytics
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: "1.05rem", fontWeight: 500 }}>
          Premium analytics hub with report shortcuts, KPI snapshots, preview charts, and recent exports.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            md: visibleCards.length >= 3 ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
          },
          mb: 3,
        }}
      >
        {visibleCards.map((card) => (
          <Paper
            key={card.route}
            sx={{
              p: 3,
              borderRadius: 4,
              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
              background: isDark
                ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
                : `linear-gradient(180deg, ${card.soft} 0%, #ffffff 100%)`,
              boxShadow: isDark ? "0 10px 24px rgba(2, 6, 23, 0.5)" : "0 10px 24px rgba(15, 23, 42, 0.06)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.13)",
              },
            }}
          >
            <Stack spacing={2} justifyContent="space-between" sx={{ minHeight: 220 }}>
              <Box>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "14px",
                    backgroundColor: card.accent,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    mb: 1.75,
                  }}
                >
                 
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1.25, fontSize: "1.05rem", lineHeight: 1.6 }}>
                  {card.description}
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? "#cbd5e1" : "#0f172a", fontWeight: 700 }}>
                  {card.statPreview(snapshot)}
                </Typography>
              </Box>

              <Button component={Link} to={card.route} type="button" variant="contained">
                View Report
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800 }}>
        Analytics Snapshot
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          mb: 3,
        }}
      >
        {[
          { label: "Total Executions This Month", value: snapshot.totalExecutionsThisMonth.toLocaleString() },
          { label: "Overall Pass Rate", value: `${snapshot.overallPassRate.toFixed(1)}%` },
          { label: "Open Critical Bugs", value: snapshot.openCriticalBugs.toString() },
          { label: "Avg Bug Resolution Time", value: `${snapshot.averageBugResolutionTime.toFixed(1)} hrs` },
        ].map((item) => (
          <Paper
            key={item.label}
            sx={{
              p: 2.25,
              borderRadius: 4,
              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
              boxShadow: isDark ? "0 8px 18px rgba(2, 6, 23, 0.45)" : "0 8px 18px rgba(15, 23, 42, 0.06)",
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "1rem" }}>
              {item.label}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "1.55rem", fontWeight: 800 }}>
              {loading ? "--" : item.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800 }}>
        Mini Charts
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", xl: "1.4fr 1fr" },
          mb: 3,
        }}
      >
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 4,
            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Execution Trend</Typography>
          <Box sx={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={executionTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 4,
            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Bug Status Distribution</Typography>
          <Box sx={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={bugStatusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={82}>
                  {bugStatusDistribution.map((item, index) => (
                    <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800 }}>
        Recent Reports
      </Typography>
      <Paper
        sx={{
          borderRadius: 4,
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          overflowX: "auto",
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}>
            <TableRow>
              <TableCell>Report Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Generated By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentReports.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.generatedBy}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void handleDownload(row.exportType)}
                    disabled={downloading === row.exportType}
                  >
                    {downloading === row.exportType ? "Downloading..." : "Download"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ReportsPage;
