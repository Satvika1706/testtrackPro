import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  getMyNotifications,
  markNotificationRead,
} from "./notification.controller";

const router = Router();

router.get("/", requireAuth, getMyNotifications);
router.patch("/:id/read", requireAuth, markNotificationRead);

export default router;
