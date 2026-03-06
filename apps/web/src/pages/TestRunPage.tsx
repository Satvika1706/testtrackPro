import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getTestRun, getRunProgress, getTestRunItems } from "../api/testrun.api";
import { getCurrentUser } from "../utils/auth";
import { createReExecution } from "../api/execution.api";
import { getActiveProjectId } from "../utils/project";
import { getProjectMilestones, mapRunToMilestone, type Milestone } from "../api/projects.api";

interface RunItem {
  id: string;
  status: string;
  totalTimeSeconds: number;
  createdAt?: string;
  reExecutionOfId?: string | null;
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
  const [runMilestoneId, setRunMilestoneId] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [items, setItems] = useState<RunItem[]>([]);

  const attemptMeta = (() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const meta = new Map<string, { rootId: string; attempt: number; isReExecution: boolean }>();

    const findRoot = (item: RunItem) => {
      let cursor: RunItem | undefined = item;
      const visited = new Set<string>();
      while (cursor?.reExecutionOfId && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        const parent = byId.get(cursor.reExecutionOfId);
        if (!parent) break;
        cursor = parent;
      }
      return cursor?.id || item.id;
    };

    const findDepth = (item: RunItem) => {
      let depth = 0;
      let cursor: RunItem | undefined = item;
      const visited = new Set<string>();
      while (cursor?.reExecutionOfId && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        const parent = byId.get(cursor.reExecutionOfId);
        if (!parent) break;
        depth += 1;
        cursor = parent;
      }
      return depth;
    };

    for (const item of items) {
      const rootId = findRoot(item);
      const depth = findDepth(item);
      meta.set(item.id, {
        rootId,
        attempt: depth + 1,
        isReExecution: Boolean(item.reExecutionOfId),
      });
    }

    return meta;
  })();

  const fetchRun = async () => {
    const res = await getTestRun(id!);
    setRunName(res.data.data.name);
    setRunMilestoneId(res.data.data.milestone?.id || "");
  };

  const fetchProgress = async () => {
    const res = await getRunProgress(id!);
    setProgress(res.data.data);
  };

  const fetchItems = async () => {
    const res = await getTestRunItems(id!);
    setItems(res.data.data);
  };

  const fetchMilestones = async () => {
    try {
      const activeProjectId = getActiveProjectId();
      if (!activeProjectId) {
        setMilestones([]);
        return;
      }
      const rows = await getProjectMilestones(activeProjectId);
      setMilestones(rows);
    } catch {
      setMilestones([]);
    }
  };

  useEffect(() => {
    void fetchRun();
    void fetchProgress();
    void fetchItems();
    void fetchMilestones();
  }, []);

  return (
    <Box>
      <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 2 }}>
          {runName}
        </Typography>

        <Box sx={{ mb: 3, maxWidth: 360 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="milestone-map-label">Milestone</InputLabel>
            <Select
              labelId="milestone-map-label"
              label="Milestone"
              value={runMilestoneId}
              onChange={async (e) => {
                const nextMilestoneId = e.target.value;
                try {
                  await mapRunToMilestone(id!, nextMilestoneId || null);
                  setRunMilestoneId(nextMilestoneId);
                } catch {
                  alert("Failed to map milestone");
                }
              }}
            >
              <MenuItem value="">None</MenuItem>
              {milestones.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name} ({m.status})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

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
              <TableCell>Run Type</TableCell>
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
                  {(() => {
                    const meta = attemptMeta.get(item.id);
                    if (!meta) return <Chip size="small" variant="outlined" label="Attempt 1 (Original)" />;
                    return (
                      <Chip
                        size="small"
                        color={meta.isReExecution ? "warning" : "default"}
                        variant="outlined"
                        label={
                          meta.isReExecution
                            ? `Attempt ${meta.attempt} (Re-Execution)`
                            : `Attempt ${meta.attempt} (Original)`
                        }
                      />
                    );
                  })()}
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
                  {item.status === "FAILED" || item.status === "BLOCKED" || item.status === "PASSED" ? (
                    <Button
                      type="button"
                      variant="outlined"
                      sx={{ ml: 1 }}
                      onClick={async () => {
                        if (currentUser?.role !== "TESTER") {
                          alert("Access denied: only testers can run test execution.");
                          return;
                        }
                        try {
                          const res = await createReExecution(item.id);
                          const newExecutionId = res.data?.data?.id;
                          if (newExecutionId) {
                            navigate(`/execution/${newExecutionId}`);
                          } else {
                            alert("Re-execution created, but navigation failed.");
                          }
                        } catch (err: any) {
                          alert(err?.response?.data?.message || "Failed to create re-execution");
                        }
                      }}
                    >
                      Re-Execute
                    </Button>
                  ) : null}
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
