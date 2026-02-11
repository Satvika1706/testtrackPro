import { useEffect, useState } from "react";
import {
  getTestCases,
  cloneTestCase,
  deleteTestCase,
  saveTestCaseAsTemplate,
} from "../api/testcases.api";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");

  const navigate = useNavigate(); // Initialize navigate

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

  // ---------- SINGLE ACTIONS ----------


const handleEdit = (id: string) => {
  navigate(`/test-case/edit/${id}`);

};


  const handleClone = async (id: string) => {
    try {
      await cloneTestCase(id);
      fetchTestCases();
    } catch {
      alert("Clone failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this test case?")) return;
    try {
      await deleteTestCase(id);
      setTestCases(prev => prev.filter(tc => tc.id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  // ---------- BULK ACTIONS ----------
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? testCases.map(tc => tc.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm("Delete selected test cases?")) return;
    try {
      await Promise.all(selectedIds.map(id => deleteTestCase(id)));
      setTestCases(prev => prev.filter(tc => !selectedIds.includes(tc.id)));
      setSelectedIds([]);
    } catch {
      alert("Bulk delete failed");
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setTestCases(prev =>
      prev.map(tc =>
        selectedIds.includes(tc.id) ? { ...tc, status: bulkStatus } : tc
      )
    );
    setSelectedIds([]);
    setBulkStatus("");
  };

  // ---------- TEMPLATE ----------
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

  return (
    <div style={{ padding: 20 }}>
      <h2>Test Cases</h2>

      <div style={{ marginBottom: 15 }}>
        <Link to="/test-cases/create">
          <button>Create Test Case</button>
        </Link>{" "}
        <Link to="/templates">Go to Templates</Link>
      </div>

      {testCases.length === 0 ? (
        <p>No test cases found.</p>
      ) : (
        <>
          <div style={{ margin: "15px 0" }}>
            <button
              disabled={selectedIds.length === 0}
              onClick={handleBulkDelete}
              style={{ color: "red", marginRight: 10 }}
            >
              Delete Selected
            </button>

            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Update Status</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_REVIEW">Ready</option>
              <option value="APPROVED">Approved</option>
            </select>

            <button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || selectedIds.length === 0}
              style={{ marginLeft: 10 }}
            >
              Apply
            </button>
          </div>

          <table border={1} cellPadding={10} width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === testCases.length && testCases.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
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
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tc.id)}
                      onChange={(e) => handleSelectOne(tc.id, e.target.checked)}
                    />
                  </td>
                  <td>#{tc.id.substring(0, 8)}</td>
                  <td>{tc.title}</td>
                  <td>{tc.module}</td>
                  <td>{tc.priority}</td>
                  <td>{tc.severity}</td>
                  <td>{tc.status}</td>
                  <td>{tc.steps?.length || 0}</td>
                  <td>
                    {/* Fixed function call */}
                    <button onClick={() => handleEdit(tc.id)}>Edit</button>{" "}
                    <button onClick={() => handleClone(tc.id)}>Clone</button>{" "}
                    <button
                      onClick={() => handleDelete(tc.id)}
                      style={{ color: "red" }}
                    >
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
        </>
      )}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div style={{ border: "1px solid #ccc", padding: 20, marginTop: 20, maxWidth: "300px" }}>
          <h3>Create Template</h3>
          <input
            placeholder="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <input
            placeholder="Category"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <button onClick={handleSaveTemplate}>Save</button>{" "}
          <button onClick={() => setIsTemplateModalOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default TestCaseList;