import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  exportReport,
  getTestExecutionReport,
  type TestExecutionReportFilters
} from "../api/report.api";
import { getCurrentUser } from "../utils/auth";
import { exportElementAsPdf } from "../utils/reportPdf";

type StatusKey = "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED" | "IN_PROGRESS";

interface OptionItem {
  id: string | number;
  name?: string;
  email?: string;
}

interface ReportResponse {
  filters: {
    selected: {
      testRunId: string | null;
      fromDate: string | null;
      toDate: string | null;
      module: string | null;
      testerId: number | null;
    };
    options: {
      testRuns: Array<{ id: string; name: string }>;
      testers: Array<{ id: number; email: string }>;
      modules: string[];
    };
  };
  kpis: {
    totalTestCases: number;
    executed: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    inProgress: number;
    completionPercentage: number;
    passRatePercentage: number;
  };
  charts: {
    executionTimeline: Array<{ date: string; count: number }>;
    statusBreakdown: Array<{ status: StatusKey; count: number }>;
    executionByTester: Array<{
      testerId: number | null;
      testerName: string;
      passed: number;
      failed: number;
      blocked: number;
      skipped: number;
      inProgress: number;
    }>;
    executionByModule: Array<{ module: string; executed: number }>;
  };
  tables: {
    failedTestCases: Array<{
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
  };
}

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

const statusColorMap: Record<StatusKey, string> = {
  PASSED: "#10b981",
  FAILED: "#ef4444",
  BLOCKED: "#f59e0b",
  SKIPPED: "#64748b",
  IN_PROGRESS: "#3b82f6"
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? "Failed to load report";
  }
  return "Failed to load report";
};

const SummaryCard = ({
  label,
  value
}: {
  label: string;
  value: number | string;
}) => (
  <article className="kpi-card">
    <p className="kpi-label">{label}</p>
    <p className="kpi-value">{value}</p>
  </article>
);

