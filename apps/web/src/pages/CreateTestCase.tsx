import { useState } from "react";
import api from "../api/axios";

const CreateTestCase = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [severity, setSeverity] = useState("CRITICAL");
  const [type, setType] = useState("FUNCTIONAL");
  const [status, setStatus] = useState("DRAFT");

  const [steps, setSteps] = useState([
    { stepNumber: 1, action: "", expectedResult: "" },
  ]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
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

  const handleSubmit = async () => {
    try {
      await api.post("/api/test-cases", {
        title,
        description,
        module,
        priority,
        severity,
        type,
        status,
        preConditions: "N/A",
        testData: "N/A",
        environment: "N/A",
        steps,
      });

      alert("Test case created successfully");
      window.location.href = "/test-cases";
    } catch (err) {
      alert("Failed to create test case");
    }
  };

  return (
    <div className="page-shell">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Create Test Case</h2>

        <div className="form-group">
          <label>Title</label>
          <input placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Description"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Module</label>
          <input placeholder="Module" onChange={(e) => setModule(e.target.value)} />
        </div>

        <div className="filters-grid mb-6">
          <div>
            <label>Priority</label>
            <select onChange={(e) => setPriority(e.target.value)}>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label>Severity</label>
            <select onChange={(e) => setSeverity(e.target.value)}>
              <option value="CRITICAL">CRITICAL</option>
              <option value="MAJOR">MAJOR</option>
              <option value="MINOR">MINOR</option>
            </select>
          </div>

          <div>
            <label>Type</label>
            <select onChange={(e) => setType(e.target.value)}>
              <option value="FUNCTIONAL">FUNCTIONAL</option>
              <option value="REGRESSION">REGRESSION</option>
            </select>
          </div>

          <div>
            <label>Status</label>
            <select onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">DRAFT</option>
              <option value="READY_FOR_REVIEW">READY_FOR_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4">Steps</h3>
        <div className="list-card mb-6">
          {steps.map((_, index) => (
            <div key={index} className="card p-4">
              <p className="text-sm font-semibold mb-3">Step {index + 1}</p>
              <div className="form-group">
                <label>Action</label>
                <input
                  placeholder="Action"
                  onChange={(e) => updateStep(index, "action", e.target.value)}
                />
              </div>
              <div className="form-group mb-0">
                <label>Expected Result</label>
                <input
                  placeholder="Expected Result"
                  onChange={(e) => updateStep(index, "expectedResult", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="inline-actions">
          <button type="button" className="secondary" onClick={addStep}>Add Step</button>
          <button type="button" onClick={handleSubmit}>Create Test Case</button>
        </div>
      </div>
    </div>
  );
};

export default CreateTestCase;
