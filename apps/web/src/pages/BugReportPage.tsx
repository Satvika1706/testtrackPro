import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { exportReport, getBugReport, type BugReportFilters } from "../api/report.api";
import { getCurrentUser } from "../utils/auth";
import { exportElementAsPdf } from "../utils/reportPdf";

type GroupBy = "week" | "month";

interface BugReportResponse {
  filters: {
    selected: {
      fromDate: string | null;
      toDate: string | null;
      severity: string | null;
      status: string | null;
      developerId: number | null;
      groupBy: GroupBy;
    };
    options: {
      severities: string[];
      statuses: string[];
      developers: Array<{ id: number; email: string }>;
    };
  };
  kpis: {
    totalBugs: number;
    openBugs: number;
    closedBugs: number;
    reopenedBugs: number;
    averageResolutionTimeHours: number;
    overdueBugs: number;
  };
  charts: {
    bugTrendOverTime: Array<{ period: string; count: number }>;
    severityDistribution: Array<{ severity: string; count: number }>;
    bugsByDeveloper: Array<{
      developerId: number | null;
      developerName: string;
      count: number;
    }>;
    statusDistribution: Array<{ status: string; count: number }>;
  };
  tables: {
    agingBugs: Array<{
      bugId: string;
      title: string;
      severity: string;
      status: string;
      developerId: number | null;
      developerName: string;
      createdAt: string;
      ageDays: number;
    }>;
    highSeverityBugs: Array<{
      bugId: string;
      title: string;
      severity: string;
      status: string;
      developerId: number | null;
      developerName: string;
      createdAt: string;
      resolutionTimeHours: number | null;
    }>;
  };
}

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

const severityColor: Record<string, string> = {
  BLOCKER: "#b91c1c",
  CRITICAL: "#ef4444",
  MAJOR: "#f59e0b",
  MINOR: "#3b82f6",
  TRIVIAL: "#64748b"
};

const statusPalette = [
  "#4f46e5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#14b8a6",
  "#84cc16",
  "#9333ea",
  "#f97316",
  "#64748b",
  "#0ea5e9",
  "#16a34a"
];

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? "Failed to load report";
  }
  return "Failed to load report";
};

const formatDate = (value: string) => new Date(value).toLocaleString();
const formatStatus = (value: string) => value.replace(/_/g, " ");

const SummaryCard = ({ label, value }: { label: string; value: number | string }) => (
  <article className="kpi-card">
    <p className="kpi-label">{label}</p>
    <p className="kpi-value">{value}</p>
  </article>
);