const LineChart = ({ points }: { points: Array<{ date: string; count: number }> }) => {
  const max = Math.max(...points.map((point) => point.count), 1);
  const width = 640;
  const height = 220;
  const leftPad = 36;
  const bottomPad = 24;
  const plotWidth = width - leftPad - 12;
  const plotHeight = height - bottomPad - 12;

  const line = points
    .map((point, index) => {
      const x = leftPad + (index * plotWidth) / Math.max(points.length - 1, 1);
      const y = 12 + plotHeight - (point.count / max) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-shell">
      <h3>Execution Timeline</h3>
      {points.length === 0 ? (
        <p className="text-gray-600">No timeline data available.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img">
            <line x1={leftPad} y1={12} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" />
            <line
              x1={leftPad}
              y1={height - bottomPad}
              x2={width - 12}
              y2={height - bottomPad}
              stroke="#cbd5e1"
            />
            <polyline
              fill="none"
              stroke="var(--primary-color)"
              strokeWidth="3"
              points={line}
            />
            {points.map((point, index) => {
              const x = leftPad + (index * plotWidth) / Math.max(points.length - 1, 1);
              const y = 12 + plotHeight - (point.count / max) * plotHeight;
              return <circle key={point.date} cx={x} cy={y} r="4" fill="var(--primary-color)" />;
            })}
          </svg>

          <div className="chart-axis-labels">
            {points.map((point) => (
              <span key={point.date}>{point.date.slice(5)}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatusBreakdown = ({
  data
}: {
  data: Array<{ status: StatusKey; count: number }>;
}) => {
  const max = Math.max(...data.map((entry) => entry.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const pieStops = data.reduce((acc, item, index) => {
    const previous = index === 0 ? 0 : acc[index - 1].end;
    const ratio = total ? (item.count / total) * 100 : 0;
    acc.push({
      start: previous,
      end: previous + ratio,
      color: statusColorMap[item.status],
      label: item.status
    });
    return acc;
  }, [] as Array<{ start: number; end: number; color: string; label: string }>);

  const gradient = pieStops
    .map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`)
    .join(", ");

  return (
    <div className="chart-shell">
      <h3>Status Breakdown</h3>
      <div className="status-breakdown-layout">
        <div className="bar-chart-wrap">
          {data.map((entry) => (
            <div key={entry.status} className="bar-row">
              <span className="bar-label">{entry.status}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(entry.count / max) * 100}%`,
                    backgroundColor: statusColorMap[entry.status]
                  }}
                />
              </div>
              <span className="bar-value">{entry.count}</span>
            </div>
          ))}
        </div>

        <div className="pie-wrap">
          <div
            className="pie-chart"
            style={{
              background: total ? `conic-gradient(${gradient})` : "#e2e8f0"
            }}
          />
          <div className="pie-legend">
            {data.map((entry) => (
              <div key={entry.status} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: statusColorMap[entry.status] }}
                />
                <span>
                  {entry.status} ({entry.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TesterStackedBars = ({
  data
}: {
  data: ReportResponse["charts"]["executionByTester"];
}) => {
  const max = Math.max(
    ...data.map((entry) => entry.passed + entry.failed + entry.blocked + entry.skipped + entry.inProgress),
    1
  );

  return (
    <div className="chart-shell">
      <h3>Execution by Tester</h3>
      {data.length === 0 ? (
        <p className="text-gray-600">No tester data available.</p>
      ) : (
        <div className="stacked-list">
          {data.map((entry) => {
            const total =
              entry.passed +
              entry.failed +
              entry.blocked +
              entry.skipped +
              entry.inProgress;
            return (
              <div key={`${entry.testerName}-${entry.testerId ?? "unassigned"}`} className="stacked-row">
                <span className="stacked-label">{entry.testerName}</span>
                <div className="stacked-track">
                  {(Object.keys(statusColorMap) as StatusKey[]).map((status) => {
                    const value =
                      status === "PASSED"
                        ? entry.passed
                        : status === "FAILED"
                          ? entry.failed
                          : status === "BLOCKED"
                            ? entry.blocked
                            : status === "SKIPPED"
                              ? entry.skipped
                              : entry.inProgress;
                    const widthPercent = total ? (value / max) * 100 : 0;
                    return (
                      <div
                        key={`${entry.testerName}-${status}`}
                        title={`${status}: ${value}`}
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: statusColorMap[status]
                        }}
                      />
                    );
                  })}
                </div>
                <span className="bar-value">{total}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ModuleBars = ({
  data
}: {
  data: ReportResponse["charts"]["executionByModule"];
}) => {
  const max = Math.max(...data.map((item) => item.executed), 1);

  return (
    <div className="chart-shell">
      <h3>Execution by Module</h3>
      {data.length === 0 ? (
        <p className="text-gray-600">No module data available.</p>
      ) : (
        <div className="module-grid">
          {data.map((item) => (
            <div key={item.module} className="module-bar-item">
              <div
                className="module-bar"
                style={{
                  height: `${Math.max((item.executed / max) * 100, 6)}%`
                }}
              />
              <span className="module-name">{item.module}</span>
              <span className="module-value">{item.executed}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getInputDate = (value?: string) => (value ? value.slice(0, 10) : "");

const TestExecutionReportPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [filters, setFilters] = useState<TestExecutionReportFilters>({
    testRunId: "",
    fromDate: "",
    toDate: "",
    module: "",
    testerId: ""
  });
  const printableRef = useRef<HTMLDivElement | null>(null);

  const loadReport = async (nextFilters: TestExecutionReportFilters) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getTestExecutionReport(nextFilters);
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

  const handleFilterChange = (key: keyof TestExecutionReportFilters, value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadReport(filters);
  };

  const handleResetFilters = () => {
    const resetFilters: TestExecutionReportFilters = {
      testRunId: "",
      fromDate: "",
      toDate: "",
      module: "",
      testerId: ""
    };
    setFilters(resetFilters);
    void loadReport(resetFilters);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const res = await exportReport("test-execution", filters);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-execution-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
      await exportElementAsPdf("Test Execution Report", printableRef.current);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filterSummary = useMemo(() => {
    if (!report) return "";
    const runName =
      report.filters.options.testRuns.find((run) => run.id === filters.testRunId)?.name ??
      "All Test Runs";
    const testerName =
      report.filters.options.testers.find((tester) => String(tester.id) === filters.testerId)
        ?.email ?? "All Testers";
    return `From: ${filters.fromDate || "Any"} | To: ${filters.toDate || "Any"} | Run: ${runName} | Module: ${filters.module || "All Modules"} | Tester: ${testerName}`;
  }, [report, filters]);

  const kpiCards = useMemo(
    () =>
      report
        ? [
            { label: "Total Test Cases", value: report.kpis.totalTestCases },
            { label: "Executed", value: report.kpis.executed },
            { label: "Passed", value: report.kpis.passed },
            { label: "Failed", value: report.kpis.failed },
            { label: "Blocked", value: report.kpis.blocked },
            { label: "Skipped", value: report.kpis.skipped },
            { label: "In Progress", value: report.kpis.inProgress },
            {
              label: "Completion %",
              value: formatPercent(report.kpis.completionPercentage)
            },
            { label: "Pass Rate %", value: formatPercent(report.kpis.passRatePercentage) }
          ]
        : [],
    [report]
  );

  if (!hasAccess) {
    return (
      <div className="card">
        <h2 className="text-2xl">Test Execution Report</h2>
        <p className="text-gray-600">
          You do not have permission to view this report.
        </p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header report-header-row">
        <div>
          <h2 className="text-2xl font-bold">Test Execution Report</h2>
          <p className="text-gray-600">
            Execution health summary with trends, status breakdown, and failed test case details.
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
            <label htmlFor="filter-test-run">Test Run</label>
            <select
              id="filter-test-run"
              value={filters.testRunId}
              onChange={(event) => handleFilterChange("testRunId", event.target.value)}
            >
              <option value="">All Test Runs</option>
              {(report?.filters.options.testRuns ?? []).map((run: OptionItem) => (
                <option key={run.id} value={String(run.id)}>
                  {run.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="filter-from-date">From Date</label>
            <input
              id="filter-from-date"
              type="date"
              value={getInputDate(filters.fromDate)}
              onChange={(event) => handleFilterChange("fromDate", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="filter-to-date">To Date</label>
            <input
              id="filter-to-date"
              type="date"
              value={getInputDate(filters.toDate)}
              onChange={(event) => handleFilterChange("toDate", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="filter-module">Module</label>
            <select
              id="filter-module"
              value={filters.module}
              onChange={(event) => handleFilterChange("module", event.target.value)}
            >
              <option value="">All Modules</option>
              {(report?.filters.options.modules ?? []).map((moduleName) => (
                <option key={moduleName} value={moduleName}>
                  {moduleName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="filter-tester">Tester</label>
            <select
              id="filter-tester"
              value={filters.testerId}
              onChange={(event) => handleFilterChange("testerId", event.target.value)}
            >
              <option value="">All Testers</option>
              {(report?.filters.options.testers ?? []).map((tester: OptionItem) => (
                <option key={tester.id} value={String(tester.id)}>
                  {tester.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="report-actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Apply Filters"}
          </button>
          <button type="button" className="secondary" onClick={handleResetFilters} disabled={isLoading}>
            Reset
          </button>
        </div>
      </form>

      {error ? <div className="alert error">{error}</div> : null}

      {report ? (
        <div ref={printableRef}>
          <div className="pdf-header report-section">
            <h1>Test Execution Report</h1>
            <p className="pdf-meta">{filterSummary}</p>
          </div>
          <section className="kpi-grid">
            {kpiCards.map((card) => (
              <SummaryCard key={card.label} label={card.label} value={card.value} />
            ))}
          </section>

          <section className="report-chart-grid">
            <LineChart points={report.charts.executionTimeline} />
            <StatusBreakdown data={report.charts.statusBreakdown} />
            <TesterStackedBars data={report.charts.executionByTester} />
            <ModuleBars data={report.charts.executionByModule} />
          </section>

          <section className="card">
            <h3>Failed Test Case Details</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Test Run</th>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Module</th>
                    <th>Tester</th>
                    <th>Completed At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tables.failedTestCases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500">
                        No failed test cases for selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.tables.failedTestCases.map((failed) => (
                      <tr key={`${failed.testRunId}-${failed.testCaseId}`}>
                        <td>{failed.testRunName}</td>
                        <td>{failed.testCaseId}</td>
                        <td>{failed.title}</td>
                        <td>{failed.module}</td>
                        <td>{failed.testerName}</td>
                        <td>{formatDate(failed.completedAt)}</td>
                        <td>
                          <span className="badge danger">{failed.status}</span>
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

export default TestExecutionReportPage;
