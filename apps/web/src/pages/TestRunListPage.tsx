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

const TestRunListPage = () => {
  const [runs, setRuns] = useState<TestRun[]>([]);
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'badge success';
      case 'IN_PROGRESS': return 'badge info';
      default: return 'badge neutral';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Test Runs</h2>

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
