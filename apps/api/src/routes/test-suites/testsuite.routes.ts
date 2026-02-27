import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
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
  authorizeRoles(["TESTER"]),
  createTestSuite
);

router.get(
  "/test-suites",
  requireAuth,
  authorizeRoles(["TESTER"]),
  getTestSuites
);
router.post(
  "/test-suites/:suiteId/test-cases",
  requireAuth,
  authorizeRoles(["TESTER"]),
  addTestCaseToSuite
);
router.get(
  "/test-suites/:id",
  requireAuth,
  authorizeRoles(["TESTER"]),
  getTestSuiteById
);


router.delete(
  "/test-suites/:suiteId/test-cases/:testCaseId",
  requireAuth,
  authorizeRoles(["TESTER"]),
  removeTestCaseFromSuite
);
router.put(
  "/test-suites/:suiteId/reorder",
  requireAuth,
  authorizeRoles(["TESTER"]),
  reorderTestCasesInSuite
);
import { cloneTestSuite } from "./testsuite.controller";

router.post(
  "/test-suites/:suiteId/clone",
  requireAuth,
  authorizeRoles(["TESTER"]),
  cloneTestSuite
);


router.put(
  "/test-suites/:suiteId/archive",
  requireAuth,
  authorizeRoles(["TESTER"]),
  archiveTestSuite
);

router.put(
  "/test-suites/:suiteId/restore",
  requireAuth,
  authorizeRoles(["TESTER"]),
  restoreTestSuite
);

export default router;
