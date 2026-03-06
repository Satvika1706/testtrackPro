import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  completeExecution,
  getExecutionComparison,
  getExecutionSteps,
  getTestRunItem,
  pauseExecution,
  resumeExecution,
  startExecution,
  updateStepStatus,
} from "../api/execution.api";
import { createBugFromExecution } from "../api/bug.api";
import { getCurrentUser } from "../utils/auth";

interface Step {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  status?: string;
}

interface TestRunItem {
  id: string;
  status: string;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedTime: number;
  totalTimeSeconds: number;
  reExecutionOfId?: string | null;
}

const ExecutionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canExecute = currentUser?.role === "TESTER";

  const [item, setItem] = useState<TestRunItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [displayTime, setDisplayTime] = useState(0);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<any>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const itemRes = await getTestRunItem(id);
      const fetchedItem = itemRes.data.data as TestRunItem;
      setItem(fetchedItem);

      const stepRes = await getExecutionSteps(id);
      setSteps(stepRes.data.data);

      if (fetchedItem?.reExecutionOfId) {
        const compareRes = await getExecutionComparison(id);
        setComparison(compareRes.data.data);
      } else {
        setComparison(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch execution data");
    }
  };

  useEffect(() => {
    void fetchData();
  }, [id]);

  useEffect(() => {
    if (!item) return;

    let interval: any;

    if (item.status === "IN_PROGRESS" && item.startedAt) {
      interval = setInterval(() => {
        const now = Date.now();
        const startedAt = item.startedAt;
        if (!startedAt) return;

        const started = new Date(startedAt).getTime();
        const current = item.accumulatedTime + Math.floor((now - started) / 1000);

        setDisplayTime(current);
      }, 1000);
    } else if (item.status === "PASSED" || item.status === "FAILED") {
      setDisplayTime(item.totalTimeSeconds);
    } else {
      setDisplayTime(item.accumulatedTime);
    }

    return () => clearInterval(interval);
  }, [item]);

  const denyIfNoTester = () => {
    if (canExecute) return false;
    const message = "Access denied: only testers can run test execution.";
    setError(message);
    alert(message);
    return true;
  };

  const handleStart = async () => {
    if (!id || denyIfNoTester()) return;
    try {
      setError("");
      await startExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start execution");
    }
  };

  const handlePause = async () => {
    if (!id || denyIfNoTester()) return;
    try {
      setError("");
      await pauseExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to pause execution");
    }
  };

  const handleResume = async () => {
    if (!id || denyIfNoTester()) return;
    try {
      setError("");
      await resumeExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resume execution");
    }
  };

  const handleComplete = async () => {
    if (!id || denyIfNoTester()) return;
    try {
      setError("");
      await completeExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete execution");
    }
  };

  const handleStepUpdate = async (stepId: string, status: string) => {
    if (denyIfNoTester()) return;
    try {
      await updateStepStatus(stepId, status);
      setSteps((prev) =>
        prev.map((step) => (step.id === stepId ? { ...step, status } : step))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update step");
    }
  };

  const handleFailAndCreateBug = async (stepId: string) => {
    if (!id || denyIfNoTester()) return;
    try {
      await updateStepStatus(stepId, "FAIL");
      setSteps((prev) =>
        prev.map((step) => (step.id === stepId ? { ...step, status: "FAIL" } : step))
      );

      const res = await createBugFromExecution({
        executionId: id,
        failedStepId: stepId,
        severity: "MAJOR",
        priority: "P2",
      });

      alert(`Bug created: ${res.data.bugId}`);
      navigate("/bugs");
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to create bug");
    }
  };

  if (!item) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Execution</h2>
      {!canExecute ? (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontSize: "0.9rem",
          }}
        >
          Access denied: only testers can run test execution.
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      ) : null}

      <h3>
        Timer: {Math.floor(displayTime / 60)}m {displayTime % 60}s
      </h3>

      {comparison?.hasComparison ? (
        <div
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            background: "#f8fafc",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>Re-execution Comparison</h4>
          <p style={{ margin: "0 0 8px 0" }}>
            Improved: {comparison.summary.improved} | Regressed: {comparison.summary.regressed} | Unchanged:{" "}
            {comparison.summary.unchanged} | New/Missing: {comparison.summary.newOrMissing}
          </p>
          {Array.isArray(comparison.steps) && comparison.steps.length ? (
            <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Step</th>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Previous</th>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Current</th>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.steps.map((entry: any) => (
                    <tr key={entry.stepNumber}>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{entry.stepNumber}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{entry.previousStatus || "-"}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{entry.currentStatus || "-"}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>{entry.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginBottom: 20 }}>
        {item.status === "NOT_STARTED" ? (
          <button onClick={handleStart} disabled={!canExecute}>
            Start
          </button>
        ) : null}

        {item.status === "IN_PROGRESS" ? (
          <>
            <button onClick={handlePause} disabled={!canExecute}>
              Pause
            </button>
            <button onClick={handleComplete} disabled={!canExecute}>
              Complete
            </button>
          </>
        ) : null}

        {item.pausedAt ? (
          <button onClick={handleResume} disabled={!canExecute}>
            Resume
          </button>
        ) : null}

        {item.status === "PASSED" ? <p>Execution Completed</p> : null}
      </div>

      <hr />

      {steps.map((step) => (
        <div
          key={step.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <h4>Step {step.stepNumber}</h4>
          <p>
            <b>Action:</b> {step.action}
          </p>
          <p>
            <b>Expected:</b> {step.expectedResult}
          </p>

          <div>
            <p>
              <strong>Status:</strong> {step.status ? step.status : "Not Executed"}
            </p>

            <button
              disabled={!!step.status || !canExecute}
              onClick={() => handleStepUpdate(step.id, "PASS")}
              style={{ marginRight: 5 }}
            >
              PASS
            </button>

            <button
              disabled={!!step.status || !canExecute}
              onClick={() => handleStepUpdate(step.id, "FAIL")}
              style={{ marginRight: 5 }}
            >
              FAIL
            </button>

            <button
              disabled={!!step.status || !canExecute}
              onClick={() => handleStepUpdate(step.id, "BLOCKED")}
            >
              BLOCKED
            </button>

            <button
              disabled={!!step.status || !canExecute}
              onClick={() => handleFailAndCreateBug(step.id)}
              className="danger"
              style={{ marginLeft: 5 }}
            >
              Fail & Create Bug
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExecutionPage;
