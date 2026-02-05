import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

import {
  getTestCases,
  createTestCase,
  updateTestCase,
  cloneTestCase,
  deleteTestCase,
} from "./testcase.controller";

const router = Router();

/**
 * GET ALL TEST CASES
 * GET /api/test-cases
 */
router.get(
  "/test-cases",
  requireAuth,
  getTestCases
);

/**
 * CREATE TEST CASE
 * POST /api/
 */
router.post(
  "/",
  requireAuth,
  requireRole(["TESTER"]),
  createTestCase
);

/**
 * UPDATE TEST CASE
 * PUT /api/:id
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["TESTER"]),
  updateTestCase
);

/**
 * CLONE TEST CASE
 * POST /api/:id/clone
 */
router.post(
  "/:id/clone",
  requireAuth,
  requireRole(["TESTER"]),
  cloneTestCase
);

/**
 * SOFT DELETE TEST CASE
 * DELETE /api/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["TESTER"]),
  deleteTestCase
);

export default router;
