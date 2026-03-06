import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import {
  getProjectCustomFields,
  getProjectMilestones,
  getProjectOverviewStats,
  getProjects,
  patchProject,
  putProjectConfig,
  postProject,
  postProjectCustomField,
  postProjectMilestone,
} from "./project.controller";

const router = Router();

router.get("/", requireAuth, authorizeRoles(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]), getProjects);
router.post("/", requireAuth, authorizeRoles(["ADMIN"]), postProject);
router.patch("/:id", requireAuth, authorizeRoles(["ADMIN"]), patchProject);
router.put("/:id/config", requireAuth, authorizeRoles(["ADMIN"]), putProjectConfig);
router.get("/:id/overview", requireAuth, authorizeRoles(["TESTER", "ADMIN", "DEVELOPER", "TRIAGE"]), getProjectOverviewStats);

router.get("/:id/custom-fields", requireAuth, authorizeRoles(["TESTER", "ADMIN", "DEVELOPER", "TRIAGE"]), getProjectCustomFields);
router.post("/:id/custom-fields", requireAuth, authorizeRoles(["ADMIN"]), postProjectCustomField);
router.get("/:id/milestones", requireAuth, authorizeRoles(["TESTER", "ADMIN", "DEVELOPER", "TRIAGE"]), getProjectMilestones);
router.post("/:id/milestones", requireAuth, authorizeRoles(["ADMIN"]), postProjectMilestone);

export default router;