const LineChart = ({ data }: { data: Array<{ period: string; count: number }> }) => {
  const max = Math.max(...data.map((item) => item.count), 1);
  const width = 640;
  const height = 220;
  const leftPad = 36;
  const bottomPad = 24;
  const plotWidth = width - leftPad - 12;
  const plotHeight = height - bottomPad - 12;

  const line = data
    .map((item, index) => {
      const x = leftPad + (index * plotWidth) / Math.max(data.length - 1, 1);
      const y = 12 + plotHeight - (item.count / max) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-shell">
      <h3>Bug Trend Over Time</h3>
      {data.length === 0 ? (
        <p className="text-gray-600">No trend data available.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img">
            <line x1={leftPad} y1={12} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" />
            <line x1={leftPad} y1={height - bottomPad} x2={width - 12} y2={height - bottomPad} stroke="#cbd5e1" />
            <polyline fill="none" stroke="var(--primary-color)" strokeWidth="3" points={line} />
            {data.map((item, index) => {
              const x = leftPad + (index * plotWidth) / Math.max(data.length - 1, 1);
              const y = 12 + plotHeight - (item.count / max) * plotHeight;
              return <circle key={item.period} cx={x} cy={y} r="4" fill="var(--primary-color)" />;
            })}
          </svg>
          <div className="chart-axis-labels">
            {data.map((item) => (
              <span key={item.period}>{item.period}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const SeverityPie = ({ data }: { data: Array<{ severity: string; count: number }> }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const stops = data.reduce((acc, item, index) => {
    const previous = index === 0 ? 0 : acc[index - 1].end;
    const ratio = total ? (item.count / total) * 100 : 0;
    acc.push({
      start: previous,
      end: previous + ratio,
      color: severityColor[item.severity] ?? "#94a3b8",
      label: item.severity
    });
    return acc;
  }, [] as Array<{ start: number; end: number; color: string; label: string }>);

  const gradient = stops.map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`).join(", ");

  return (
    <div className="chart-shell">
      <h3>Severity Distribution</h3>
      <div className="pie-wrap">
        <div
          className="pie-chart"
          style={{
            background: total ? `conic-gradient(${gradient})` : "#e2e8f0"
          }}
        />
        <div className="pie-legend">
          {data.map((item) => (
            <div key={item.severity} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: severityColor[item.severity] ?? "#94a3b8" }}
              />
              <span>
                {item.severity} ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HorizontalBars = ({
  title,
  data,
  keyLabel,
  keyValue
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  keyLabel: string;
  keyValue: string;
}) => {
  const max = Math.max(...data.map((entry) => Number(entry[keyValue])), 1);

  return (
    <div className="chart-shell">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-600">No data available.</p>
      ) : (
        <div className="bar-chart-wrap">
          {data.map((entry, index) => (
            <div className="bar-row" key={`${String(entry[keyLabel])}-${index}`}>
              <span className="bar-label">{String(entry[keyLabel])}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(Number(entry[keyValue]) / max) * 100}%`,
                    backgroundColor: statusPalette[index % statusPalette.length]
                  }}
                />
              </div>
              <span className="bar-value">{Number(entry[keyValue])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getInputDate = (value?: string) => (value ? value.slice(0, 10) : "");

const BugReportPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;

  const [report, setReport] = useState<BugReportResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [filters, setFilters] = useState<BugReportFilters>({
    fromDate: "",
    toDate: "",
    severity: "",
    status: "",
    developerId: "",
    groupBy: "month"
  });
  const printableRef = useRef<HTMLDivElement | null>(null);

  const loadReport = async (nextFilters: BugReportFilters) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getBugReport(nextFilters);
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

  const handleFilterChange = (key: keyof BugReportFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadReport(filters);
  };

  const handleReset = () => {
    const resetFilters: BugReportFilters = {
      fromDate: "",
      toDate: "",
      severity: "",
      status: "",
      developerId: "",
      groupBy: "month"
    };
    setFilters(resetFilters);
    void loadReport(resetFilters);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const res = await exportReport("bugs", filters);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bug-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
      await exportElementAsPdf("Bug Report", printableRef.current);
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
      )?.email ?? "All Developers";
    return `From: ${filters.fromDate || "Any"} | To: ${filters.toDate || "Any"} | Severity: ${filters.severity || "All"} | Status: ${filters.status || "All"} | Developer: ${developerName} | Group By: ${filters.groupBy || "month"}`;
  }, [report, filters]);

  const kpiCards = useMemo(
    () =>
      report
        ? [
            { label: "Total Bugs", value: report.kpis.totalBugs },
            { label: "Open Bugs", value: report.kpis.openBugs },
            { label: "Closed Bugs", value: report.kpis.closedBugs },
            { label: "Reopened Bugs", value: report.kpis.reopenedBugs },
            {
              label: "Avg Resolution Time",
              value: `${report.kpis.averageResolutionTimeHours.toFixed(2)} hrs`
            },
            { label: "Overdue Bugs", value: report.kpis.overdueBugs }
          ]
        : [],
    [report]
  );

  if (!hasAccess) {
    return (
      <div className="card">
        <h2 className="text-2xl">Bug Report</h2>
        <p className="text-gray-600">You do not have permission to view this report.</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header report-header-row">
        <div>
          <h2 className="text-2xl font-bold">Bug Report</h2>
          <p className="text-gray-600">
            Bug volume, severity, ownership, and aging insights across selected time windows.
          </p>
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleExportPdf}
            disabled={isExportingPdf || isLoading}
          >
            {isExportingPdf ? "Preparing PDF..." : "Export PDF"}
          </button>
          <button type="button" onClick={handleExport} disabled={isExporting || isLoading}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <form className="report-filters card" onSubmit={handleApplyFilters}>
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="bug-from-date">From Date</label>
            <input
              id="bug-from-date"
              type="date"
              value={getInputDate(filters.fromDate)}
              onChange={(event) => handleFilterChange("fromDate", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="bug-to-date">To Date</label>
            <input
              id="bug-to-date"
              type="date"
              value={getInputDate(filters.toDate)}
              onChange={(event) => handleFilterChange("toDate", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="bug-severity">Severity</label>
            <select
              id="bug-severity"
              value={filters.severity}
              onChange={(event) => handleFilterChange("severity", event.target.value)}
            >
              <option value="">All Severities</option>
              {(report?.filters.options.severities ?? []).map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="bug-status">Status</label>
            <select
              id="bug-status"
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              <option value="">All Statuses</option>
              {(report?.filters.options.statuses ?? []).map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="bug-developer">Developer</label>
            <select
              id="bug-developer"
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
          <div className="form-group">
            <label htmlFor="bug-group-by">Trend Grouping</label>
            <select
              id="bug-group-by"
              value={filters.groupBy}
              onChange={(event) => handleFilterChange("groupBy", event.target.value)}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
            </select>
          </div>
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
            <h1>Bug Report</h1>
            <p className="pdf-meta">{filterSummary}</p>
          </div>
          <section className="kpi-grid">
            {kpiCards.map((card) => (
              <SummaryCard key={card.label} label={card.label} value={card.value} />
            ))}
          </section>

          <section className="report-chart-grid">
            <LineChart data={report.charts.bugTrendOverTime} />
            <SeverityPie data={report.charts.severityDistribution} />
            <HorizontalBars
              title="Bugs by Developer"
              data={report.charts.bugsByDeveloper.map((row) => ({
                label: row.developerName,
                value: row.count
              }))}
              keyLabel="label"
              keyValue="value"
            />
            <HorizontalBars
              title="Status Distribution"
              data={report.charts.statusDistribution.map((row) => ({
                label: formatStatus(row.status),
                value: row.count
              }))}
              keyLabel="label"
              keyValue="value"
            />
          </section>

          <section className="card">
            <h3>Aging Bugs</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Bug ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Developer</th>
                    <th>Created At</th>
                    <th>Age (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tables.agingBugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500">
                        No aging bugs for selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.tables.agingBugs.map((bug) => (
                      <tr key={bug.bugId}>
                        <td>{bug.bugId}</td>
                        <td>{bug.title}</td>
                        <td>{bug.severity}</td>
                        <td>{formatStatus(bug.status)}</td>
                        <td>{bug.developerName}</td>
                        <td>{formatDate(bug.createdAt)}</td>
                        <td>{bug.ageDays}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3>High Severity Bugs</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Bug ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Developer</th>
                    <th>Created At</th>
                    <th>Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tables.highSeverityBugs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500">
                        No high severity bugs for selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.tables.highSeverityBugs.map((bug) => (
                      <tr key={`${bug.bugId}-${bug.createdAt}`}>
                        <td>{bug.bugId}</td>
                        <td>{bug.title}</td>
                        <td>{bug.severity}</td>
                        <td>{formatStatus(bug.status)}</td>
                        <td>{bug.developerName}</td>
                        <td>{formatDate(bug.createdAt)}</td>
                        <td>
                          {typeof bug.resolutionTimeHours === "number"
                            ? `${bug.resolutionTimeHours.toFixed(2)} hrs`
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default BugReportPage;
