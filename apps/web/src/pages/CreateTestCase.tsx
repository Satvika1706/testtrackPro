import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { getTestCaseTemplates } from "../api/testcases.api";

interface TemplateStep {
  stepNumber?: number;
  action: string;
  expectedResult: string;
}

interface TestCaseTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severity: "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "TRIVIAL";
  type: "FUNCTIONAL" | "REGRESSION" | "SMOKE" | "INTEGRATION" | "UAT" | "PERFORMANCE" | "SECURITY" | "USABILITY";
  preConditions?: string | null;
  testData?: string | null;
  environment?: string | null;
  stepsSnapshot: unknown;
}

const CreateTestCase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [severity, setSeverity] = useState("CRITICAL");
  const [type, setType] = useState("FUNCTIONAL");
  const [status, setStatus] = useState("DRAFT");
  const [preConditions, setPreConditions] = useState("N/A");
  const [testData, setTestData] = useState("N/A");
  const [environment, setEnvironment] = useState("N/A");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [steps, setSteps] = useState([
    { stepNumber: 1, action: "", expectedResult: "" },
  ]);

  const isTemplateFlow = useMemo(() => Boolean(templateId), [templateId]);

  useEffect(() => {
    if (!templateId) return;

    const hydrateFromTemplate = async () => {
      setTemplateLoading(true);
      try {
        const templates = (await getTestCaseTemplates()) as TestCaseTemplate[];
        const template = templates.find((item) => item.id === templateId);
        if (!template) return;

        const parsedSteps = Array.isArray(template.stepsSnapshot)
          ? (template.stepsSnapshot as TemplateStep[])
          : [];

        setTemplateName(template.name);
        setTitle(template.title || "");
        setDescription(template.description || "");
        setModule(template.category || "");
        setPriority(template.priority || "HIGH");
        setSeverity(template.severity || "CRITICAL");
        setType(template.type || "FUNCTIONAL");
        setStatus("DRAFT");
        setPreConditions(template.preConditions || "N/A");
        setTestData(template.testData || "N/A");
        setEnvironment(template.environment || "N/A");
        setSteps(
          parsedSteps.length
            ? parsedSteps.map((step, index) => ({
                stepNumber: index + 1,
                action: step.action || "",
                expectedResult: step.expectedResult || "",
              }))
            : [{ stepNumber: 1, action: "", expectedResult: "" }]
        );
      } catch {
        // Keep empty form if template fetch fails.
      } finally {
        setTemplateLoading(false);
      }
    };

    void hydrateFromTemplate();
  }, [templateId]);

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
      const payload = {
        title,
        description,
        module,
        priority,
        severity,
        type,
        status: isTemplateFlow ? "DRAFT" : status,
        preConditions,
        testData,
        environment,
        steps,
      };
      const res = await api.post("/api/test-cases", payload);

      const newTestCaseId = res?.data?.id || "Generated";
      alert(`Test case created successfully. ID: ${newTestCaseId}. Status: DRAFT`);
      navigate("/test-cases");
    } catch (err) {
      alert("Failed to create test case");
    }
  };

  return (
    <div className="page-shell">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Create Test Case</h2>
        {isTemplateFlow ? (
          <div className="alert" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", marginBottom: "1rem" }}>
            {templateLoading
              ? "Loading template..."
              : `Template mode${templateName ? `: ${templateName}` : ""}. This test case will be created as DRAFT.`}
          </div>
        ) : null}

        <div className="form-group">
          <label>Title</label>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Module</label>
          <input placeholder="Module" value={module} onChange={(e) => setModule(e.target.value)} />
        </div>

        <div className="filters-grid mb-6">
          <div>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="BLOCKER">BLOCKER</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="MAJOR">MAJOR</option>
              <option value="MINOR">MINOR</option>
              <option value="TRIVIAL">TRIVIAL</option>
            </select>
          </div>

          <div>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="FUNCTIONAL">FUNCTIONAL</option>
              <option value="REGRESSION">REGRESSION</option>
              <option value="SMOKE">SMOKE</option>
              <option value="INTEGRATION">INTEGRATION</option>
              <option value="UAT">UAT</option>
              <option value="PERFORMANCE">PERFORMANCE</option>
              <option value="SECURITY">SECURITY</option>
              <option value="USABILITY">USABILITY</option>
            </select>
          </div>

          <div>
            <label>Status</label>
            <select
              value={isTemplateFlow ? "DRAFT" : status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isTemplateFlow}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="READY_FOR_REVIEW">READY_FOR_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </div>
        </div>

        <div className="filters-grid mb-6">
          <div>
            <label>Pre-Conditions</label>
            <input value={preConditions} onChange={(e) => setPreConditions(e.target.value)} />
          </div>
          <div>
            <label>Test Data</label>
            <input value={testData} onChange={(e) => setTestData(e.target.value)} />
          </div>
          <div>
            <label>Environment</label>
            <input value={environment} onChange={(e) => setEnvironment(e.target.value)} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4">Steps</h3>
        <div className="list-card mb-6">
          {steps.map((step, index) => (
            <div key={index} className="card p-4">
              <p className="text-sm font-semibold mb-3">Step {index + 1}</p>
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

        <div className="inline-actions">
          <button type="button" className="secondary" onClick={addStep}>Add Step</button>
          <button type="button" onClick={handleSubmit}>Create Test Case</button>
        </div>
      </div>
    </div>
  );
};

export default CreateTestCase;
