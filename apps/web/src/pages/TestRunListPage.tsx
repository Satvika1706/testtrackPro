import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { getAllTestRuns, createTestRun } from "../api/testrun.api";
import { getCurrentUser } from "../utils/auth";
import { getTestCases } from "../api/testcases.api";
import api from "../api/axios";

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

interface TestSuite {
  id: string;
  name: string;
  module?: string;
}

interface TestSuiteDetails {
  id: string;
  name: string;
  testCases: Array<{
    id: string;
    order: number;
    testCase: TestCase;
  }>;
}

const TestRunListPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const currentUser = getCurrentUser();
  const canCreateRun = currentUser?.role === "TESTER";
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [suiteCases, setSuiteCases] = useState<TestCase[]>([]);
  const [suiteLoading, setSuiteLoading] = useState(false);
  const [newRunName, setNewRunName] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await getAllTestRuns();
      setRuns(res.data.data);
    } catch (err) {
      console.error("Failed to fetch test runs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = async () => {
    if (!canCreateRun) {
      alert("Access denied: only testers can create test runs.");
      return;
    }
    setIsCreating(true);
    try {
      const [caseRes, suiteRes] = await Promise.all([
        getTestCases(),
        api.get("/api/test-suites"),
      ]);
      setTestCases(caseRes.data || caseRes);
      setSuites((suiteRes.data || []) as TestSuite[]);
    } catch (err) {
      console.error("Failed to fetch test cases/suites", err);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateRun) {
      alert("Access denied: only testers can create test runs.");
      return;
    }
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
      setSelectedSuiteId("");
      setSuiteCases([]);
      void fetchRuns();
    } catch (err) {
      console.error("Failed to create test run", err);
      alert("Failed to create test run");
    }
  };

  const handleSuiteChange = async (suiteId: string) => {
    setSelectedSuiteId(suiteId);
    setSuiteCases([]);

    if (!suiteId) return;

    setSuiteLoading(true);
    try {
      const res = await api.get(`/api/test-suites/${suiteId}`);
      const suite = res.data as TestSuiteDetails;
      const cases = (suite.testCases || []).map((relation) => relation.testCase);
      setSuiteCases(cases);
    } catch (err) {
      console.error("Failed to fetch suite details", err);
      setSuiteCases([]);
    } finally {
      setSuiteLoading(false);
    }
  };

  const toggleTestCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "IN_PROGRESS":
        return "info";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading test runs...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          Test Runs
        </Typography>
        {canCreateRun ? (
          <Button variant="contained" onClick={handleOpenCreate}>
            + Create Test Run
          </Button>
        ) : null}
      </Stack>

      {isCreating ? (
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            mb: 3,
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            New Test Run
          </Typography>
          <Stack component="form" spacing={3} onSubmit={handleCreateRun}>
            <TextField
              label="Run Name"
              type="text"
              value={newRunName}
              onChange={(e) => setNewRunName(e.target.value)}
              placeholder="e.g. Sprint 24 Regression"
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel id="suite-select-label">Select Test Suite (optional)</InputLabel>
              <Select
                labelId="suite-select-label"
                label="Select Test Suite (optional)"
                value={selectedSuiteId}
                onChange={(e) => void handleSuiteChange(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {suites.map((suite) => (
                  <MenuItem key={suite.id} value={suite.id}>
                    {suite.name}{suite.module ? ` (${suite.module})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSuiteId ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  maxHeight: 260,
                  overflowY: "auto",
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#334155" : undefined,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                  Suite Test Cases ({suiteCases.length})
                </Typography>
                {suiteLoading ? (
                  <Typography color="text.secondary">Loading suite cases...</Typography>
                ) : suiteCases.length === 0 ? (
                  <Typography color="text.secondary">No test cases in selected suite.</Typography>
                ) : (
                  <Stack>
                    {suiteCases.map((tc) => (
                      <FormControlLabel
                        key={`suite-${tc.id}`}
                        control={
                          <Checkbox
                            checked={selectedCaseIds.includes(tc.id)}
                            onChange={() => toggleTestCase(tc.id)}
                          />
                        }
                        label={tc.title}
                      />
                    ))}
                  </Stack>
                )}
              </Paper>
            ) : null}

            <Divider />

            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                maxHeight: 300,
                overflowY: "auto",
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                borderColor: isDark ? "#334155" : undefined,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Select Individual Test Cases ({selectedCaseIds.length})
              </Typography>
              <Stack>
                {testCases.map((tc) => (
                  <FormControlLabel
                    key={tc.id}
                    control={
                      <Checkbox
                        checked={selectedCaseIds.includes(tc.id)}
                        onChange={() => toggleTestCase(tc.id)}
                      />
                    }
                    label={tc.title}
                  />
                ))}
              </Stack>
            </Paper>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedSuiteId("");
                  setSuiteCases([]);
                  setSelectedCaseIds([]);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Create Run
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Paper
        sx={{
          borderRadius: 3,
          overflowX: "auto",
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Total Cases</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No test runs found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id} hover>
                  <TableCell>{run.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={run.status}
                      color={getStatusColor(run.status)}
                    />
                  </TableCell>
                  <TableCell>{run.createdBy.email}</TableCell>
                  <TableCell>{run._count.testRunItems}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/test-runs/${run.id}`)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default TestRunListPage;
