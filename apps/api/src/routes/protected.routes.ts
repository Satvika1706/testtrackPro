import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/tester",
  requireAuth,
  requireRole(["TESTER"]),
  (req, res) => {
    res.json({ message: "Hello Tester, you are authorized!" });
  }
);

export default router;
