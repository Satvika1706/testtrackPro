import { useEffect, useState } from "react";
import {
  getTestCases,
  cloneTestCase,
  deleteTestCase,
  saveTestCaseAsTemplate,
} from "../api/testcases.api";
import { Link, useNavigate } from "react-router-dom";

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

  const navigate = useNavigate();

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'badge success';
      case 'READY_FOR_REVIEW': return 'badge warning';
      case 'DRAFT': return 'badge neutral';
      default: return 'badge info';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'badge danger';
      case 'MEDIUM': return 'badge warning';
      case 'LOW': return 'badge success';
      default: return 'badge neutral';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading test cases...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Cases</h2>
        <div className="flex gap-4">
          <Link to="/templates">
            <button className="secondary">Go to Templates</button>
          </Link>
          <Link to="/test-cases/create">
            <button>Create Test Case</button>
          </Link>
        </div>
      </div>

      {testCases.length === 0 ? (
        <div className="card text-center p-8 text-gray-500">
          <p>No test cases found. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="card mb-6 flex items-center gap-4 bg-gray-50 border border-gray-200">
            <span className="text-sm font-medium text-gray-600">Bulk Actions:</span>
            <button
              disabled={selectedIds.length === 0}
              onClick={handleBulkDelete}
              className="danger px-3 py-1 text-sm"
            >
              Delete Selected
            </button>

            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-40 py-1"
            >
              <option value="">Update Status</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_REVIEW">Ready</option>
              <option value="APPROVED">Approved</option>
            </select>

            <button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || selectedIds.length === 0}
              className="secondary px-3 py-1 text-sm"
            >
              Apply
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
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
                    <td className="font-mono text-xs text-gray-500">#{tc.id.substring(0, 8)}</td>
                    <td className="font-medium">{tc.title}</td>
                    <td>{tc.module}</td>
                    <td>
                      <span className={getPriorityBadgeClass(tc.priority)}>{tc.priority}</span>
                    </td>
                    <td>{tc.severity}</td>
                    <td>
                      <span className={getStatusBadgeClass(tc.status)}>{tc.status}</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(tc.id)} className="secondary px-2 py-1 text-xs">Edit</button>
                        <button onClick={() => handleClone(tc.id)} className="secondary px-2 py-1 text-xs">Clone</button>
                        <button
                          onClick={() => handleDelete(tc.id)}
                          className="danger px-2 py-1 text-xs"
                        >
                          Delete
                        </button>
                        <button
                          className="secondary px-2 py-1 text-xs"
                          onClick={() => {
                            setSelectedTestCaseId(tc.id);
                            setIsTemplateModalOpen(true);
                          }}
                        >
                          Template
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">Create Template</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <input
                placeholder="e.g. Login Template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                placeholder="e.g. Authentication"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsTemplateModalOpen(false)} className="secondary">Cancel</button>
              <button onClick={handleSaveTemplate}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCaseList;