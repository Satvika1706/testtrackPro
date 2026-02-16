import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTestRun,
  getRunProgress,
  getTestRunItems,
} from "../api/testrun.api";

interface RunItem {
  id: string;
  status: string;
  totalTimeSeconds: number;
  assignedTo?: {
    email: string;
  };
  testCase: {
    title: string;
  };
}

const TestRunPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [runName, setRunName] = useState("");
  const [progress, setProgress] = useState<any>(null);
  const [items, setItems] = useState<RunItem[]>([]);

  useEffect(() => {
    fetchRun();
    fetchProgress();
    fetchItems();
  }, []);

  const fetchRun = async () => {
    const res = await getTestRun(id!);
    setRunName(res.data.data.name);
  };

  const fetchProgress = async () => {
    const res = await getRunProgress(id!);
    setProgress(res.data.data);
  };

  const fetchItems = async () => {
    const res = await getTestRunItems(id!);
    setItems(res.data.data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{runName}</h2>

      {progress && (
        <div style={{ marginBottom: 20 }}>
          <p>Status Overview:</p>
          <p>Total: {progress.total}</p>
          <p>Passed: {progress.passed}</p>
          <p>Failed: {progress.failed}</p>
          <p>In Progress: {progress.inProgress}</p>
          <p>Completion: {progress.completionRate.toFixed(1)}%</p>
          <p>Pass Rate: {progress.passRate.toFixed(1)}%</p>
        </div>
      )}

      <h3>Test Cases</h3>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Assigned</th>
            <th>Status</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.testCase.title}</td>
              <td>{item.assignedTo?.email || "-"}</td>
              <td>{item.status}</td>
              <td>
                {item.totalTimeSeconds
                  ? `${Math.floor(item.totalTimeSeconds / 60)}m ${
                      item.totalTimeSeconds % 60
                    }s`
                  : "-"}
              </td>
              <td>
                <button
                  onClick={() => navigate(`/execution/${item.id}`)}
                >
                  Execute
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestRunPage;
