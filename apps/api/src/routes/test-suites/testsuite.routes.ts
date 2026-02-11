import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createTestSuite } from "./testsuite.controller";
import { getTestSuites } from "./testsuite.controller";
import { addTestCaseToSuite } from "./testsuite.controller";
import { getTestSuiteById } from "./testsuite.controller";
import { removeTestCaseFromSuite } from "./testsuite.controller";
import { reorderTestCasesInSuite } from "./testsuite.controller";
import { archiveTestSuite, restoreTestSuite, } from "./testsuite.controller";


const router = Router();

// Create Test Suite
router.post(
  "/test-suites",
  requireAuth,
  requireRole(["TESTER"]),
  createTestSuite
);

router.get(
  "/test-suites",
  requireAuth,
  requireRole(["TESTER"]),
  getTestSuites
);
router.post(
  "/test-suites/:suiteId/test-cases",
  requireAuth,
  requireRole(["TESTER"]),
  addTestCaseToSuite
);
router.get(
  "/test-suites/:id",
  requireAuth,
  requireRole(["TESTER"]),
  getTestSuiteById
);


router.delete(
  "/test-suites/:suiteId/test-cases/:testCaseId",
  requireAuth,
  requireRole(["TESTER"]),
  removeTestCaseFromSuite
);
router.put(
  "/test-suites/:suiteId/reorder",
  requireAuth,
  requireRole(["TESTER"]),
  reorderTestCasesInSuite
);
import { cloneTestSuite } from "./testsuite.controller";

router.post(
  "/test-suites/:suiteId/clone",
  requireAuth,
  requireRole(["TESTER"]),
  cloneTestSuite
);


router.put(
  "/test-suites/:suiteId/archive",
  requireAuth,
  requireRole(["TESTER"]),
  archiveTestSuite
);

router.put(
  "/test-suites/:suiteId/restore",
  requireAuth,
  requireRole(["TESTER"]),
  restoreTestSuite
);

export default router;
