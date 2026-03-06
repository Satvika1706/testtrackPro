import { Request } from "express";
import { ensureDefaultProject, getProjectById } from "./project.service";

const coerceProjectId = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const resolveProjectId = async (
  req: Request,
  userId?: number
) => {
  const fallback = await ensureDefaultProject(userId);
  const headerProjectId = coerceProjectId(req.headers["x-project-id"]);
  const queryProjectId = coerceProjectId(req.query.projectId);
  const bodyProjectId = coerceProjectId((req.body as { projectId?: unknown })?.projectId);
  const requestedProjectId = headerProjectId || queryProjectId || bodyProjectId;

  if (requestedProjectId) {
    const project = await getProjectById(requestedProjectId);
    return project.id;
  }

  return fallback.id;
};
