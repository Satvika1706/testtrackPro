import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpoints,
  updateWebhookEndpoint,
  type BugPriority,
  type WebhookEndpoint,
  type WebhookEventType,
} from "../api/integrations.api";
import { useProjectContext } from "../context/ProjectContext";

const WEBHOOK_EVENTS: WebhookEventType[] = [
  "BUG_CREATED",
  "BUG_UPDATED",
  "BUG_RESOLVED",
  "BUG_DELETED",
];
const PRIORITIES: BugPriority[] = ["P1", "P2", "P3", "P4"];

const ManageWebhooksPage = () => {
  const { projects, activeProjectId } = useProjectContext();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [projectScope, setProjectScope] = useState<"GLOBAL" | string>("GLOBAL");
  const [secret, setSecret] = useState("");
  const [maxRetries, setMaxRetries] = useState(5);
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(["BUG_CREATED"]);
  const [selectedPriorities, setSelectedPriorities] = useState<BugPriority[]>([]);
  const [isActive, setIsActive] = useState(true);

  const scopedProjectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, label: `${project.name} (${project.key})` })),
    [projects]
  );

  const loadEndpoints = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await getWebhookEndpoints();
      setEndpoints(rows);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load webhook endpoints");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEndpoints();
  }, []);

  useEffect(() => {
    if (activeProjectId && projectScope === "GLOBAL") {
      setProjectScope(activeProjectId);
    }
  }, [activeProjectId]);

  const resetCreateForm = () => {
    setName("");
    setUrl("");
    setSecret("");
    setMaxRetries(5);
    setSelectedEvents(["BUG_CREATED"]);
    setSelectedPriorities([]);
    setIsActive(true);
  };

  const handleCreateWebhook = async () => {
    setError("");
    setSuccess("");
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
      setError("Name, URL, and at least one event are required");
      return;
    }

    try {
      await createWebhookEndpoint({
        name: name.trim(),
        url: url.trim(),
        projectId: projectScope === "GLOBAL" ? null : projectScope,
        secret: secret.trim() || undefined,
        isActive,
        eventTypes: selectedEvents,
        priorityFilter: selectedPriorities,
        maxRetries,
      });
      setSuccess("Webhook endpoint created");
      resetCreateForm();
      await loadEndpoints();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create webhook endpoint");
    }
  };

  const handleToggleActive = async (row: WebhookEndpoint) => {
    setError("");
    setSuccess("");
    try {
      const updated = await updateWebhookEndpoint(row.id, { isActive: !row.isActive });
      setEndpoints((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update endpoint status");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      await deleteWebhookEndpoint(id);
      setEndpoints((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Webhook endpoint deleted");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to delete endpoint");
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: "2rem", mb: 3 }}>
        Manage Webhooks
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Create Webhook Endpoint
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="webhook-scope-label">Project Scope</InputLabel>
              <Select
                labelId="webhook-scope-label"
                label="Project Scope"
                value={projectScope}
                onChange={(e) => setProjectScope(e.target.value)}
              >
                <MenuItem value="GLOBAL">Global (All Projects)</MenuItem>
                {scopedProjectOptions.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Secret (optional)"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              fullWidth
            />
            <TextField
              label="Max Retries"
              type="number"
              inputProps={{ min: 0, max: 10 }}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Math.max(0, Math.min(10, Number(e.target.value || 0))))}
              fullWidth
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="webhook-events-label">Events</InputLabel>
            <Select
              labelId="webhook-events-label"
              label="Events"
              multiple
              value={selectedEvents}
              onChange={(e) => setSelectedEvents(e.target.value as WebhookEventType[])}
              renderValue={(selected) => (selected as string[]).join(", ")}
            >
              {WEBHOOK_EVENTS.map((eventType) => (
                <MenuItem key={eventType} value={eventType}>
                  {eventType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="webhook-priority-label">Priority Filter (optional)</InputLabel>
            <Select
              labelId="webhook-priority-label"
              label="Priority Filter (optional)"
              multiple
              value={selectedPriorities}
              onChange={(e) => setSelectedPriorities(e.target.value as BugPriority[])}
              renderValue={(selected) =>
                (selected as string[]).length ? (selected as string[]).join(", ") : "All priorities"
              }
            >
              {PRIORITIES.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active on creation"
          />

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => void handleCreateWebhook()}>
              Create Webhook
            </Button>
            <Button variant="outlined" onClick={resetCreateForm}>
              Reset
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Events</TableCell>
              <TableCell>Priority Filter</TableCell>
              <TableCell>Retries</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow key={endpoint.id} hover>
                <TableCell>{endpoint.name}</TableCell>
                <TableCell>
                  {endpoint.projectId
                    ? scopedProjectOptions.find((project) => project.id === endpoint.projectId)?.label ?? endpoint.projectId
                    : "Global"}
                </TableCell>
                <TableCell sx={{ maxWidth: 280, wordBreak: "break-all" }}>{endpoint.url}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {endpoint.eventTypes.map((eventType) => (
                      <Chip key={eventType} size="small" label={eventType} sx={{ mb: 0.5 }} />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  {endpoint.priorityFilter?.length ? endpoint.priorityFilter.join(", ") : "All"}
                </TableCell>
                <TableCell>{endpoint.maxRetries}</TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={endpoint.isActive}
                        onChange={() => void handleToggleActive(endpoint)}
                      />
                    }
                    label={endpoint.isActive ? "Active" : "Paused"}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => void handleDelete(endpoint.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!endpoints.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {isLoading ? "Loading..." : "No webhook endpoints configured"}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default ManageWebhooksPage;
