import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

import {
  createBug,
  createBugFromExecution,
  getBugs,
  getBugById,
  updateBugStatus,
  assignBug,
  getMyAssignedBugs,
  triageBug,
  developerAction,
  getBugComments,
  addBugComment,
  editBugComment,
  deleteBugComment,
} from "./bug.controller";

const router = Router();

/**
 * Developer - Get My Assigned Bugs
 * MUST come before "/:id"
 */
router.get(
  "/my",
  requireAuth,
  requireRole(["DEVELOPER"]),
  getMyAssignedBugs
);

/**
 * Create Bug
 */
router.post(
  "/",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN"]),
  createBug
);

router.post(
  "/from-execution",
  requireAuth,
  requireRole(["TESTER", "ADMIN"]),
  createBugFromExecution
);

/**
 * Get All Bugs
 */
router.get(
  "/",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  getBugs
);

/**
 * Get Bug By ID
 * MUST come after static routes
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  getBugById
);

/**
 * Update Bug Status
 */
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  updateBugStatus
);

/**
 * Developer Resolution Actions
 */
router.patch(
  "/:id/developer-action",
  requireAuth,
  requireRole(["DEVELOPER", "ADMIN"]),
  developerAction
);

/**
 * Bug Comments & Collaboration
 */
router.get(
  "/:id/comments",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  getBugComments
);

router.post(
  "/:id/comments",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  addBugComment
);

router.patch(
  "/comments/:commentId",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  editBugComment
);

router.delete(
  "/comments/:commentId",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  deleteBugComment
);

/**
 * Assign Bug
 */
router.patch(
  "/:id/assign",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  assignBug
);
router.patch(
  "/:id/triage",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  triageBug
);

export default router;
