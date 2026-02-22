import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTestRuns } from "../api/testrun.api";

interface TestRun {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  createdBy: {
    email: string;
  };
  _count: {
    testRunItems: number;
  };
}

interface TestCase {
  id: string;
  title: string;
}

import { getTestCases } from "../api/testcases.api";
import { createTestRun } from "../api/testrun.api";

const TestRunListPage = () => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [newRunName, setNewRunName] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await getAllTestRuns();
      setRuns(res.data.data);
    } catch (err) {
      console.error("Failed to fetch test runs", err);
    }
  };

  const handleOpenCreate = async () => {
    setIsCreating(true);
    try {
      const res = await getTestCases();
      // Adjust depending on actual API response structure
      setTestCases(res.data || res);
    } catch (err) {
      console.error("Failed to fetch test cases", err);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunName || selectedCaseIds.length === 0) {
      alert("Please enter a name and select at least one test case.");
      return;
    }

    try {
      await createTestRun({
        name: newRunName,
        testCaseIds: selectedCaseIds,
      });
      setIsCreating(false);
      setNewRunName("");
      setSelectedCaseIds([]);
      fetchRuns(); // Refresh list
    } catch (err) {
      console.error("Failed to create test run", err);
      alert("Failed to create test run");
    }
  };

  const toggleTestCase = (id: string) => {
    setSelectedCaseIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'badge success';
      case 'IN_PROGRESS': return 'badge info';
      default: return 'badge neutral';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Runs</h2>
        <button onClick={handleOpenCreate}>+ Create Test Run</button>
      </div>

      {isCreating && (
        <div className="mb-6 p-6 card border rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold mb-4">New Test Run</h3>
          <form onSubmit={handleCreateRun}>
            <div className="form-group">
              <label>Run Name</label>
              <input
                type="text"
                value={newRunName}
                onChange={(e) => setNewRunName(e.target.value)}
                placeholder="e.g. Sprint 24 Regression"
                className="w-full"
                required
              />
            </div>

            <div className="form-group">
              <label>Select Test Cases ({selectedCaseIds.length})</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '1rem' }}>
                {testCases.map(tc => (
                  <div key={tc.id} className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id={`tc-${tc.id}`}
                      checked={selectedCaseIds.includes(tc.id)}
                      onChange={() => toggleTestCase(tc.id)}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor={`tc-${tc.id}`} style={{ marginBottom: 0, cursor: 'pointer' }}>
                      {tc.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button type="button" className="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit">
                Create Run
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Total Cases</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-gray-500">No test runs found.</td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id}>
                  <td className="font-medium">{run.name}</td>
                  <td>
                    <span className={getStatusBadgeClass(run.status)}>{run.status}</span>
                  </td>
                  <td>{run.createdBy.email}</td>
                  <td>{run._count.testRunItems}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/test-runs/${run.id}`)}
                      className="secondary px-3 py-1 text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestRunListPage;
