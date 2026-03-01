import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getAllBugs, getMyAssignedBugs, type BugItem } from "../api/bug.api";
import { getCurrentUser } from "../utils/auth";

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace("WONT", "WON'T");

const BugListPage = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);

  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isDeveloper = user?.role === "DEVELOPER";
  const mode: "all" | "my" = isDeveloper ? "my" : "all";

  const loadBugs = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "my") {
        const res = await getMyAssignedBugs({ page: 1, limit: 50 });
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
    if (value === "OPEN" || value === "TRIAGE_PENDING" || value === "TRIAGED") return "info";
    return "default";
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
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem" }}>
          {isDeveloper ? "My Assigned Bugs" : "Bugs"}
        </Typography>
        {(user?.role === "TESTER" || user?.role === "ADMIN") ? (
          <Button variant="contained" onClick={() => navigate("/bugs/create")}>
            + Report Bug
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

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
            </TableRow>
          </TableHead>
          <TableBody>
            {bugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No bugs found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              bugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/bugs/${bug.id}`)}
                >
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
