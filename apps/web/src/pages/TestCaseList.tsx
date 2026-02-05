import { useEffect, useState } from "react";
import {
  getTestCases,
  cloneTestCase,
  deleteTestCase,
} from "../api/testcases.api";

interface TestCase {
  id: string;
  testCaseId: string;
  title: string;
  module: string;
  priority: string;
  severity: string;
  status: string;
  steps: any[];
}

const TestCaseList = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTestCases = async () => {
    try {
      const data = await getTestCases();
      setTestCases(data);
    } catch (error) {
      alert("Failed to load test cases");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCases();
  }, []);

  const handleEdit = (id: string) => {
    window.location.href = `/test-cases/edit/${id}`;
  };

  const handleClone = async (id: string) => {
    try {
      await cloneTestCase(id);
      await fetchTestCases();
    } catch (error) {
      alert("Failed to clone test case");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this test case?"
    );
    if (!confirmDelete) return;

    try {
      await deleteTestCase(id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch (error) {
      alert("Failed to delete test case");
      console.error(error);
    }
  };

  if (loading) return <p>Loading test cases...</p>;
  if (testCases.length === 0) return <p>No test cases found.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Test Cases</h2>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
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
              <td>{tc.testCaseId}</td>
              <td>{tc.title}</td>
              <td>{tc.module}</td>
              <td>{tc.priority}</td>
              <td>{tc.severity}</td>
              <td>{tc.status}</td>
              <td>{tc.steps.length}</td>
              <td>
                <button onClick={() => handleEdit(tc.id)}>Edit</button>{" "}
                <button onClick={() => handleClone(tc.id)}>Clone</button>{" "}
                <button onClick={() => handleDelete(tc.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestCaseList;
