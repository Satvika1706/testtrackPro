import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyAssignedBugs, type BugItem } from "../api/bug.api";

const DeveloperDashboardPage = () => {
  const [assignedBugs, setAssignedBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAssignedBugs = async () => {
      try {
        setLoading(true);
        const res = await getMyAssignedBugs({ page: 1, limit: 50 });
        setAssignedBugs(res.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void loadAssignedBugs();
  }, []);

  const openCount = assignedBugs.filter(
    (bug) => !["FIXED", "VERIFIED", "CLOSED"].includes(bug.status)
  ).length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Developer Dashboard</h2>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-gray-600 mb-2">Assigned Bugs</p>
          <h3 className="text-2xl font-bold">{loading ? "-" : assignedBugs.length}</h3>
        </div>
        <div className="card p-4">
          <p className="text-gray-600 mb-2">Open Work</p>
          <h3 className="text-2xl font-bold">{loading ? "-" : openCount}</h3>
        </div>
        <div className="card p-4">
          <p className="text-gray-600 mb-2">Reports</p>
          <h3 className="text-2xl font-bold">Analytics</h3>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="flex gap-2">
          <Link to="/bugs">
            <button>My Assigned Bugs</button>
          </Link>
          <Link to="/reports">
            <button className="secondary">Reports</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboardPage;
