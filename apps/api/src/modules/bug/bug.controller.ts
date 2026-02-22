import { Response } from "express";
import { BugService } from "./bug.service";
import {
  createBugSchema,
  createBugCommentSchema,
  createBugFromExecutionSchema,
  developerActionSchema,
  triageDecisionSchema,
  updateBugCommentSchema,
  updateBugStatusSchema,
} from "./bug.validation";
import { AuthRequest } from "../../middleware/auth.middleware";

/* =========================================================
   CREATE BUG
========================================================= */

export const createBug = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createBugSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bug = await BugService.createBug(parsed, req.user.userId);

    return res.status(201).json(bug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to create bug",
    });
  }
};

/* =========================================================
   CREATE BUG FROM EXECUTION
========================================================= */

export const createBugFromExecution = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const parsed = createBugFromExecutionSchema.parse(req.body);

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bug = await BugService.createBugFromExecution(
      parsed,
      req.user.userId
    );

    return res.status(201).json(bug);
  } catch (error: any) {
    return res.status(400).json({
      error: error.message || "Failed to create bug from execution",
    });
  }
};

/* =========================================================
   GET ALL BUGS
========================================================= */

export const getBugs = async (_req: AuthRequest, res: Response) => {
  try {
    const bugs = await BugService.getBugs();
    return res.json(bugs);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bugs" });
  }
};

/* =========================================================
   GET BUG BY ID
========================================================= */

export const getBugById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bug = await BugService.getBugById(id, req.user.role);

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

/* =========================================================
   TRIAGE BUG
========================================================= */

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

/* =========================================================
   UPDATE STATUS
========================================================= */

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

/* =========================================================
   DEVELOPER ACTION
========================================================= */

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

/* =========================================================
   COMMENTS
========================================================= */

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

/* =========================================================
   ASSIGN BUG
========================================================= */

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

/* =========================================================
   GET MY ASSIGNED
========================================================= */

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

    const bugs = await BugService.getMyAssignedBugs(
      req.user.userId,
      {
        status: status as string | undefined,
        priority: priority as string | undefined,
        severity: severity as string | undefined,
        sortBy: sortBy as string | undefined,
        page: Number(page),
        limit: Number(limit),
      }
    );

    return res.json(bugs);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};