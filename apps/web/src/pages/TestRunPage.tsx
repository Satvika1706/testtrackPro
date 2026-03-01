import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  getTestRun,
  getRunProgress,
  getTestRunItems,
} from "../api/testrun.api";
import { getCurrentUser } from "../utils/auth";

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
  const currentUser = getCurrentUser();

  const [runName, setRunName] = useState("");
  const [progress, setProgress] = useState<any>(null);
  const [items, setItems] = useState<RunItem[]>([]);

  useEffect(() => {
    void fetchRun();
    void fetchProgress();
    void fetchItems();
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
    <Box>
      <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 2 }}>
          {runName}
        </Typography>

        {progress ? (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            }}
          >
            {[
              { label: "Total", value: progress.total },
              { label: "Passed", value: progress.passed },
              { label: "Failed", value: progress.failed },
              { label: "In Progress", value: progress.inProgress },
              { label: "Completion", value: `${progress.completionRate.toFixed(1)}%` },
              { label: "Pass Rate", value: `${progress.passRate.toFixed(1)}%` },
            ].map((item) => (
              <Paper key={item.label} variant="outlined" sx={{ p: 2.25, borderRadius: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Test Cases
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Assigned</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.testCase.title}</TableCell>
                <TableCell>{item.assignedTo?.email || "-"}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={item.status} />
                </TableCell>
                <TableCell>
                  {item.totalTimeSeconds
                    ? `${Math.floor(item.totalTimeSeconds / 60)}m ${item.totalTimeSeconds % 60}s`
                    : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={() => {
                      if (currentUser?.role !== "TESTER") {
                        alert("Access denied: only testers can run test execution.");
                        return;
                      }
                      navigate(`/execution/${item.id}`);
                    }}
                  >
                    Execute
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default TestRunPage;
