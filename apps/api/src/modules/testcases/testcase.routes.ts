import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createTestCase,
  getTestCases,
  getTestCaseById,
  updateTestCaseController,
  cloneTestCase,
  deleteTestCase,
  getTestCaseTemplates
} from "./testcase.controller";
import { getTestCaseHistory } from "./testcase.controller";
import { authorizeRoles } from "../../middleware/role.middleware";



const router = Router();

router.get("/test-cases", requireAuth, authorizeRoles(["TESTER"]), getTestCases);
router.post("/test-cases", requireAuth, authorizeRoles(["TESTER"]),createTestCase);
router.get("/test-cases/:id", requireAuth, authorizeRoles(["TESTER"]), getTestCaseById);
router.put("/test-cases/:id", requireAuth, authorizeRoles(["TESTER"]), updateTestCaseController);
router.delete("/test-cases/:id", requireAuth, authorizeRoles(["TESTER"]),deleteTestCase);
router.post("/test-cases/:id/clone", requireAuth,authorizeRoles(["TESTER"]),cloneTestCase);
router.get(
  "/test-cases/:id/history",
  requireAuth,
  authorizeRoles(["TESTER"]),
  getTestCaseHistory
);
import { createTemplateFromTestCase } from "./testcase.controller";

router.post(
  "/test-cases/:id/template",
  requireAuth,
  authorizeRoles(["TESTER"]),
  createTemplateFromTestCase
);

router.get(
  "/test-case-templates",
  requireAuth,
  authorizeRoles(["TESTER"]),
  getTestCaseTemplates
);


export default router;
