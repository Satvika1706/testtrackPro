import { useEffect, useState } from "react";
import {
  getTestCases,
  cloneTestCase,
  deleteTestCase,
  saveTestCaseAsTemplate,
} from "../api/testcases.api";
import { Link } from "react-router-dom";

interface TestCase {
  id: string;
  title: string;
  module: string;
  priority: string;
  severity: string;
  status: string;
  steps?: any[];
}

const TestCaseList = () => {
 
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");

  const fetchTestCases = async () => {
    try {
      const data = await getTestCases();
      setTestCases(data);
    } catch {
      alert("Failed to load test cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, []);

  const handleEdit = (id: string) => {
    window.location.href = `/test-cases/${id}`;
  };

  const handleClone = async (id: string) => {
    try {
      await cloneTestCase(id);
      await fetchTestCases();
    } catch {
      alert("Clone failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this test case?")) return;
    try {
      await deleteTestCase(id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTestCaseId) return;

    try {
      await saveTestCaseAsTemplate(selectedTestCaseId, {
        name: templateName,
        category: templateCategory,
      });

      alert("Template created successfully");

      setIsTemplateModalOpen(false);
      setTemplateName("");
      setTemplateCategory("");
    } catch {
      alert("Failed to create template");
    }
  };

  if (loading) return <p>Loading test cases...</p>;
  if (testCases.length === 0) return <p>No test cases found.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Test Cases</h2>
      <div style={{ marginBottom: 20 }}>
  <Link to="/templates">Go to Templates</Link>
</div>

      <table border={1} cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f4f4f4" }}>
            <th>ID</th>
            <th>Title</th>
            <th>Module</th>
            <th>Priority</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Steps</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {testCases.map((tc) => (
            <tr key={tc.id}>
              <td>#{tc.id.substring(0, 8)}</td>
              <td>{tc.title}</td>
              <td>{tc.module}</td>
              <td>{tc.priority}</td>
              <td>{tc.severity}</td>
              <td>{tc.status}</td>
              <td style={{ textAlign: "center" }}>{tc.steps?.length || 0}</td>

              <td>
                <button onClick={() => handleEdit(tc.id)}>Edit</button>{" "}
                <button onClick={() => handleClone(tc.id)}>Clone</button>{" "}
                <button onClick={() => handleDelete(tc.id)} style={{ color: "red" }}>
                  Delete
                </button>{" "}
                <button
                  onClick={() => {
                    setSelectedTestCaseId(tc.id); 
                    setIsTemplateModalOpen(true);
                  }}
                >
                  Save as Template
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*  MODAL JSX (OUTSIDE MAP, INSIDE RETURN) */}
      {isTemplateModalOpen && (
        <div style={{ border: "1px solid #ccc", padding: 20, marginTop: 20 }}>
          <h3>Create Template</h3>

          <input
            placeholder="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <br /><br />

          <input
            placeholder="Category (e.g. Login Tests)"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
          />
          <br /><br />

          <button onClick={handleSaveTemplate}>Save</button>{" "}
          <button onClick={() => setIsTemplateModalOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default TestCaseList;
