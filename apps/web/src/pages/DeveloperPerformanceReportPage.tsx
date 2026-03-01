import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  exportReport,
  getDeveloperPerformanceReport,
  type DeveloperPerformanceFilters,
} from "../api/report.api";
import { getCurrentUser } from "../utils/auth";
import { exportElementAsPdf } from "../utils/reportPdf";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DeveloperPerformanceResponse {
  viewer: {
    role: "ADMIN" | "DEVELOPER";
    userId: number;
    developerMode: boolean;
  };
  filters: {
    selected: {
      fromDate: string | null;
      toDate: string | null;
      developerId: number | null;
    };
    options: {
      developers: Array<{ id: number; email: string }>;
    };
  };
  personal: {
    overview: {
      totalAssigned: number;
      totalResolved: number;
      openBugs: number;
      criticalOrBlockerOpen: number;
      overdueBugs: number;
      averageResolutionTimeHours: number;
      reopenRatePercentage: number;
    };
    efficiency: {
      averageTimeToStartHours: number;
      averageFixTimeHours: number;
      weeklyResolutionTrend: Array<{ week: string; resolved: number }>;
      throughputPerWeek: Array<{ week: string; resolved: number }>;
    };
    quality: {
      reopenCount: number;
      reopenPercentage: number;
      bugsReopenedAfterFix: number;
      wontFixPercentage: number;
      fixQualityScore: number;
    };
    agingAndRisk: {
      buckets: {
        "0-3": number;
        "4-7": number;
        "8-14": number;
        "15+": number;
      };
      topOldestOpenBugs: Array<{
        id: string;
        bugId: string;
        title: string;
        status: string;
        severity: string;
        ageDays: number;
        createdAt: string;
      }>;
    };
  };
  project: {
    totalBugs: number;
    totalResolved: number;
    resolutionRatePercentage: number;
    averageResolutionTimeHours: number;
    reopenRatePercentage: number;
    sprintHealth: {
      status: string;
      note: string;
    };
  };
  adminComparison: null | {
    assignedVsResolved: Array<{
      developerId: number;
      developerName: string;
      assigned: number;
      resolved: number;
    }>;
    avgResolutionPerDeveloper: Array<{
      developerId: number;
      developerName: string;
      averageResolutionTimeHours: number;
    }>;
    reopenRatePerDeveloper: Array<{
      developerId: number;
      developerName: string;
      reopenRatePercentage: number;
    }>;
  };
}

const REPORT_ACCESS_ROLES = ["ADMIN", "DEVELOPER"] as const;

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? "Failed to load report";
  }
  return "Failed to load report";
};

const SummaryCard = ({ label, value }: { label: string; value: number | string }) => (
  <article className="kpi-card">
    <p className="kpi-label">{label}</p>
    <p className="kpi-value">{value}</p>
  </article>
);

const getInputDate = (value?: string) => (value ? value.slice(0, 10) : "");

const SimpleLine = ({
  points,
  title,
}: {
  points: Array<{ week: string; resolved: number }>;
  title: string;
}) => {
  const chartData = points.length ? points : [{ week: "No Data", resolved: 0 }];
  return (
    <div className="chart-shell">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" angle={-25} textAnchor="end" height={52} tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="resolved"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {points.length === 0 ? <p className="text-gray-600">No weekly points available for selected filters.</p> : null}
    </div>
  );
};

const DeveloperPerformanceReportPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role as "ADMIN" | "DEVELOPER") : false;

  const [report, setReport] = useState<DeveloperPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<DeveloperPerformanceFilters>({
    fromDate: "",
    toDate: "",
    developerId: "",
  });
  const printableRef = useRef<HTMLDivElement | null>(null);

  const loadReport = async (nextFilters: DeveloperPerformanceFilters) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getDeveloperPerformanceReport(nextFilters);
      setReport(res.data.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport(filters);
  }, []);

  const handleFilterChange = (key: keyof DeveloperPerformanceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadReport(filters);
  };

  const handleReset = () => {
    const resetFilters: DeveloperPerformanceFilters = {
      fromDate: "",
      toDate: "",
      developerId: "",
    };
    setFilters(resetFilters);
    void loadReport(resetFilters);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const res = await exportReport("developer-performance", filters);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `developer-performance-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!printableRef.current) return;
    setIsExportingPdf(true);
    setError("");
    try {
      await exportElementAsPdf("Developer Performance Report", printableRef.current);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filterSummary = useMemo(() => {
    if (!report) return "";
    const developerName =
      report.filters.options.developers.find(
        (developer) => String(developer.id) === filters.developerId
      )?.email ?? "My Scope";

    return `From: ${filters.fromDate || "Any"} | To: ${filters.toDate || "Any"} | Developer: ${developerName}`;
  }, [report, filters]);

  const personalCards = useMemo(
    () =>
      report
        ? [
            { label: "Total Bugs Assigned", value: report.personal.overview.totalAssigned },
            { label: "Total Bugs Resolved", value: report.personal.overview.totalResolved },
            { label: "Open Bugs", value: report.personal.overview.openBugs },
            { label: "Critical/Blocker Open", value: report.personal.overview.criticalOrBlockerOpen },
            { label: "Overdue Bugs", value: report.personal.overview.overdueBugs },
            {
              label: "Avg Resolution Time",
              value: `${report.personal.overview.averageResolutionTimeHours.toFixed(2)} hrs`,
            },
            {
              label: "Reopen Rate",
              value: `${report.personal.overview.reopenRatePercentage.toFixed(2)}%`,
            },
          ]
        : [],
    [report]
  );

  const projectCards = useMemo(
    () =>
      report
        ? [
            { label: "Total Bugs in Project", value: report.project.totalBugs },
            { label: "Total Resolved", value: report.project.totalResolved },
            {
              label: "Project Resolution Rate",
              value: `${report.project.resolutionRatePercentage.toFixed(2)}%`,
            },
            {
              label: "Project Avg Resolution Time",
              value: `${report.project.averageResolutionTimeHours.toFixed(2)} hrs`,
            },
            {
              label: "Project Reopen Rate",
              value: `${report.project.reopenRatePercentage.toFixed(2)}%`,
            },
          ]
        : [],
    [report]
  );

  const agingBucketChartData = useMemo(() => {
    if (!report) return [];
    const buckets = report.personal.agingAndRisk.buckets;
    return [
      { bucket: "0-3", count: buckets["0-3"] },
      { bucket: "4-7", count: buckets["4-7"] },
      { bucket: "8-14", count: buckets["8-14"] },
      { bucket: "15+", count: buckets["15+"] },
    ];
  }, [report]);

  const oldestBugsChartData = useMemo(() => {
    if (!report) return [];
    const oldest = report.personal.agingAndRisk.topOldestOpenBugs;
    if (!oldest.length) return [{ bug: "No Open Bugs", ageDays: 0 }];
    return oldest.map((bug) => ({
      bug: bug.bugId,
      ageDays: bug.ageDays,
    }));
  }, [report]);

  if (!hasAccess) {
    return (
      <div className="card">
        <h2 className="text-2xl">Developer Performance Report</h2>
        <p className="text-gray-600">You do not have permission to view this report.</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header report-header-row">
        <div>
          <h2 className="text-2xl font-bold">Developer Performance Report</h2>
          <p className="text-gray-600">Personal metrics, project health, and admin comparison insights.</p>
        </div>
        <div className="report-actions">
          <button type="button" className="secondary" onClick={handleExportPdf} disabled={isLoading || isExportingPdf}>
            {isExportingPdf ? "Preparing PDF..." : "Export PDF"}
          </button>
          <button type="button" onClick={handleExport} disabled={isLoading || isExporting}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <form className="report-filters card" onSubmit={handleApplyFilters}>
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="dev-from-date">From Date</label>
            <input
              id="dev-from-date"
              type="date"
              value={getInputDate(filters.fromDate)}
              onChange={(event) => handleFilterChange("fromDate", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dev-to-date">To Date</label>
            <input
              id="dev-to-date"
              type="date"
              value={getInputDate(filters.toDate)}
              onChange={(event) => handleFilterChange("toDate", event.target.value)}
            />
          </div>
          {user?.role === "ADMIN" ? (
            <div className="form-group">
              <label htmlFor="dev-filter">Developer</label>
              <select
                id="dev-filter"
                value={filters.developerId}
                onChange={(event) => handleFilterChange("developerId", event.target.value)}
              >
                <option value="">All Developers</option>
                {(report?.filters.options.developers ?? []).map((developer) => (
                  <option key={developer.id} value={String(developer.id)}>
                    {developer.email}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="report-actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Apply Filters"}
          </button>
          <button type="button" className="secondary" onClick={handleReset} disabled={isLoading}>
            Reset
          </button>
        </div>
      </form>

      {error ? <div className="alert error">{error}</div> : null}

      {report ? (
        <div ref={printableRef}>
          <div className="pdf-header report-section">
            <h1>Developer Performance Report</h1>
            <p className="pdf-meta">{filterSummary}</p>
          </div>

          <section className="report-section">
            <h3>Personal Performance</h3>
            <div className="kpi-grid">
              {personalCards.map((card) => (
                <SummaryCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
          </section>

          <section className="report-chart-grid">
            <SimpleLine
              title="Weekly Resolution Trend"
              points={report.personal.efficiency.weeklyResolutionTrend}
            />
            <SimpleLine
              title="Resolution Throughput per Week"
              points={report.personal.efficiency.throughputPerWeek}
            />
            <div className="chart-shell">
              <h3>Efficiency</h3>
              <p>Avg Time to Start: {report.personal.efficiency.averageTimeToStartHours.toFixed(2)} hrs</p>
              <p>Avg Fix Time: {report.personal.efficiency.averageFixTimeHours.toFixed(2)} hrs</p>
            </div>
          </section>

          <section className="report-chart-grid">
            <div className="chart-shell">
              <h3>Quality Metrics</h3>
              <p>Reopen Count: {report.personal.quality.reopenCount}</p>
              <p>Reopen %: {report.personal.quality.reopenPercentage.toFixed(2)}%</p>
              <p>Bugs Reopened After Fix: {report.personal.quality.bugsReopenedAfterFix}</p>
              <p>Won't Fix %: {report.personal.quality.wontFixPercentage.toFixed(2)}%</p>
              <p>Fix Quality Score: {report.personal.quality.fixQualityScore.toFixed(2)}</p>
            </div>

            <div className="chart-shell">
              <h3>Aging Buckets</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={agingBucketChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-shell">
              <h3>Top 5 Oldest Open Bugs</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={oldestBugsChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="bug" width={110} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ageDays" name="Age (days)" fill="#ef4444" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="report-section">
            <h3>Project Performance (Aggregated)</h3>
            <div className="kpi-grid">
              {projectCards.map((card) => (
                <SummaryCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
           
          </section>

          {report.adminComparison ? (
            <section className="report-chart-grid">
              <SimpleLine
                title="Assigned vs Resolved (Resolved Series)"
                points={report.adminComparison.assignedVsResolved.map((row) => ({
                  week: row.developerName,
                  resolved: row.resolved,
                }))}
              />
              <SimpleLine
                title="Avg Resolution Per Developer"
                points={report.adminComparison.avgResolutionPerDeveloper.map((row) => ({
                  week: row.developerName,
                  resolved: Number(row.averageResolutionTimeHours.toFixed(2)),
                }))}
              />
              <SimpleLine
                title="Reopen Rate Per Developer"
                points={report.adminComparison.reopenRatePerDeveloper.map((row) => ({
                  week: row.developerName,
                  resolved: Number(row.reopenRatePercentage.toFixed(2)),
                }))}
              />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default DeveloperPerformanceReportPage;
