import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  exportReport,
  getTesterPerformanceReport,
  type TesterPerformanceFilters
} from "../api/report.api";
import { getCurrentUser } from "../utils/auth";
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
  YAxis
} from "recharts";

interface TesterPerformanceResponse {
  filters: {
    selected: {
      fromDate: string | null;
      toDate: string | null;
      testRunId: string | null;
      testerId: number | null;
    };
    options: {
      testers: Array<{ id: number; email: string }>;
      testRuns: Array<{ id: string; name: string }>;
    };
  };
  kpis: {
    totalExecuted: number;
    passed: number;
    failed: number;
    bugDetectionRatePercentage: number;
    executionEfficiencyPercentage: number;
    coveragePercentage: number;
  };
  charts: {
    testExecutionCountPerTester: Array<{
      testerId: number;
      testerName: string;
      executed: number;
    }>;
    bugDetectionRatePerTester: Array<{
      testerId: number;
      testerName: string;
      bugDetectionRatePercentage: number;
    }>;
    executionTrendPerTester: Array<{
      testerId: number;
      testerName: string;
      points: Array<{ period: string; count: number }>;
    }>;
  };
  tables: {
    failedTestCases: Array<{
      testRunId: string;
      testRunName: string;
      testCaseId: string;
      title: string;
      module: string;
      testerId: number;
      testerName: string;
      completedAt: string | null;
      status: "FAILED";
    }>;
  };
}

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? "Failed to load report";
  }
  return "Failed to load report";
};

const truncateLabel = (value: string, max = 20) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const SummaryCard = ({ label, value }: { label: string; value: number | string }) => (
  <article className="kpi-card">
    <p className="kpi-label">{label}</p>
    <p className="kpi-value">{value}</p>
  </article>
);

const getInputDate = (value?: string) => (value ? value.slice(0, 10) : "");

const TesterPerformanceReportPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;
  const isTester = user?.role === "TESTER";
  const scopedTesterId = isTester && user ? String(user.userId) : "";

  const [report, setReport] = useState<TesterPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<TesterPerformanceFilters>({
    fromDate: "",
    toDate: "",
    testRunId: "",
    testerId: scopedTesterId
  });
  const printableRef = useRef<HTMLDivElement | null>(null);

  const loadReport = async (nextFilters: TesterPerformanceFilters) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getTesterPerformanceReport(nextFilters);
      setReport(res.data.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialFilters: TesterPerformanceFilters = {
      ...filters,
      testerId: scopedTesterId
    };
    setFilters(initialFilters);
    void loadReport(initialFilters);
  }, [scopedTesterId]);

  const handleFilterChange = (key: keyof TesterPerformanceFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadReport(filters);
  };

  const handleReset = () => {
    const resetFilters: TesterPerformanceFilters = {
      fromDate: "",
      toDate: "",
      testRunId: "",
      testerId: scopedTesterId
    };
    setFilters(resetFilters);
    void loadReport(resetFilters);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setError("");
    try {
      const res = await exportReport("tester-performance", filters);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tester-performance-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
    try {
      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) throw new Error("Unable to open print window");

      const html = printableRef.current.innerHTML;
      const style = `
        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
        h1, h2, h3 { margin: 0 0 12px 0; }
        .pdf-header { margin-bottom: 16px; }
        .pdf-meta { font-size: 12px; color: #334155; margin-bottom: 16px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
        .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
        .kpi-label { font-size: 12px; color: #475569; margin-bottom: 4px; }
        .kpi-value { font-size: 18px; font-weight: bold; }
        .pdf-chart { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px; page-break-inside: avoid; }
        .pdf-chart h3 { margin-bottom: 8px; font-size: 15px; }
        .table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f8fafc; }
        .report-section { margin-bottom: 16px; }
        @media print {
          .page-break { page-break-before: always; }
        }
      `;

      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Tester Performance Report</title>
            <style>${style}</style>
          </head>
          <body>${html}</body>
        </html>
      `);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
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
      report.filters.options.testers.find((tester) => String(tester.id) === (filters.testerId || scopedTesterId))
        ?.email ?? "All Testers";
    return `From: ${filters.fromDate || "Any"} | To: ${filters.toDate || "Any"} | Run: ${runName} | Tester: ${testerName}`;
  }, [report, filters, scopedTesterId]);

  const kpiCards = useMemo(
    () =>
      report
        ? [
            { label: "Total Executed", value: report.kpis.totalExecuted },
            { label: "Passed", value: report.kpis.passed },
            { label: "Failed", value: report.kpis.failed },
            {
              label: "Bug Detection Rate",
              value: `${report.kpis.bugDetectionRatePercentage.toFixed(2)}%`
            },
            {
              label: "Execution Efficiency",
              value: `${report.kpis.executionEfficiencyPercentage.toFixed(2)}%`
            },
            {
              label: "Coverage %",
              value: `${report.kpis.coveragePercentage.toFixed(2)}%`
            }
          ]
        : [],
    [report]
  );

  const executionData = report?.charts.testExecutionCountPerTester ?? [];
  const bugRateData = report?.charts.bugDetectionRatePerTester ?? [];
  const trendData = useMemo(() => {
    if (!report) return [];
    const periods = [
      ...new Set(
        report.charts.executionTrendPerTester.flatMap((tester) =>
          tester.points.map((point) => point.period)
        )
      )
    ].sort((a, b) => a.localeCompare(b));

    return periods.map((period) => {
      const row: Record<string, string | number> = { period };
      for (const tester of report.charts.executionTrendPerTester) {
        row[tester.testerName] =
          tester.points.find((point) => point.period === period)?.count ?? 0;
      }
      return row;
    });
  }, [report]);

  if (!hasAccess) {
    return (
      <div className="card">
        <h2 className="text-2xl">Tester Performance Report</h2>
        <p className="text-gray-600">You do not have permission to view this report.</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header report-header-row">
        <div>
          <h2 className="text-2xl font-bold">Tester Performance Report</h2>
          <p className="text-gray-600">
            Tester execution outcomes, failure-based detection rate, and trend analysis.
          </p>
        </div>
        <div className="report-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleExportPdf}
            disabled={isLoading || isExportingPdf}
          >
            {isExportingPdf ? "Preparing PDF..." : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || isExporting}
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <form className="report-filters card" onSubmit={handleApplyFilters}>
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="tester-from-date">From Date</label>
            <input
              id="tester-from-date"
              type="date"
              value={getInputDate(filters.fromDate)}
              onChange={(event) => handleFilterChange("fromDate", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tester-to-date">To Date</label>
            <input
              id="tester-to-date"
              type="date"
              value={getInputDate(filters.toDate)}
              onChange={(event) => handleFilterChange("toDate", event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tester-test-run">Test Run</label>
            <select
              id="tester-test-run"
              value={filters.testRunId}
              onChange={(event) => handleFilterChange("testRunId", event.target.value)}
            >
              <option value="">All Test Runs</option>
              {(report?.filters.options.testRuns ?? []).map((run) => (
                <option key={run.id} value={run.id}>
                  {run.name}
                </option>
              ))}
            </select>
          </div>
          {!isTester ? (
            <div className="form-group">
              <label htmlFor="tester-filter">Tester</label>
              <select
                id="tester-filter"
                value={filters.testerId}
                onChange={(event) => handleFilterChange("testerId", event.target.value)}
              >
                <option value="">All Testers</option>
                {(report?.filters.options.testers ?? []).map((tester) => (
                  <option key={tester.id} value={String(tester.id)}>
                    {tester.email}
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
            <h1>Tester Performance Report</h1>
            <p className="pdf-meta">{filterSummary}</p>
          </div>

          <section className="kpi-grid report-section">
            {kpiCards.map((card) => (
              <SummaryCard key={card.label} label={card.label} value={card.value} />
            ))}
          </section>

          <section className="report-chart-grid report-section">
            <div className="chart-shell pdf-chart tester-chart-card">
              <h3>Test Execution Count per Tester</h3>
              <ResponsiveContainer width="100%" height={Math.max(280, executionData.length * 44)}>
                <BarChart
                  data={executionData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="testerName"
                    width={180}
                    tickFormatter={(value) => truncateLabel(String(value), 26)}
                  />
                  <Tooltip
                    formatter={(value: number | string | undefined) =>
                      Number(value ?? 0).toFixed(2)
                    }
                  />
                  <Bar dataKey="executed" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-shell pdf-chart tester-chart-card">
              <h3>Bug Detection Rate per Tester</h3>
              <ResponsiveContainer width="100%" height={Math.max(280, bugRateData.length * 44)}>
                <BarChart
                  data={bugRateData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="testerName"
                    width={180}
                    tickFormatter={(value) => truncateLabel(String(value), 26)}
                  />
                  <Tooltip
                    formatter={(value: number | string | undefined) =>
                      `${Number(value ?? 0).toFixed(2)}%`
                    }
                  />
                  <Bar
                    dataKey="bugDetectionRatePercentage"
                    fill="#ef4444"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-shell pdf-chart tester-chart-card tester-trend-card">
              <h3>Execution Trend per Tester</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendData} margin={{ top: 8, right: 18, left: 4, bottom: 46 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {report.charts.executionTrendPerTester.map((series, index) => {
                    const colors = [
                      "#4f46e5",
                      "#10b981",
                      "#f59e0b",
                      "#ef4444",
                      "#0ea5e9",
                      "#9333ea",
                      "#14b8a6"
                    ];
                    return (
                      <Line
                        key={series.testerId}
                        type="monotone"
                        dataKey={series.testerName}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card report-section">
            <h3>Failed Test Cases</h3>
            <div className="table-container table-wrap">
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
                    report.tables.failedTestCases.map((row) => (
                      <tr key={`${row.testRunId}-${row.testCaseId}-${row.testerId}`}>
                        <td>{row.testRunName}</td>
                        <td>{row.testCaseId}</td>
                        <td>{row.title}</td>
                        <td>{row.module}</td>
                        <td className="ellipsis-cell" title={row.testerName}>
                          {row.testerName}
                        </td>
                        <td>{formatDate(row.completedAt)}</td>
                        <td>
                          <span className="badge danger">{row.status}</span>
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

export default TesterPerformanceReportPage;
