import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { updateExecutionStep } from "./execution.controller";

const router = Router();

router.patch("/execution-steps/:id", requireAuth, updateExecutionStep);

export default router;
