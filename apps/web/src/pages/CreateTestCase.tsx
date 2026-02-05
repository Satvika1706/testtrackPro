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
    <div style={{ padding: "20px" }}>
      <h2>Create Test Case</h2>

      <input placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
      <br /><br />

      <textarea
        placeholder="Description"
        onChange={(e) => setDescription(e.target.value)}
      />
      <br /><br />

      <input placeholder="Module" onChange={(e) => setModule(e.target.value)} />
      <br /><br />

      <select onChange={(e) => setPriority(e.target.value)}>
        <option value="HIGH">HIGH</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="LOW">LOW</option>
      </select>

      <select onChange={(e) => setSeverity(e.target.value)}>
        <option value="CRITICAL">CRITICAL</option>
        <option value="MAJOR">MAJOR</option>
        <option value="MINOR">MINOR</option>
      </select>

      <select onChange={(e) => setType(e.target.value)}>
        <option value="FUNCTIONAL">FUNCTIONAL</option>
        <option value="REGRESSION">REGRESSION</option>
      </select>

      <select onChange={(e) => setStatus(e.target.value)}>
        <option value="DRAFT">DRAFT</option>
        <option value="READY_FOR_REVIEW">READY_FOR_REVIEW</option>
      </select>

      <h3>Steps</h3>
      {steps.map((step, index) => (
        <div key={index}>
          <input
            placeholder="Action"
            onChange={(e) => updateStep(index, "action", e.target.value)}
          />
          <input
            placeholder="Expected Result"
            onChange={(e) =>
              updateStep(index, "expectedResult", e.target.value)
            }
          />
        </div>
      ))}

      <br />
      <button onClick={addStep}>Add Step</button>
      <br /><br />

      <button onClick={handleSubmit}>Create Test Case</button>
    </div>
  );
};

export default CreateTestCase;
