import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createBug, type BugPriority, type BugSeverity } from "../api/bug.api";

const SEVERITIES: BugSeverity[] = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "TRIVIAL"];
const PRIORITIES: BugPriority[] = ["P1", "P2", "P3", "P4"];

const CreateBugPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [description, setDescription] = useState(searchParams.get("description") || "");
  const [stepsToReproduce, setStepsToReproduce] = useState(searchParams.get("steps") || "");
  const [expectedBehavior, setExpectedBehavior] = useState(searchParams.get("expected") || "");
  const [actualBehavior, setActualBehavior] = useState(searchParams.get("actual") || "");
  const [severity, setSeverity] = useState<BugSeverity>("MAJOR");
  const [priority, setPriority] = useState<BugPriority>("P2");
  const [environment, setEnvironment] = useState(searchParams.get("environment") || "");
  const [affectedVersion, setAffectedVersion] = useState("");
  const [assignedToId, setAssignedToId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFormValid =
    title.trim() &&
    description.trim() &&
    stepsToReproduce.trim() &&
    expectedBehavior.trim() &&
    actualBehavior.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isFormValid) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    setSubmitting(true);
    try {
      await createBug({
        title,
        description,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        severity,
        priority,
        environment: environment || undefined,
        affectedVersion: affectedVersion || undefined,
        assignedToId,
      });

      navigate("/bugs");
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message;
      setError(apiMessage || "Failed to create bug");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Report New Bug</h2>
        <button className="secondary" onClick={() => navigate("/bugs")}>Cancel</button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "var(--radius-md)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the bug"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          </div>

          <div className="form-group">
            <label>Steps to Reproduce *</label>
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Expected Behavior *</label>
              <textarea value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)} rows={3} required />
            </div>
            <div className="form-group">
              <label>Actual Behavior *</label>
              <textarea value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)} rows={3} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Severity *</label>
              <select
                value={severity}
                onChange={(e) => {
                  const nextSeverity = e.target.value as BugSeverity;
                  setSeverity(nextSeverity);
                  if (nextSeverity === "BLOCKER") setPriority("P1");
                }}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Priority *</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as BugPriority)} disabled={severity === "BLOCKER"}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Environment</label>
              <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="Production / Staging / QA" />
            </div>
            <div className="form-group">
              <label>Affected Version</label>
              <input value={affectedVersion} onChange={(e) => setAffectedVersion(e.target.value)} placeholder="v1.2.0" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Assigned Developer User ID (Optional)</label>
              <input
                type="number"
                min={1}
                value={assignedToId ?? ""}
                onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 3"
              />
            </div>
            <div className="form-group">
              <label>Rule</label>
              <p className="text-sm text-gray-600">Critical/Blocker in Production must be assigned.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="secondary" onClick={() => navigate("/bugs")}>Cancel</button>
            <button type="submit" disabled={!isFormValid || submitting}>{submitting ? "Creating..." : "Submit Bug"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBugPage;
