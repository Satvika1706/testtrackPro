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
  updateTriageClassification,
  developerAction,
  getBugComments,
  addBugComment,
  editBugComment,
  deleteBugComment,
  getMentionableUsers,
  getAssignableDevelopers,
  restoreBug,
  softDeleteBug,
} from "./bug.controller";

const router = Router();


router.get(
  "/mentionable-users",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  getMentionableUsers
);
router.get(
  "/assignable-developers",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  getAssignableDevelopers
);

router.get(
  "/my",
  requireAuth,
  requireRole(["DEVELOPER"]),
  getMyAssignedBugs
);


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


router.get(
  "/",
  requireAuth,
  requireRole(["TESTER", "ADMIN", "TRIAGE"]),
  getBugs
);


router.get(
  "/:id",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  getBugById
);


router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  updateBugStatus
);

router.patch(
  "/:id/developer-action",
  requireAuth,
  requireRole(["DEVELOPER", "ADMIN"]),
  developerAction
);

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
router.patch(
  "/:id/triage-classification",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  updateTriageClassification
);

router.patch(
  "/:id/delete",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  softDeleteBug
);

router.patch(
  "/:id/restore",
  requireAuth,
  requireRole(["TRIAGE", "ADMIN"]),
  restoreBug
);

export default router;
