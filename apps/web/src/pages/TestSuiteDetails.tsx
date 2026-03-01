import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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
    void fetchSuite();
    void fetchAllTestCases();
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
      void fetchSuite();
    } catch (error) {
      console.error("Failed to add test case", error);
      alert("Failed to add test case");
    }
  };

  const handleRemoveTestCase = async (testCaseId: string) => {
    try {
      await api.delete(`/api/test-suites/${id}/test-cases/${testCaseId}`);
      void fetchSuite();
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
      void fetchSuite();
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

    const updatedIds = relations.map((r) => r.testCase.id);
    setSuite({ ...suite, testCases: relations });

    void handleReorder(updatedIds);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading suite...</Typography>
      </Box>
    );
  }

  if (!suite) {
    return <Typography color="text.secondary">Suite not found</Typography>;
  }

  const sortedTestCases = [...suite.testCases].sort((a, b) => a.order - b.order);
  const dangerSx = {
    backgroundColor: "#f97362",
    color: "#fff",
    "&:hover": { backgroundColor: "#f97362" },
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 0.5 }}>
            {suite.name}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {suite.description}
          </Typography>
          {suite.module ? <Chip size="small" variant="outlined" label={`Module: ${suite.module}`} /> : null}
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCloneSuite}>
            Clone Suite
          </Button>
          <Button variant="contained" onClick={handleArchiveSuite} sx={dangerSx}>
            Archive Suite
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
          Manage Test Cases
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-end" }} sx={{ mb: 3 }}>
          <TextField
            select
            fullWidth
            label="Add Test Case to Suite"
            value={selectedTestCaseId}
            onChange={(e) => setSelectedTestCaseId(e.target.value)}
          >
            <MenuItem value="">Select Test Case</MenuItem>
            {allTestCases.map((tc) => (
              <MenuItem key={tc.id} value={tc.id}>
                {tc.title}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleAddTestCase}>
            Add +
          </Button>
        </Stack>

        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Test Cases in this Suite ({suite.testCases.length})
        </Typography>

        {suite.testCases.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
            <Typography color="text.secondary">No test cases in this suite yet.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {sortedTestCases.map((relation, index) => (
              <Paper
                key={relation.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip size="small" label={index + 1} />
                  <Typography fontWeight={600}>{relation.testCase.title}</Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveTestCase(index, "up")}
                    disabled={index === 0}
                  >
                    Up
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveTestCase(index, "down")}
                    disabled={index === sortedTestCases.length - 1}
                  >
                    Down
                  </Button>
                  <Divider orientation="vertical" flexItem />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleRemoveTestCase(relation.testCase.id)}
                    sx={dangerSx}
                  >
                    Remove
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default TestSuiteDetails;
