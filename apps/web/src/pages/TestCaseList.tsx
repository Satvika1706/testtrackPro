import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  getTestCases,
  cloneTestCase,
  deleteTestCase,
  saveTestCaseAsTemplate,
} from "../api/testcases.api";

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
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? testCases.map((tc) => tc.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm("Delete selected test cases?")) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteTestCase(id)));
      setTestCases((prev) => prev.filter((tc) => !selectedIds.includes(tc.id)));
      setSelectedIds([]);
    } catch {
      alert("Bulk delete failed");
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setTestCases((prev) =>
      prev.map((tc) =>
        selectedIds.includes(tc.id) ? { ...tc, status: bulkStatus } : tc
      )
    );
    setSelectedIds([]);
    setBulkStatus("");
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "READY_FOR_REVIEW":
        return "warning";
      case "DRAFT":
        return "default";
      default:
        return "info";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "error";
      case "MEDIUM":
        return "warning";
      case "LOW":
        return "success";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading test cases...</Typography>
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
          Test Cases
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" component={RouterLink} to="/templates">
            Go to Templates
          </Button>
          <Button variant="contained" component={RouterLink} to="/test-cases/create">
            Create Test Case
          </Button>
        </Stack>
      </Stack>

      {testCases.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography color="text.secondary">
            No test cases found. Create one to get started.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Typography fontWeight={600} color="text.secondary">
                Bulk Actions
              </Typography>
              <Button
                color="error"
                variant="contained"
                disabled={selectedIds.length === 0}
                onClick={handleBulkDelete}
              >
                Delete Selected
              </Button>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="bulk-status-label">Update Status</InputLabel>
                <Select
                  labelId="bulk-status-label"
                  label="Update Status"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="READY_FOR_REVIEW">Ready</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                disabled={!bulkStatus || selectedIds.length === 0}
                onClick={handleBulkStatusUpdate}
              >
                Apply
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.length === testCases.length && testCases.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {testCases.map((tc) => (
                  <TableRow key={tc.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(tc.id)}
                        onChange={(e) => handleSelectOne(tc.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "monospace", color: "text.secondary" }}
                      >
                        #{tc.id.substring(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>{tc.title}</TableCell>
                    <TableCell>{tc.module}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={tc.priority}
                        color={getPriorityColor(tc.priority)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{tc.severity}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={tc.status}
                        color={getStatusColor(tc.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button size="small" variant="outlined" sx={{ fontWeight: 600 }} onClick={() => handleEdit(tc.id)}>
                          Edit
                        </Button>
                        <Button size="small" variant="outlined" sx={{ fontWeight: 600 }} onClick={() => handleClone(tc.id)}>
                          Clone
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleDelete(tc.id)}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: "#f97362",
                            color: "#fff",
                            "&:hover": {
                              backgroundColor: "#f97362",
                            },
                          }}
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                          onClick={() => {
                            setSelectedTestCaseId(tc.id);
                            setIsTemplateModalOpen(true);
                          }}
                        >
                          Template
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}

      <Dialog open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Template</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Template Name"
              placeholder="e.g. Login Template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Category"
              placeholder="e.g. Authentication"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setIsTemplateModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestCaseList;
