import { Response } from "express";
import { BugService } from "./bug.service";
import {
  createBugSchema,
  createBugCommentSchema,
  createBugFromExecutionSchema,
  developerActionSchema,
  softDeleteBugSchema,
  triageDecisionSchema,
  triageClassificationSchema,
  updateBugCommentSchema,
  updateBugStatusSchema,
} from "./bug.validation";
import { AuthRequest } from "../../middleware/auth.middleware";
import { resolveProjectId } from "../projects/project.context";

export const createBug = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createBugSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projectId = await resolveProjectId(req, req.user.userId);
    const bug = await BugService.createBug(parsed, req.user.userId, projectId);

    return res.status(201).json(bug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to create bug",
    });
  }
};

export const createBugFromExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const parsed = createBugFromExecutionSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projectId = await resolveProjectId(req, req.user.userId);
    const bug = await BugService.createBugFromExecution(
      parsed,
      req.user.userId,
      projectId
    );

    return res.status(201).json(bug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to create bug from execution",
    });
  }
};

export const getBugs = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, req.user?.userId);
    const bugs = await BugService.getBugs(projectId);
    return res.json(bugs);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bugs" });
  }
};

export const getBugById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projectId = await resolveProjectId(req, req.user.userId);
    const bug = await BugService.getBugById(id, req.user.role, projectId);

    if (!bug) {
      return res.status(404).json({ error: "Bug not found" });
    }

    return res.json(bug);
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch bug",
    });
  }
};

export const triageBug = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { decision } = triageDecisionSchema.parse(req.body);

    const bug = await BugService.triageBug(id, decision, req.user);

    return res.json(bug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to triage bug",
    });
  }
};

export const updateTriageClassification = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const parsed = triageClassificationSchema.parse(req.body);

    const updated = await BugService.updateTriageClassification(id, parsed);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to update triage classification",
    });
  }
};

export const updateBugStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status } = updateBugStatusSchema.parse(req.body);

    const updated = await BugService.updateStatus(id, status, req.user);

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to update status",
    });
  }
};

export const developerAction = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const parsed = developerActionSchema.parse(req.body);

    const updated = await BugService.performDeveloperAction(
      id,
      parsed,
      req.user
    );

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Developer action failed",
    });
  }
};

export const getBugComments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const comments = await BugService.getComments(id);
    return res.json(comments);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const addBugComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const parsed = createBugCommentSchema.parse(req.body);

    const created = await BugService.addComment(
      id,
      parsed,
      req.user.userId
    );

    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const editBugComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { commentId } = req.params;
    const parsed = updateBugCommentSchema.parse(req.body);

    const updated = await BugService.updateComment(
      commentId,
      parsed.content,
      req.user.userId
    );

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteBugComment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { commentId } = req.params;

    const deleted = await BugService.deleteComment(
      commentId,
      req.user.userId
    );

    return res.json(deleted);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const assignBug = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { assignedToId } = req.body as {
      assignedToId?: number;
    };

    if (!assignedToId) {
      return res
        .status(400)
        .json({ error: "assignedToId is required" });
    }

    const updatedBug = await BugService.assignBug(
      id,
      assignedToId
    );

    return res.json(updatedBug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to assign bug",
    });
  }
};

export const getMyAssignedBugs = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      status,
      priority,
      severity,
      sortBy,
      page = 1,
      limit = 10,
    } = req.query;

    const projectId = await resolveProjectId(req, req.user.userId);
    const bugs = await BugService.getMyAssignedBugs(
      req.user.userId,
      {
        status: status as string | undefined,
        priority: priority as string | undefined,
        severity: severity as string | undefined,
        sortBy: sortBy as string | undefined,
        page: Number(page),
        limit: Number(limit),
      },
      projectId
    );

    return res.json(bugs);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getMentionableUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const users = await BugService.getMentionableUsers(query);
    return res.json(users);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to fetch users" });
  }
};

export const getAssignableDevelopers = async (req: AuthRequest, res: Response) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const users = await BugService.getAssignableDevelopers(query);
    return res.json(users);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to fetch developers" });
  }
};

export const softDeleteBug = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const parsed = softDeleteBugSchema.parse(req.body);
    const updated = await BugService.softDeleteBug(
      id,
      parsed.status,
      parsed.deletionReason,
      req.user
    );
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to delete bug",
    });
  }
};

export const restoreBug = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const updated = await BugService.restoreBug(id, req.user);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to restore bug",
    });
  }
};
