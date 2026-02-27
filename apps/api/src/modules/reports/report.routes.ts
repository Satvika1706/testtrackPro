import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  exportReportHandler,
  getBugsReportHandler,
  getDeveloperPerformanceReportHandler,
  getTestExecutionReportHandler,
  getTesterPerformanceReportHandler
} from "./report.controller";

const router = Router();
const REPORT_VIEW_ROLES = ["ADMIN", "TESTER", "DEVELOPER", "TRIAGE"];

router.use(requireAuth, requireRole(REPORT_VIEW_ROLES));

router.get("/test-execution", getTestExecutionReportHandler);
router.get("/bugs", getBugsReportHandler);
router.get(
  "/developer-performance",
  requireRole(["ADMIN", "DEVELOPER"]),
  getDeveloperPerformanceReportHandler
);
router.get(
  "/tester-performance",
  requireRole(["ADMIN", "TESTER", "TRIAGE"]),
  getTesterPerformanceReportHandler
);
router.get("/export", exportReportHandler);

export default router;
