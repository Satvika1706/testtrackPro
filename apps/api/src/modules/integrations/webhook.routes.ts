import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { authorizeRoles } from "../../middleware/role.middleware";
import { createWebhookEndpointSchema, updateWebhookEndpointSchema } from "./webhook.schema";
import { WebhookService } from "./webhook.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Response } from "express";

const router = Router();

router.use(requireAuth, authorizeRoles([Role.ADMIN]));

router.get("/webhooks", async (req, res) => {
  try {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const rows = await WebhookService.listEndpoints(projectId);
    return res.json({ data: rows });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to load webhook endpoints" });
  }
});

router.post("/webhooks", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createWebhookEndpointSchema.parse(req.body);
    const row = await WebhookService.createEndpoint({
      ...parsed,
      createdById: req.user?.userId,
    });
    return res.status(201).json({ data: row });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to create webhook endpoint" });
  }
});

router.patch("/webhooks/:id", async (req, res) => {
  try {
    const parsed = updateWebhookEndpointSchema.parse(req.body);
    const row = await WebhookService.updateEndpoint(req.params.id, parsed);
    return res.json({ data: row });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update webhook endpoint" });
  }
});

router.delete("/webhooks/:id", async (req, res) => {
  try {
    await WebhookService.deleteEndpoint(req.params.id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to delete webhook endpoint" });
  }
});

export default router;
