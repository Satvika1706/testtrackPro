import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { globalSearch } from "./search.controller";

const router = Router();

router.get(
  "/global",
  requireAuth,
  authorizeRoles(["TESTER", "DEVELOPER", "ADMIN", "TRIAGE"]),
  globalSearch
);

export default router;
