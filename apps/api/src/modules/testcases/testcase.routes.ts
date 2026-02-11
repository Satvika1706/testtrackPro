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
import { requireRole } from "../../middleware/role.middleware";



const router = Router();

router.get("/test-cases", requireAuth, getTestCases);
router.post("/test-cases", requireAuth, requireRole(["TESTER"]),createTestCase);
router.get("/test-cases/:id", requireAuth, getTestCaseById);
router.put("/test-cases/:id", requireAuth, updateTestCaseController);
router.delete("/test-cases/:id", requireAuth, deleteTestCase);
router.post("/test-cases/:id/clone", requireAuth, cloneTestCase);
router.get(
  "/test-cases/:id/history",
  requireAuth,
  getTestCaseHistory
);
import { createTemplateFromTestCase } from "./testcase.controller";

router.post(
  "/test-cases/:id/template",
  requireAuth,
  createTemplateFromTestCase
);
router.post("/test", (req, res) => {
  res.send("OK");
});
router.get(
  "/test-case-templates",
  requireAuth,
  getTestCaseTemplates
);


export default router;