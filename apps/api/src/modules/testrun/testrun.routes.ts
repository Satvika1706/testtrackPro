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
import { requireRole } from "../../middleware/role.middleware";

const router = Router();
const EXECUTION_ROLES = ["TESTER", "DEVELOPER", "ADMIN"];

/**
 * @route   POST /api/test-runs
 * @desc    Create a new test run
 * @access  Private 
 */
router.post("/", requireAuth, createTestRun);
router.get("/", requireAuth,  getAllTestRuns);
router.get("/:id", requireAuth, getTestRun);



router.post("/items/:id/start", requireAuth, requireRole(EXECUTION_ROLES), startExecution);


router.post("/items/:id/complete", requireAuth, requireRole(EXECUTION_ROLES), completeExecution);
router.post("/items/:id/pause", requireAuth, requireRole(EXECUTION_ROLES), pauseExecution);
router.post("/items/:id/resume", requireAuth, requireRole(EXECUTION_ROLES), resumeExecution);
router.get("/items/:id", requireAuth,getTestRunItem);
router.get("/items/:id/steps", requireAuth, getExecutionSteps);

import { assignTestRunItem } from "./testrun.controller";

router.patch(
  "/items/:id/assign",
  requireAuth,
  requireRole(["TESTER"]),
  assignTestRunItem
);

router.get("/:id/progress", requireAuth, getRunProgress);
router.get("/:id/items", requireAuth, getTestRunItems);
router.patch(
  "/steps/:id/status",
  requireAuth,
  requireRole(EXECUTION_ROLES),
  updateExecutionStepStatus
);

export default router;
