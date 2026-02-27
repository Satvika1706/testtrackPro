import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  startExecution,
  pauseExecution,
  resumeExecution,
  completeExecution,
  getExecutionSteps,
  getTestRunItem,
} from "../api/execution.api";
import { updateStepStatus } from "../api/execution.api";
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

  // 🔥 Fetch execution metadata + steps
  const fetchData = async () => {
    if (!id) return;
    try {
      const itemRes = await getTestRunItem(id);
      setItem(itemRes.data.data);

      const stepRes = await getExecutionSteps(id);
      setSteps(stepRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch execution data");
    }
  };

  useEffect(() => {
    fetchData();
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


        const current =
          item.accumulatedTime +
          Math.floor((now - started) / 1000);

        setDisplayTime(current);
      }, 1000);
    }
    else if (item.status === "PASSED" || item.status === "FAILED") {
      setDisplayTime(item.totalTimeSeconds);
    }
    else {
      setDisplayTime(item.accumulatedTime);
    }

    return () => clearInterval(interval);
  }, [item]);



  const handleStart = async () => {
    if (!id) return;
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      setError("");
      await startExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start execution");
    }
  };

  const handlePause = async () => {
    if (!id) return;
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      setError("");
      await pauseExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to pause execution");
    }
  };

  const handleResume = async () => {
    if (!id) return;
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      setError("");
      await resumeExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resume execution");
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      setError("");
      await completeExecution(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete execution");
    }
  };
  const handleStepUpdate = async (stepId: string, status: string) => {
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      await updateStepStatus(stepId, status);

      // Update UI instantly without refetch
      setSteps(prev =>
        prev.map(step =>
          step.id === stepId
            ? { ...step, status }
            : step
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleFailAndCreateBug = async (stepId: string) => {
    if (!id) return;
    if (!canExecute) {
      const message = "Access denied: only testers can run test execution.";
      setError(message);
      alert(message);
      return;
    }
    try {
      // Mark step as FAIL first
      await updateStepStatus(stepId, "FAIL");
      setSteps(prev =>
        prev.map(step =>
          step.id === stepId ? { ...step, status: "FAIL" } : step
        )
      );

      // Create bug from execution via Quick Fail API
      const res = await createBugFromExecution({
        executionId: id,
        failedStepId: stepId,
        severity: "MAJOR",
        priority: "P2",
      });

      alert(`Bug created: ${res.data.bugId}`);
      navigate("/bugs");
    } catch (error) {
      console.error("Failed to create bug from execution", error);
      alert("Failed to create bug");
    }
  };


  if (!item) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Execution</h2>
      {!canExecute && (
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
      )}
      {error && (
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
      )}

      <h3>
        Timer: {Math.floor(displayTime / 60)}m {displayTime % 60}s
      </h3>

      {/* 🔥 Conditional Buttons */}
      <div style={{ marginBottom: 20 }}>
        {item.status === "NOT_STARTED" && (
          <button onClick={handleStart} disabled={!canExecute}>Start</button>
        )}

        {item.status === "IN_PROGRESS" && (
          <>
            <button onClick={handlePause} disabled={!canExecute}>Pause</button>
            <button onClick={handleComplete} disabled={!canExecute}>Complete</button>
          </>
        )}

        {item.pausedAt && (
          <button onClick={handleResume} disabled={!canExecute}>Resume</button>
        )}

        {item.status === "PASSED" && (
          <p>Execution Completed</p>
        )}
      </div>

      <hr />

      {/* 🔥 Step Listing */}
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
          <p><b>Action:</b> {step.action}</p>
          <p><b>Expected:</b> {step.expectedResult}</p>

          <div>
            <p>
              <strong>Status:</strong>{" "}
              {step.status ? step.status : "Not Executed"}
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
