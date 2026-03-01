import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import VersionHistorySidebar from "../components/VersionHistorySidebar";

interface Step {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

const EditTestCase = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [changeSummary, setChangeSummary] = useState("");

  const [loading, setLoading] = useState(true);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTestCase = async () => {
      try {
        const res = await api.get(`/api/test-cases/${id}`);

        setTitle(res.data.title);
        setDescription(res.data.description);
        setSteps(res.data.steps || []);
      } catch (err) {
        alert("Failed to load test case");
      } finally {
        setLoading(false);
      }
    };

    fetchTestCase();
  }, [id]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        action: "",
        expectedResult: "",
      },
    ]);
  };

  const updateStep = (
    index: number,
    field: "action" | "expectedResult",
    value: string
  ) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const handleSave = async () => {
    if (!changeSummary.trim()) {
      alert("Change summary is required");
      return;
    }

    try {
      await api.put(`/api/test-cases/${id}`, {
        title,
        description,
        steps,
        changeSummary,
      });

      alert("Test case updated successfully");
      navigate("/test-cases");
    } catch (err) {
      alert("Failed to update test case");
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="page-shell">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Edit Test Case</h2>

        <div className="form-group">
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
        </div>

        <h3 className="text-lg font-semibold mb-4">Steps</h3>
        <div className="list-card mb-6">
          {steps.map((step, index) => (
            <div key={index} className="card p-4">
              <p className="text-sm font-semibold mb-3">Step {step.stepNumber || index + 1}</p>

              <div className="form-group">
                <label>Action</label>
                <input
                  placeholder="Action"
                  value={step.action}
                  onChange={(e) => updateStep(index, "action", e.target.value)}
                />
              </div>

              <div className="form-group mb-0">
                <label>Expected Result</label>
                <input
                  placeholder="Expected Result"
                  value={step.expectedResult}
                  onChange={(e) => updateStep(index, "expectedResult", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="secondary mb-6" onClick={addStep}>Add Step</button>

        <div className="form-group">
          <label>Change Summary</label>
          <textarea
            placeholder="Describe what changed (required)"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
          />
        </div>

        <div className="inline-actions">
          <button type="button" onClick={handleSave}>Save</button>
          <button type="button" className="secondary" onClick={() => navigate("/test-cases")}>Cancel</button>
          <button type="button" className="secondary" onClick={() => setIsHistoryOpen(true)}>
            View Version History
          </button>
        </div>
      </div>

      <VersionHistorySidebar
        testCaseId={id!}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default EditTestCase;
