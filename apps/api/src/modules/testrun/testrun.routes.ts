import { Router } from "express";
import { createTestRun } from "./testrun.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { startExecution } from "./testrun.controller";
import { completeExecution } from "./testrun.controller";
import { getRunProgress } from "./testrun.controller";
import { getAllTestRuns } from "./testrun.controller";
import { getTestRun } from "./testrun.controller";
import { getTestRunItems } from "./testrun.controller";
import { pauseExecution } from "./testrun.controller";
import { resumeExecution } from "./testrun.controller";
import {
  getTestRunItem,
  getExecutionSteps
} from "./testrun.controller";
import { updateExecutionStepStatus } from "./testrun.controller";
import { createReExecution, getExecutionComparison } from "./testrun.controller";
import { authorizeRoles } from "../../middleware/role.middleware";
import { patchRunMilestone } from "../projects/project.controller";

const router = Router();
const EXECUTION_ROLES = ["TESTER"];


router.post("/", requireAuth, authorizeRoles(["TESTER"]), createTestRun);
router.get("/", requireAuth, authorizeRoles(["TESTER"]), getAllTestRuns);
router.get("/:id", requireAuth, authorizeRoles(["TESTER"]), getTestRun);

router.post("/items/:id/start", requireAuth, authorizeRoles(EXECUTION_ROLES), startExecution);

router.post("/items/:id/complete", requireAuth, authorizeRoles(EXECUTION_ROLES), completeExecution);
router.post("/items/:id/pause", requireAuth, authorizeRoles(EXECUTION_ROLES), pauseExecution);
router.post("/items/:id/resume", requireAuth, authorizeRoles(EXECUTION_ROLES), resumeExecution);
router.get("/items/:id", requireAuth, authorizeRoles(["TESTER"]), getTestRunItem);
router.get("/items/:id/steps", requireAuth, authorizeRoles(["TESTER"]), getExecutionSteps);

import { assignTestRunItem } from "./testrun.controller";

router.patch(
  "/items/:id/assign",
  requireAuth,
  authorizeRoles(["TESTER"]),
  assignTestRunItem
);

router.get("/:id/progress", requireAuth, authorizeRoles(["TESTER"]), getRunProgress);
router.get("/:id/items", requireAuth, authorizeRoles(["TESTER"]), getTestRunItems);
router.patch("/:id/milestone", requireAuth, authorizeRoles(["TESTER"]), patchRunMilestone);
router.patch(
  "/steps/:id/status",
  requireAuth,
  authorizeRoles(EXECUTION_ROLES),
  updateExecutionStepStatus
);
router.post(
  "/items/:id/re-execute",
  requireAuth,
  authorizeRoles(EXECUTION_ROLES),
  createReExecution
);
router.get(
  "/items/:id/comparison",
  requireAuth,
  authorizeRoles(["TESTER"]),
  getExecutionComparison
);

export default router;
