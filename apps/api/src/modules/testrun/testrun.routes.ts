import { Router } from "express";
import { createTestRun } from "./testrun.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { startExecution } from "./testrun.controller";
import { completeExecution } from "./testrun.controller";
import { getRunProgress } from "./testrun.controller";
import { getAllTestRuns } from "./testrun.controller";
import { getTestRunItems } from "./testrun.controller";
import { pauseExecution } from "./testrun.controller";
import { resumeExecution } from "./testrun.controller";
import {
  getTestRunItem,
  getExecutionSteps
} from "./testrun.controller";
import { updateExecutionStepStatus } from "./testrun.controller";

const router = Router();

/**
 * @route   POST /api/test-runs
 * @desc    Create a new test run
 * @access  Private 
 */
router.post("/", requireAuth, createTestRun);
router.get("/", requireAuth, getAllTestRuns);



router.post("/items/:id/start", requireAuth, startExecution);


router.post("/items/:id/complete", requireAuth, completeExecution);
router.post("/items/:id/pause", requireAuth, pauseExecution);
router.post("/items/:id/resume", requireAuth, resumeExecution);
router.get("/items/:id", requireAuth, getTestRunItem);
router.get("/items/:id/steps", requireAuth, getExecutionSteps);

import { assignTestRunItem } from "./testrun.controller";

router.patch(
  "/items/:id/assign",
  requireAuth,
  assignTestRunItem
);

router.get("/:id/progress", requireAuth, getRunProgress);
router.get("/:id/items", requireAuth, getTestRunItems);
router.patch(
  "/steps/:id/status",
  requireAuth,
  updateExecutionStepStatus
);

export default router;
