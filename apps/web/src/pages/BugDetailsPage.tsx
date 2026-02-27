import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addBugComment,
  assignBug,
  deleteBugComment,
  editBugComment,
  getBugById,
  getBugComments,
  runDeveloperAction,
  triageBug,
  updateBugStatus,
  type BugComment,
  type BugItem,
  type BugStatus,
} from "../api/bug.api";
import { getCurrentUser } from "../utils/auth";

const STATUS_OPTIONS: BugStatus[] = [
  "NEW",
  "TRIAGE_PENDING",
  "TRIAGED",
  "OPEN",
  "IN_PROGRESS",
  "FIXED",
  "VERIFIED",
  "CLOSED",
  "REOPENED",
  "WONT_FIX_REQUESTED",
  "WONT_FIX",
  "DUPLICATE",
];

const formatStatus = (status: string) => status.replace(/_/g, " ").replace("WONT", "WON'T");

const BugDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);

  const [bug, setBug] = useState<BugItem | null>(null);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<BugStatus>("OPEN");
  const [assignedToId, setAssignedToId] = useState("");

  const [fixNotes, setFixNotes] = useState("");
  const [commitRef, setCommitRef] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [wontFixReason, setWontFixReason] = useState("");

  const [newComment, setNewComment] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | undefined>(undefined);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const [bugRes, commentsRes] = await Promise.all([getBugById(id), getBugComments(id)]);
      setBug(bugRes.data);
      setSelectedStatus(bugRes.data.status);
      setComments(commentsRes.data || []);
      setFixNotes(bugRes.data.fixNotes || "");
      setCommitRef(bugRes.data.fixCommitRef || "");
      setResolutionSummary(bugRes.data.resolutionSummary || "");
      setWontFixReason(bugRes.data.wontFixReason || "");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load bug");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await updateBugStatus(id, selectedStatus);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const handleTriage = async (decision: "APPROVE" | "DUPLICATE" | "WONT_FIX") => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await triageBug(id, decision);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed triage action");
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!id || !assignedToId) return;
    setBusy(true);
    setError("");
    try {
      await assignBug(id, Number(assignedToId));
      setAssignedToId("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed assignment");
    } finally {
      setBusy(false);
    }
  };

  const handleDeveloperAction = async (
    action:
      | "START_WORK"
      | "ADD_FIX_NOTES"
      | "LINK_COMMIT"
      | "MARK_FIXED"
      | "REQUEST_RETEST"
      | "WONT_FIX"
  ) => {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await runDeveloperAction(id, {
        action,
        fixNotes: action === "ADD_FIX_NOTES" ? fixNotes : undefined,
        commitRef: action === "LINK_COMMIT" ? commitRef : undefined,
        resolutionSummary:
          action === "MARK_FIXED" || action === "REQUEST_RETEST" ? resolutionSummary : undefined,
        wontFixReason: action === "WONT_FIX" ? wontFixReason : undefined,
      });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed developer action");
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addBugComment(id, {
        content: newComment.trim(),
        parentCommentId: replyToCommentId,
        contentFormat: "MARKDOWN",
      });
      setNewComment("");
      setReplyToCommentId(undefined);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add comment");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    setBusy(true);
    setError("");
    try {
      await editBugComment(editingCommentId, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to edit comment");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setBusy(true);
    setError("");
    try {
      await deleteBugComment(commentId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete comment");
    } finally {
      setBusy(false);
    }
  };

  const isCommentEditable = (comment: BugComment) => {
    if (!user || comment.createdById !== user.userId || comment.deletedAt) return false;
    const ageMs = Date.now() - new Date(comment.createdAt).getTime();
    return ageMs <= 5 * 60 * 1000;
  };

  const threaded = useMemo(() => {
    const map: Record<string, BugComment[]> = {};
    const byId = new Set(comments.map((c) => c.id));

    for (const comment of comments) {
      const key = comment.parentCommentId && byId.has(comment.parentCommentId)
        ? comment.parentCommentId
        : "root";
      if (!map[key]) map[key] = [];
      map[key].push(comment);
    }

    return map;
  }, [comments]);

  const renderCommentTree = (parentId: string, level: number) => {
    const nodes = threaded[parentId] || [];
    return nodes.map((comment) => {
      const canModify = isCommentEditable(comment);
      return (
        <div key={comment.id} style={{ marginLeft: level * 20, borderLeft: level > 0 ? "2px solid #e2e8f0" : "none", paddingLeft: level > 0 ? 12 : 0, marginTop: 12 }}>
          <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.75rem" }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <strong>{comment.createdBy.email}</strong>
                <span className="text-sm text-gray-600" style={{ marginLeft: 8 }}>
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
                {comment.editedAt && <span className="text-sm text-gray-600" style={{ marginLeft: 8 }}>(edited)</span>}
              </div>
              <div className="flex gap-2">
                <button className="secondary" onClick={() => setReplyToCommentId(comment.id)}>Reply</button>
                {canModify && (
                  <>
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingCommentText(comment.content);
                      }}
                    >
                      Edit
                    </button>
                    <button className="danger" onClick={() => void handleDeleteComment(comment.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>

            {editingCommentId === comment.id ? (
              <div>
                <textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} rows={3} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => void handleUpdateComment()} disabled={busy}>Save</button>
                  <button className="secondary" onClick={() => setEditingCommentId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ whiteSpace: "pre-wrap" }}>{comment.content}</p>
            )}
          </div>

          {renderCommentTree(comment.id, level + 1)}
        </div>
      );
    });
  };

  if (loading) return <p>Loading bug details...</p>;
  if (!bug) return <p>Bug not found.</p>;
  const allowedTransitions = bug.allowedTransitions ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{bug.bugId} - {bug.title}</h2>
        <button className="secondary" onClick={() => navigate("/bugs")}>Back</button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", marginBottom: "1rem", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "var(--radius-md)" }}>
          {error}
        </div>
      )}

      <div className="card mb-6">
        <p><strong>Status:</strong> {formatStatus(bug.status)}</p>
        <p><strong>Severity:</strong> {bug.severity}</p>
        <p><strong>Priority:</strong> {bug.priority}</p>
        <p><strong>Assigned To:</strong> {bug.assignedTo?.email || "Unassigned"}</p>
        <p><strong>Description:</strong> {bug.description}</p>
        <p><strong>Steps:</strong> {bug.stepsToReproduce}</p>
        <p><strong>Expected:</strong> {bug.expectedBehavior}</p>
        <p><strong>Actual:</strong> {bug.actualBehavior}</p>
      </div>

      {(user?.role === "TESTER" || user?.role === "DEVELOPER" || user?.role === "ADMIN") && (
        <div className="card mb-6">
          <h3>Status Update</h3>
          <div className="flex gap-2 items-center">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as BugStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={s !== bug.status && !allowedTransitions.includes(s)}
                >
                  {formatStatus(s)}
                </option>
              ))}
            </select>
            <button onClick={() => void handleStatusUpdate()} disabled={busy}>Update Status</button>
          </div>
        </div>
      )}

      {(user?.role === "TRIAGE" || user?.role === "ADMIN") && (
        <div className="card mb-6">
          <h3>Triage and Assignment</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => void handleTriage("APPROVE")} disabled={busy}>Approve</button>
            <button className="secondary" onClick={() => void handleTriage("DUPLICATE")} disabled={busy}>Mark Duplicate</button>
            <button className="danger" onClick={() => void handleTriage("WONT_FIX")} disabled={busy}>Mark Won't Fix</button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              placeholder="Developer user ID"
            />
            <button onClick={() => void handleAssign()} disabled={busy || !assignedToId}>Assign Bug</button>
          </div>
        </div>
      )}

      {(user?.role === "DEVELOPER" || user?.role === "ADMIN") && (
        <div className="card mb-6">
          <h3>Developer Actions</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => void handleDeveloperAction("START_WORK")} disabled={busy}>Start Work</button>
            <button onClick={() => void handleDeveloperAction("MARK_FIXED")} disabled={busy}>Mark Fixed</button>
            <button className="secondary" onClick={() => void handleDeveloperAction("REQUEST_RETEST")} disabled={busy}>Request Re-test</button>
            <button className="danger" onClick={() => void handleDeveloperAction("WONT_FIX")} disabled={busy}>Won't Fix</button>
          </div>

          <div className="form-group">
            <label>Fix Notes</label>
            <textarea value={fixNotes} onChange={(e) => setFixNotes(e.target.value)} rows={2} />
            <div className="mt-4"><button onClick={() => void handleDeveloperAction("ADD_FIX_NOTES")} disabled={busy}>Save Fix Notes</button></div>
          </div>

          <div className="form-group">
            <label>Commit Ref</label>
            <input value={commitRef} onChange={(e) => setCommitRef(e.target.value)} placeholder="abc123def - message" />
            <div className="mt-4"><button onClick={() => void handleDeveloperAction("LINK_COMMIT")} disabled={busy}>Link Commit</button></div>
          </div>

          <div className="form-group">
            <label>Resolution Summary</label>
            <textarea value={resolutionSummary} onChange={(e) => setResolutionSummary(e.target.value)} rows={2} placeholder="Fixed in commit abc123, please verify on staging." />
          </div>

          <div className="form-group">
            <label>Won't Fix Reason</label>
            <textarea value={wontFixReason} onChange={(e) => setWontFixReason(e.target.value)} rows={2} placeholder="Working as designed." />
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4">Comments</h3>

        {replyToCommentId && (
          <p className="text-sm text-gray-600 mb-4">
            Replying to comment {replyToCommentId}
            <button className="secondary" style={{ marginLeft: 8 }} onClick={() => setReplyToCommentId(undefined)}>Cancel reply</button>
          </p>
        )}

        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add comment. Use @email or @emailPrefix for mention."
        />
        <div className="mt-4 mb-6">
          <button onClick={() => void handleAddComment()} disabled={busy || !newComment.trim()}>Post Comment</button>
        </div>

        <div>{renderCommentTree("root", 0)}</div>
      </div>
    </div>
  );
};

export default BugDetailsPage;
