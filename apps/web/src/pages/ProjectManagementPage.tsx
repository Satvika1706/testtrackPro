import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  createProject,
  createProjectCustomField,
  createProjectMilestone,
  getProjectCustomFields,
  getProjectMilestones,
  getProjectOverview,
  updateProjectConfig,
  type CustomField,
  type Milestone,
  type ProjectOverview,
} from "../api/projects.api";
import { useProjectContext } from "../context/ProjectContext";
import { getCurrentUser } from "../utils/auth";

const DEFAULT_CONFIG = {
  modules: ["Authentication", "Dashboard", "Payments"],
  environments: ["Development", "Staging", "Production"],
  priorities: ["Low", "Medium", "High", "Critical"],
  severities: ["Minor", "Major", "Critical", "Blocker"],
  testCaseStatuses: ["Draft", "Ready", "Deprecated"],
  bugStatuses: ["Open", "In Progress", "Resolved", "Closed"],
};

const ProjectManagementPage = () => {
  const user = getCurrentUser();
  const canManageProjects = user?.role === "ADMIN";
  const {
    projects,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    refreshProjects,
  } = useProjectContext();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [configText, setConfigText] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [projectKey, setProjectKey] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectConfigText, setProjectConfigText] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));

  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneTargetDate, setMilestoneTargetDate] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState<Milestone["status"]>("PLANNED");

  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldEntityType, setCustomFieldEntityType] = useState<CustomField["entityType"]>("TEST_CASE");
  const [customFieldType, setCustomFieldType] = useState<CustomField["fieldType"]>("TEXT");
  const [customFieldRequired, setCustomFieldRequired] = useState(false);
  const [customFieldOptions, setCustomFieldOptions] = useState("");

  const modulesFromConfig = useMemo(() => {
    try {
      const parsed = JSON.parse(configText) as { modules?: string[] };
      return Array.isArray(parsed.modules) ? parsed.modules : [];
    } catch {
      return [];
    }
  }, [configText]);

  const loadProjectData = async (projectId: string) => {
    if (!projectId) {
      setMilestones([]);
      setCustomFields([]);
      setOverview(null);
      return;
    }
    const [milestoneRows, customFieldRows, overviewData] = await Promise.all([
      getProjectMilestones(projectId),
      getProjectCustomFields(projectId),
      getProjectOverview(projectId),
    ]);
    setMilestones(milestoneRows);
    setCustomFields(customFieldRows);
    setOverview(overviewData);
  };

  useEffect(() => {
    if (!activeProjectId) return;
    void loadProjectData(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProject) return;
    setConfigText(JSON.stringify(activeProject.config || DEFAULT_CONFIG, null, 2));
  }, [activeProject?.id]);

  const clearMessages = () => {
    setStatusMessage("");
    setErrorMessage("");
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
        Project Management
      </Typography>

      {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
      {statusMessage ? <Alert severity="success" sx={{ mb: 2 }}>{statusMessage}</Alert> : null}
      {!canManageProjects ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Project creation and configuration changes are restricted to ADMIN role. You have read-only access.
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Global Project Switcher
        </Typography>
        <FormControl sx={{ minWidth: 360 }}>
          <InputLabel>Active Project</InputLabel>
          <Select
            label="Active Project"
            value={activeProjectId}
            onChange={(e) => {
              clearMessages();
              setActiveProjectId(e.target.value);
            }}
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name} ({project.key})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Project Overview
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 170 }}>
            <Typography color="text.secondary">Test Cases</Typography>
            <Typography variant="h5" fontWeight={800}>{overview?.testCasesCount ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 170 }}>
            <Typography color="text.secondary">Bugs</Typography>
            <Typography variant="h5" fontWeight={800}>{overview?.bugsCount ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 170 }}>
            <Typography color="text.secondary">Test Runs</Typography>
            <Typography variant="h5" fontWeight={800}>{overview?.testRunsCount ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 170 }}>
            <Typography color="text.secondary">Milestones</Typography>
            <Typography variant="h5" fontWeight={800}>{overview?.milestonesCount ?? 0}</Typography>
          </Paper>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          {canManageProjects ? "Project Config JSON Editor" : "Project Configuration"}
        </Typography>
        <TextField
          label="Config JSON"
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          fullWidth
          multiline
          minRows={8}
          InputProps={{ readOnly: !canManageProjects }}
        />
        {canManageProjects ? (
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            disabled={!activeProjectId}
            onClick={async () => {
              clearMessages();
              if (!activeProjectId) return;
              try {
                const parsed = JSON.parse(configText || "{}") as Record<string, unknown>;
                await updateProjectConfig(activeProjectId, parsed);
                setStatusMessage("Project configuration saved");
                await refreshProjects();
                await loadProjectData(activeProjectId);
              } catch {
                setErrorMessage("Invalid configuration JSON");
              }
            }}
          >
            Save Config
          </Button>
        ) : null}
        {modulesFromConfig.length ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Modules: {modulesFromConfig.join(", ")}
          </Typography>
        ) : null}
      </Paper>

      {canManageProjects ? (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Create Project
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Key (unique)" value={projectKey} onChange={(e) => setProjectKey(e.target.value)} />
            <TextField label="Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            <TextField label="Description" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
          </Stack>
          <TextField
            label="Initial Config JSON"
            value={projectConfigText}
            onChange={(e) => setProjectConfigText(e.target.value)}
            fullWidth
            multiline
            minRows={6}
            sx={{ mt: 2 }}
          />
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={async () => {
              clearMessages();
              if (!projectName.trim()) {
                setErrorMessage("Project name is required");
                return;
              }
              try {
                const parsedConfig = JSON.parse(projectConfigText || "{}");
                const created = await createProject({
                  key: projectKey.trim().toLowerCase(),
                  name: projectName.trim(),
                  description: projectDescription.trim() || undefined,
                  config: parsedConfig,
                });
                setStatusMessage("Project created");
                setProjectKey("");
                setProjectName("");
                setProjectDescription("");
                await refreshProjects();
                setActiveProjectId(created.id);
              } catch (error: any) {
                setErrorMessage(error?.response?.data?.message || "Project key already exists");
              }
            }}
          >
            Create Project
          </Button>
        </Paper>
      ) : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={3}>
        <Paper sx={{ p: 3, borderRadius: 3, flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Milestones
          </Typography>
          {canManageProjects ? (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <TextField label="Name" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} />
              <TextField label="Description" value={milestoneDescription} onChange={(e) => setMilestoneDescription(e.target.value)} />
              <TextField
                label="Target Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={milestoneTargetDate}
                onChange={(e) => setMilestoneTargetDate(e.target.value)}
              />
              <FormControl>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={milestoneStatus}
                  onChange={(e) => setMilestoneStatus(e.target.value as Milestone["status"])}
                >
                  <MenuItem value="PLANNED">Planned</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                disabled={!activeProjectId}
                onClick={async () => {
                  clearMessages();
                  if (!activeProjectId || !milestoneName.trim()) return;
                  try {
                    await createProjectMilestone(activeProjectId, {
                      name: milestoneName.trim(),
                      description: milestoneDescription.trim() || undefined,
                      targetDate: milestoneTargetDate ? new Date(`${milestoneTargetDate}T00:00:00.000Z`).toISOString() : undefined,
                      status: milestoneStatus,
                    });
                    setMilestoneName("");
                    setMilestoneDescription("");
                    setMilestoneTargetDate("");
                    setMilestoneStatus("PLANNED");
                    await loadProjectData(activeProjectId);
                  } catch {
                    setErrorMessage("Failed to create milestone");
                  }
                }}
              >
                Add Milestone
              </Button>
            </Stack>
          ) : null}
          <Stack spacing={1}>
            {milestones.map((milestone) => (
              <Paper key={milestone.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight={700}>{milestone.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {milestone.description || "No description"} | {milestone.status} | Target:{" "}
                  {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "-"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Progress: {milestone.progress?.completed ?? 0}/{milestone.progress?.total ?? 0} ({milestone.progress?.percentage ?? 0}%)
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3, flex: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Project Custom Fields
          </Typography>
          {canManageProjects ? (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <TextField label="Field Name" value={customFieldName} onChange={(e) => setCustomFieldName(e.target.value)} />
              <FormControl>
                <InputLabel>Entity</InputLabel>
                <Select
                  label="Entity"
                  value={customFieldEntityType}
                  onChange={(e) => setCustomFieldEntityType(e.target.value as CustomField["entityType"])}
                >
                  <MenuItem value="TEST_CASE">Test Case</MenuItem>
                  <MenuItem value="BUG">Bug</MenuItem>
                  <MenuItem value="TEST_RUN">Test Run</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={customFieldType}
                  onChange={(e) => setCustomFieldType(e.target.value as CustomField["fieldType"])}
                >
                  <MenuItem value="TEXT">Text</MenuItem>
                  <MenuItem value="NUMBER">Number</MenuItem>
                  <MenuItem value="DATE">Date</MenuItem>
                  <MenuItem value="SELECT">Dropdown</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Checkbox checked={customFieldRequired} onChange={(e) => setCustomFieldRequired(e.target.checked)} />}
                label="Required"
              />
              {customFieldType === "SELECT" ? (
                <TextField
                  label="Dropdown Options (comma separated)"
                  value={customFieldOptions}
                  onChange={(e) => setCustomFieldOptions(e.target.value)}
                />
              ) : null}
              <Button
                variant="contained"
                disabled={!activeProjectId}
                onClick={async () => {
                  clearMessages();
                  if (!activeProjectId || !customFieldName.trim()) return;
                  try {
                    const options =
                      customFieldType === "SELECT"
                        ? customFieldOptions
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean)
                        : undefined;
                    await createProjectCustomField(activeProjectId, {
                      entityType: customFieldEntityType,
                      name: customFieldName.trim(),
                      fieldType: customFieldType,
                      required: customFieldRequired,
                      options,
                    });
                    setCustomFieldName("");
                    setCustomFieldOptions("");
                    setCustomFieldRequired(false);
                    await loadProjectData(activeProjectId);
                  } catch (error: any) {
                    setErrorMessage(error?.response?.data?.message || "Failed to create custom field");
                  }
                }}
              >
                Add Custom Field
              </Button>
            </Stack>
          ) : null}
          <Stack spacing={1}>
            {customFields.map((field) => (
              <Paper key={field.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight={700}>{field.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {field.entityType} | {field.fieldType} | Required: {field.required ? "Yes" : "No"}
                </Typography>
                {Array.isArray(field.options) && field.options.length ? (
                  <Typography variant="body2" color="text.secondary">
                    Options: {field.options.join(", ")}
                  </Typography>
                ) : null}
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default ProjectManagementPage;
