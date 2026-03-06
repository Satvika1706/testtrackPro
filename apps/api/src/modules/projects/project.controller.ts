import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { resolveProjectId } from "./project.context";
import {
  createCustomFieldSchema,
  createMilestoneSchema,
  createProjectSchema,
  mapRunMilestoneSchema,
  updateProjectConfigSchema,
  updateProjectSchema,
} from "./project.schema";
import {
  createCustomField,
  createMilestone,
  createProject,
  getProjectOverview,
  listCustomFields,
  listMilestones,
  listProjects,
  mapRunToMilestone,
  updateProject,
  updateProjectConfig,
} from "./project.service";

export const getProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await listProjects();
    res.status(200).json({ data: projects });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const postProject = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createProjectSchema.parse(req.body);
    const project = await createProject({
      ...parsed,
      createdById: req.user!.userId,
    });
    res.status(201).json({ data: project });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const patchProject = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateProjectSchema.parse(req.body);
    const project = await updateProject(req.params.id, parsed);
    res.status(200).json({ data: project });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const putProjectConfig = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateProjectConfigSchema.parse(req.body);
    const project = await updateProjectConfig(req.params.id, parsed.config);
    res.status(200).json({ data: project });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Invalid configuration JSON" });
  }
};

export const getProjectCustomFields = async (req: Request, res: Response) => {
  try {
    const entityTypeRaw = req.query.entityType;
    const entityType =
      entityTypeRaw === "TEST_CASE" ||
      entityTypeRaw === "TEST_SUITE" ||
      entityTypeRaw === "TEST_RUN" ||
      entityTypeRaw === "BUG"
        ? entityTypeRaw
        : undefined;

    const rows = await listCustomFields(req.params.id, entityType);
    res.status(200).json({ data: rows });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const postProjectCustomField = async (req: Request, res: Response) => {
  try {
    const parsed = createCustomFieldSchema.parse(req.body);
    const row = await createCustomField(req.params.id, parsed);
    res.status(201).json({ data: row });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProjectMilestones = async (req: Request, res: Response) => {
  try {
    const statusRaw = req.query.status;
    const status =
      statusRaw === "PLANNED" || statusRaw === "ACTIVE" || statusRaw === "COMPLETED"
        ? statusRaw
        : undefined;
    const rows = await listMilestones(req.params.id, status);
    res.status(200).json({ data: rows });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const postProjectMilestone = async (req: Request, res: Response) => {
  try {
    const parsed = createMilestoneSchema.parse(req.body);
    const row = await createMilestone(req.params.id, parsed);
    res.status(201).json({ data: row });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProjectOverviewStats = async (req: Request, res: Response) => {
  try {
    const data = await getProjectOverview(req.params.id);
    res.status(200).json({ data });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const patchRunMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = mapRunMilestoneSchema.parse(req.body);
    const projectId = await resolveProjectId(req, req.user?.userId);
    const row = await mapRunToMilestone(req.params.id, parsed.milestoneId, projectId);
    res.status(200).json({ data: row });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
