import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/axios";

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  module?: string;
}

const TestSuites = () => {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    void fetchSuites();
  }, []);

  const fetchSuites = async () => {
    try {
      const res = await api.get("/api/test-suites");
      setSuites(res.data);
    } catch (error) {
      console.error("Failed to fetch suites", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuite = async () => {
    if (!name) {
      alert("Suite name is required");
      return;
    }

    try {
      await api.post("/api/test-suites", {
        name,
        description,
        module,
      });

      alert("Suite created successfully");
      setName("");
      setDescription("");
      setModule("");
      setShowForm(false);
      void fetchSuites();
    } catch (error) {
      console.error("Create suite failed", error);
      alert("Failed to create suite");
    }
  };

  const moduleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          suites
            .map((suite) => (suite.module || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [suites]
  );

  const filteredSuites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suites.filter((suite) => {
      if (moduleFilter && (suite.module || "") !== moduleFilter) return false;
      if (q) {
        const haystack = `${suite.name} ${suite.description || ""} ${suite.module || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [suites, search, moduleFilter]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading suites...</Typography>
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
          Test Suites
        </Typography>
        <Button type="button" variant="contained" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Suite"}
        </Button>
      </Stack>

      {showForm ? (
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3, maxWidth: 560 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
            Create New Suite
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              label="Suite Name"
              placeholder="Suite Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
            <TextField
              label="Module"
              placeholder="Module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              fullWidth
            />

            <Button type="button" variant="contained" onClick={handleCreateSuite}>
              Save Suite
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search suites by name, description, module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Module</InputLabel>
            <Select
              label="Module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {moduleOptions.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => {
              setSearch("");
              setModuleFilter("");
            }}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      {filteredSuites.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography color="text.secondary">No test suites match your filters.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredSuites.map((suite) => (
            <Paper
              key={suite.id}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box>
                <Typography fontWeight={700}>{suite.name}</Typography>
                <Typography color="text.secondary">
                  {suite.description || "No description"}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Module: {suite.module || "-"}
                </Typography>
              </Box>
              <Button type="button" variant="outlined" onClick={() => navigate(`/test-suites/${suite.id}`)}>
                View
              </Button>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default TestSuites;
