import { Link } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";

const REPORT_ACCESS_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"] as const;

const reportCards = [
  {
    title: "Test Execution Report",
    description:
      "Track execution progress, pass/fail trends, and module/tester-level delivery quality.",
    route: "/reports/test-execution",
    enabled: true
  },
  {
    title: "Bug Report",
    description:
      "Analyze bug severity, closure trends, and ownership across the release cycle.",
    route: "/reports/bugs",
    enabled: true
  },
  {
    title: "Developer Performance Report",
    description:
      "Measure fix throughput, turnaround time, and verification outcomes by developer.",
    route: "/reports/developer-performance",
    enabled: true
  },
  {
    title: "Tester Performance Report",
    description:
      "Review tester execution coverage, defect discovery rates, and report quality.",
    route: "/reports/tester-performance",
    enabled: true
  }
];

const ReportsPage = () => {
  const user = getCurrentUser();
  const hasAccess = user ? REPORT_ACCESS_ROLES.includes(user.role) : false;

  if (!hasAccess) {
    return (
      <div className="card">
        <h2 className="text-2xl">Reports & Analytics</h2>
        <p className="text-gray-600">
          You do not have permission to view reports.
        </p>
      </div>
    );
  }

  const visibleCards = reportCards.filter((card) => {
    if (!user) return false;
    if (user.role === "DEVELOPER" && card.title === "Tester Performance Report") {
      return false;
    }
    return true;
  });

  return (
    <div className="reports-page">
      <div className="page-header">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <p className="text-gray-600">
          Choose a report to view detailed quality and execution insights.
        </p>
      </div>

      <div className="report-grid">
        {visibleCards.map((card) => (
          <article key={card.route} className="report-card">
            <div>
              <h3 className="report-card-title">{card.title}</h3>
              <p className="report-card-description">{card.description}</p>
            </div>

            <Link to={card.route} className="report-link-wrapper">
              <button type="button" className={card.enabled ? "" : "secondary"}>
                View Report
              </button>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
