import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBugs, getMyAssignedBugs, type BugItem } from "../api/bug.api";
import { getCurrentUser } from "../utils/auth";

const formatStatus = (status: string) => status.replace(/_/g, " ").replace("WONT", "WON'T");

const getBadge = (kind: "severity" | "priority" | "status", value: string) => {
  if (kind === "severity") {
    if (value === "BLOCKER" || value === "CRITICAL") return "badge danger";
    if (value === "MAJOR") return "badge warning";
    if (value === "MINOR") return "badge info";
    return "badge neutral";
  }

  if (kind === "priority") {
    if (value === "P1") return "badge danger";
    if (value === "P2") return "badge warning";
    if (value === "P3") return "badge info";
    return "badge neutral";
  }

  if (value === "IN_PROGRESS") return "badge warning";
  if (value === "FIXED" || value === "VERIFIED") return "badge success";
  if (value === "REOPENED") return "badge danger";
  if (value === "OPEN" || value === "TRIAGE_PENDING" || value === "TRIAGED") return "badge info";
  return "badge neutral";
};

const BugListPage = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);

  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isDeveloper = user?.role === "DEVELOPER";
  const mode: "all" | "my" = isDeveloper ? "my" : "all";

  const loadBugs = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "my") {
        const res = await getMyAssignedBugs({ page: 1, limit: 50 });
        setBugs(res.data.data || []);
      } else {
        const res = await getAllBugs();
        setBugs(res.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBugs();
  }, [mode]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {isDeveloper ? "My Assigned Bugs" : "Bugs"}
        </h2>
        <div className="flex gap-2">
          {(user?.role === "TESTER" || user?.role === "ADMIN") && (
            <button onClick={() => navigate("/bugs/create")}>+ Report Bug</button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "var(--radius-md)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading bugs...</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Bug ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {bugs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: "2rem" }}>No bugs found.</td>
                </tr>
              ) : (
                bugs.map((bug) => (
                  <tr key={bug.id} className="bug-row" onClick={() => navigate(`/bugs/${bug.id}`)}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--primary-color)" }}>
                        {bug.bugId}
                      </span>
                    </td>
                    <td className="font-medium">{bug.title}</td>
                    <td><span className={getBadge("severity", bug.severity)}>{bug.severity}</span></td>
                    <td><span className={getBadge("priority", bug.priority)}>{bug.priority}</span></td>
                    <td><span className={getBadge("status", bug.status)}>{formatStatus(bug.status)}</span></td>
                    <td>{bug.assignedTo?.email || "-"}</td>
                    <td>{bug.createdBy?.email || `User ${bug.createdById}`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BugListPage;
