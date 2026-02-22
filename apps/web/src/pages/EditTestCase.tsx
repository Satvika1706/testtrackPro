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

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Edit Test Case</h2>

      {/* BASIC INFO */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />
      <br /><br />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <br /><br />

      {/* STEPS */}
      <h3>Steps</h3>

      {steps.map((step, index) => (
        <div key={index} style={{ marginBottom: 10 }}>
          <strong>Step {index + 1}</strong>
          <br />

          <input
            placeholder="Action"
            value={step.action}
            onChange={(e) =>
              updateStep(index, "action", e.target.value)
            }
          />
          <br />

          <input
            placeholder="Expected Result"
            value={step.expectedResult}
            onChange={(e) =>
              updateStep(index, "expectedResult", e.target.value)
            }
          />
        </div>
      ))}

      <button onClick={addStep}>Add Step</button>

      <br /><br />

      {/* CHANGE SUMMARY */}
      <h3>Change Summary</h3>
      <textarea
        placeholder="Describe what changed (required)"
        value={changeSummary}
        onChange={(e) => setChangeSummary(e.target.value)}
      />

      <br /><br />

      {/* ACTIONS */}
      <button onClick={handleSave}>Save</button>{" "}
      <button onClick={() => navigate("/test-cases")}>
        Cancel
      </button>{" "}
      <button onClick={() => setIsHistoryOpen(true)}>
        View Version History
      </button>

      {/* VERSION HISTORY SIDEBAR */}
      <VersionHistorySidebar
        testCaseId={id!}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default EditTestCase;
