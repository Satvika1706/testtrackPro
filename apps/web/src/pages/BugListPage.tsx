import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { getAllBugs, getMyAssignedBugs, type BugItem } from "../api/bug.api";
import { getCurrentUser } from "../utils/auth";

type FilterState = {
  q: string;
  status: string;
  severity: string;
  priority: string;
  assignee: string;
};

type SavedPreset = {
  name: string;
  filters: FilterState;
};

const PRESET_STORAGE_KEY = "bug_filter_presets_v1";

const defaultFilters: FilterState = {
  q: "",
  status: "",
  severity: "",
  priority: "",
  assignee: "",
};

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace("WONT", "WON'T");

const serializeFilters = (filters: FilterState) =>
  encodeURIComponent(JSON.stringify(filters));

const deserializeFilters = (value: string | null): FilterState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return {
      q: parsed.q || "",
      status: parsed.status || "",
      severity: parsed.severity || "",
      priority: parsed.priority || "",
      assignee: parsed.assignee || "",
    };
  } catch {
    return null;
  }
};

const BugListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useMemo(() => getCurrentUser(), []);

  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<SavedPreset[]>([]);

  const isDeveloper = user?.role === "DEVELOPER";
  const mode: "all" | "my" = isDeveloper ? "my" : "all";

  const loadBugs = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "my") {
        const res = await getMyAssignedBugs({ page: 1, limit: 200 });
        setBugs(res.data.data || []);
      } else {
        const res = await getAllBugs();
        setBugs(res.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBugs();
  }, [mode]);

  useEffect(() => {
    const fromUrl = deserializeFilters(searchParams.get("preset"));
    if (fromUrl) {
      setFilters(fromUrl);
      setShowAdvanced(true);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch {
      setPresets([]);
    }
  }, []);

  const persistPresets = (next: SavedPreset[]) => {
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  };

  const statusOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.status))).sort(),
    [bugs]
  );
  const severityOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.severity))).sort(),
    [bugs]
  );
  const priorityOptions = useMemo(
    () => Array.from(new Set(bugs.map((b) => b.priority))).sort(),
    [bugs]
  );

  const filteredBugs = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return bugs.filter((bug) => {
      if (filters.status && bug.status !== filters.status) return false;
      if (filters.severity && bug.severity !== filters.severity) return false;
      if (filters.priority && bug.priority !== filters.priority) return false;
      if (
        filters.assignee &&
        !(bug.assignedTo?.email || "").toLowerCase().includes(filters.assignee.toLowerCase())
      ) {
        return false;
      }
      if (q) {
        const text = [
          bug.bugId,
          bug.title,
          bug.description,
          bug.status,
          bug.severity,
          bug.priority,
          bug.assignedTo?.email || "",
          bug.createdBy?.email || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [bugs, filters]);

  const getChipColor = (kind: "severity" | "priority" | "status", value: string) => {
    if (kind === "severity") {
      if (value === "BLOCKER" || value === "CRITICAL") return "error";
      if (value === "MAJOR") return "warning";
      if (value === "MINOR") return "info";
      return "default";
    }
    if (kind === "priority") {
      if (value === "P1") return "error";
      if (value === "P2") return "warning";
      if (value === "P3") return "info";
      return "default";
    }
    if (value === "IN_PROGRESS") return "warning";
    if (value === "FIXED" || value === "VERIFIED") return "success";
    if (value === "REOPENED") return "error";
    if (value === "OPEN") return "info";
    return "default";
  };

  const applyQuickFilter = (name: "critical" | "open" | "reopened" | "mine") => {
    if (name === "critical") {
      setFilters((prev) => ({ ...prev, severity: "CRITICAL" }));
      return;
    }
    if (name === "open") {
      setFilters((prev) => ({ ...prev, status: "OPEN" }));
      return;
    }
    if (name === "reopened") {
      setFilters((prev) => ({ ...prev, status: "REOPENED" }));
      return;
    }
    if (name === "mine" && user?.email) {
      setFilters((prev) => ({ ...prev, assignee: user.email }));
    }
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, filters }];
    persistPresets(next);
    setPresetName("");
  };

  const handleSharePreset = async () => {
    const url = `${window.location.origin}${window.location.pathname}?preset=${serializeFilters(filters)}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Preset link copied");
    } catch {
      alert(url);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading bugs...</Typography>
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
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          {isDeveloper ? "My Assigned Bugs" : "Bugs"}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setShowAdvanced((prev) => !prev)}>
            {showAdvanced ? "Hide Filters" : "Advanced Filters"}
          </Button>
          {(user?.role === "TESTER" || user?.role === "ADMIN") ? (
            <Button variant="contained" onClick={() => navigate("/bugs/create")}>
              + Report Bug
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 2.5, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder="Quick search bugs..."
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
          <Button variant="outlined" onClick={() => applyQuickFilter("critical")}>
            Critical
          </Button>
          <Button variant="outlined" onClick={() => applyQuickFilter("open")}>
            Open
          </Button>
          <Button variant="outlined" onClick={() => applyQuickFilter("reopened")}>
            Reopened
          </Button>
          <Button variant="outlined" onClick={() => applyQuickFilter("mine")}>
            My Queue
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters(defaultFilters);
              setSearchParams({});
            }}
          >
            Reset
          </Button>
        </Stack>
      </Paper>

      {showAdvanced ? (
        <Paper sx={{ p: 2, borderRadius: 2.5, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                label="Severity"
                value={filters.severity}
                onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {severityOptions.map((severity) => (
                  <MenuItem key={severity} value={severity}>
                    {severity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                label="Priority"
                value={filters.priority}
                onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                {priorityOptions.map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Assignee Email"
              value={filters.assignee}
              onChange={(e) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label="Preset Name"
              placeholder="e.g. Critical Open Bugs"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button variant="contained" onClick={handleSavePreset}>
              Save Preset
            </Button>
            <Button variant="outlined" onClick={handleSharePreset}>
              Share Preset
            </Button>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Apply Saved Preset</InputLabel>
              <Select
                label="Apply Saved Preset"
                value=""
                onChange={(e) => {
                  const selected = presets.find((p) => p.name === e.target.value);
                  if (selected) setFilters(selected.filters);
                }}
              >
                {presets.map((preset) => (
                  <MenuItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Showing {filteredBugs.length} of {bugs.length} bugs
      </Typography>

      <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bug ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Reported By</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No bugs found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredBugs.map((bug) => (
                <TableRow key={bug.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                      {bug.bugId}
                    </Typography>
                  </TableCell>
                  <TableCell>{bug.title}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={bug.severity}
                      color={getChipColor("severity", bug.severity)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={bug.priority}
                      color={getChipColor("priority", bug.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatStatus(bug.status)}
                      color={getChipColor("status", bug.status)}
                    />
                  </TableCell>
                  <TableCell>{bug.assignedTo?.email || "-"}</TableCell>
                  <TableCell>{bug.createdBy?.email || `User ${bug.createdById}`}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/bugs/${bug.id}`)}>
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

export default BugListPage;
