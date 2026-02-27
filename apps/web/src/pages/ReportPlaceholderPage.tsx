import { Link, useLocation } from "react-router-dom";

const labelByPath: Record<string, string> = {
  "/reports/bugs": "Bug Report",
  "/reports/developer-performance": "Developer Performance Report",
  "/reports/tester-performance": "Tester Performance Report"
};

const ReportPlaceholderPage = () => {
  const location = useLocation();
  const reportName = labelByPath[location.pathname] ?? "Report";

  return (
    <div className="card">
      <h2 className="text-2xl">{reportName}</h2>
      <p className="text-gray-600 mb-4">
        This report route is ready and will be implemented next.
      </p>
      <Link to="/reports">
        <button type="button" className="secondary">
          Back to Reports
        </button>
      </Link>
    </div>
  );
};

export default ReportPlaceholderPage;
