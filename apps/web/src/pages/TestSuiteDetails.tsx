import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

interface TestCase {
  id: string;
  title: string;
}

interface SuiteDetails {
  id: string;
  name: string;
  description?: string;
  module?: string;
  testCases: {
    id: string;
    order: number;
    testCase: TestCase;
  }[];
}

const TestSuiteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<SuiteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("");

  useEffect(() => {
    fetchSuite();
    fetchAllTestCases();
  }, []);

  const fetchSuite = async () => {
    try {
      const res = await api.get(`/api/test-suites/${id}`);
      setSuite(res.data);
    } catch (error) {
      console.error("Failed to fetch suite", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTestCases = async () => {
    try {
      const res = await api.get("/api/test-cases");
      setAllTestCases(res.data);
    } catch (error) {
      console.error("Failed to fetch test cases", error);
    }
  };

  const handleAddTestCase = async () => {
    if (!selectedTestCaseId) {
      alert("Select a test case");
      return;
    }

    try {
      await api.post(`/api/test-suites/${id}/test-cases`, {
        testCaseId: selectedTestCaseId,
      });
      alert("Test case added");
      setSelectedTestCaseId("");
      fetchSuite();
    } catch (error) {
      console.error("Failed to add test case", error);
      alert("Failed to add test case");
    }
  };

  const handleRemoveTestCase = async (testCaseId: string) => {
    try {
      await api.delete(`/api/test-suites/${id}/test-cases/${testCaseId}`);
      fetchSuite();
    } catch (error) {
      console.error("Failed to remove test case", error);
      alert("Failed to remove test case");
    }
  };

  const handleCloneSuite = async () => {
    try {
      await api.post(`/api/test-suites/${id}/clone`);
      alert("Suite cloned successfully");
      navigate("/test-suites");
    } catch (error) {
      console.error("Failed to clone suite", error);
      alert("Failed to clone suite");
    }
  };

  const handleArchiveSuite = async () => {
    if (!window.confirm("Are you sure you want to archive this suite?")) return;
    try {
      await api.put(`/api/test-suites/${id}/archive`);
      alert("Suite archived successfully");
      navigate("/test-suites");
    } catch (error) {
      console.error("Failed to archive suite", error);
      alert("Failed to archive suite");
    }
  };

  const handleReorder = async (updatedOrder: string[]) => {
    try {
      await api.put(`/api/test-suites/${id}/reorder`, {
        testCaseIds: updatedOrder,
      });
      fetchSuite();
    } catch (error) {
      console.error("Reorder failed", error);
    }
  };

  const moveTestCase = (index: number, direction: "up" | "down") => {
    if (!suite) return;
    const relations = [...suite.testCases];
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === relations.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    [relations[index], relations[newIndex]] = [relations[newIndex], relations[index]];

    // Optimistic update of UI
    const updatedIds = relations.map(r => r.testCase.id);
    setSuite({ ...suite, testCases: relations });

    handleReorder(updatedIds);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!suite) return <div className="p-8 text-center text-gray-500">Suite not found</div>;

  const sortedTestCases = [...suite.testCases].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{suite.name}</h2>
          <p className="text-gray-600 mb-1">{suite.description}</p>
          {suite.module && (
            <span className="badge neutral">Module: {suite.module}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleCloneSuite} className="secondary">
            Clone Suite
          </button>
          <button onClick={handleArchiveSuite} className="danger">
            Archive Suite
          </button>
        </div>
      </div>

      <div className="card mb-8">
        <h3 className="text-lg font-bold mb-4">Manage Test Cases</h3>

        <div className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Add Test Case to Suite</label>
            <select
              value={selectedTestCaseId}
              onChange={(e) => setSelectedTestCaseId(e.target.value)}
            >
              <option value="">Select Test Case</option>
              {allTestCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.title}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleAddTestCase}>Add +</button>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-4 text-gray-700">Test Cases in this Suite ({suite.testCases.length})</h4>

          {suite.testCases.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-center text-gray-500">
              No test cases in this suite yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {sortedTestCases.map((relation, index) => (
                <li
                  key={relation.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="font-medium text-gray-800 flex items-center gap-3">
                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-sm font-mono">
                      {index + 1}
                    </span>
                    {relation.testCase.title}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveTestCase(index, "up")}
                      disabled={index === 0}
                      className="secondary p-2 h-8 w-8 !padding-0 flex items-center justify-center"
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveTestCase(index, "down")}
                      disabled={index === sortedTestCases.length - 1}
                      className="secondary p-2 h-8 w-8 !padding-0 flex items-center justify-center"
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => handleRemoveTestCase(relation.testCase.id)}
                      className="danger text-sm px-3 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestSuiteDetails;
