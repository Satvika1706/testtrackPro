import { useEffect, useMemo, useState } from "react";
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
  Divider,
  InputAdornment,
  useTheme,
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
}

const TestCaseList = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [search, setSearch] = useState("");
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

  const filteredCases = useMemo(() => {
    return testCases.filter((tc) =>
      tc.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [testCases, search]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredCases.map((tc) => tc.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => deleteTestCase(id)));
    setTestCases((prev) => prev.filter((tc) => !selectedIds.includes(tc.id)));
    setSelectedIds([]);
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus || !selectedIds.length) return;

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

    await saveTestCaseAsTemplate(selectedTestCaseId, {
      name: templateName,
      category: templateCategory,
    });

    setIsTemplateModalOpen(false);
    setTemplateName("");
    setTemplateCategory("");
  };

  const getStatusColor = (status: string) => {
    if (status === "APPROVED") return "success";
    if (status === "READY_FOR_REVIEW") return "warning";
    if (status === "DRAFT") return "default";
    return "info";
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "HIGH") return "error";
    if (priority === "MEDIUM") return "warning";
    if (priority === "LOW") return "success";
    return "default";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={22} />
        <Typography color="text.secondary">
          Loading test cases...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 4, py: 3, backgroundColor: isDark ? "#0b1220" : "#f8fafc", minHeight: "100vh" }}>
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Test Cases
          </Typography>
          <Typography color="text.secondary">
            Manage, organize and review your test coverage
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" component={RouterLink} to="/templates">
            Templates
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            to="/test-cases/create"
            sx={{ px: 3 }}
          >
            + Create Test Case
          </Button>
        </Stack>
      </Stack>

      {/* SEARCH + BULK */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.35)" : "0 6px 20px rgba(0,0,0,0.04)",
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          mb: 3,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search test cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: 280,
              "& .MuiOutlinedInput-root": {
                color: isDark ? "#e2e8f0" : "inherit",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                 
                </InputAdornment>
              ),
            }}
          />

          <Button
            color="error"
            variant="outlined"
            disabled={!selectedIds.length}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Update Status</InputLabel>
            <Select
              value={bulkStatus}
              label="Update Status"
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="READY_FOR_REVIEW">Ready</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            disabled={!bulkStatus || !selectedIds.length}
            onClick={handleBulkStatusUpdate}
          >
            Apply
          </Button>
        </Stack>
      </Paper>

      {/* TABLE */}
      <Paper
        sx={{
          borderRadius: 3,
          boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(0,0,0,0.05)",
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <Table
          sx={{
            ...(isDark
              ? {
                  "& tbody tr:hover td": {
                    backgroundColor: "#273549 !important",
                  },
                  "& tbody tr.Mui-selected td, & tbody tr.Mui-selected:hover td": {
                    backgroundColor: "#334155 !important",
                  },
                }
              : {}),
          }}
        >
          <TableHead sx={{ backgroundColor: isDark ? "#0f172a" : "#f1f5f9" }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    selectedIds.length === filteredCases.length &&
                    filteredCases.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredCases.map((tc) => (
              <TableRow
                key={tc.id}
                hover
                selected={selectedIds.includes(tc.id)}
                sx={{
                  "&:hover": {
                    backgroundColor: isDark ? "#273549 !important" : "#f8fafc",
                  },
                  ...(isDark
                    ? {
                        "&.Mui-selected, &.Mui-selected:hover": {
                          backgroundColor: "#334155 !important",
                        },
                      }
                    : {}),
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(tc.id)}
                    onChange={(e) =>
                      handleSelectOne(tc.id, e.target.checked)
                    }
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

                <TableCell sx={{ fontWeight: 500 }}>
                  {tc.title}
                </TableCell>

                <TableCell>{tc.module}</TableCell>

                <TableCell>
                  <Chip size="small" label={tc.priority} color={getPriorityColor(tc.priority)} />
                </TableCell>

                <TableCell>{tc.severity}</TableCell>

                <TableCell>
                  <Chip size="small" label={tc.status} color={getStatusColor(tc.status)} />
                </TableCell>

                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/test-case/edit/${tc.id}`)}>
                      Edit
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => cloneTestCase(tc.id).then(fetchTestCases)}>
                      Clone
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => deleteTestCase(tc.id).then(fetchTestCases)}>
                      Delete
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
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

      {/* TEMPLATE MODAL */}
      <Dialog open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Template</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Category"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestCaseList;
