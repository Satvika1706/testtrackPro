import { BugPriority, WebhookEventType } from "@prisma/client";
import { z } from "zod";

const webhookEventValues = Object.values(WebhookEventType) as [WebhookEventType, ...WebhookEventType[]];
const bugPriorityValues = Object.values(BugPriority) as [BugPriority, ...BugPriority[]];

export const createWebhookEndpointSchema = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url(),
  projectId: z.string().uuid().nullable().optional(),
  secret: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  eventTypes: z.array(z.enum(webhookEventValues)).min(1),
  priorityFilter: z.array(z.enum(bugPriorityValues)).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export const updateWebhookEndpointSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  url: z.string().url().optional(),
  projectId: z.string().uuid().nullable().optional(),
  secret: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
  eventTypes: z.array(z.enum(webhookEventValues)).min(1).optional(),
  priorityFilter: z.array(z.enum(bugPriorityValues)).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});
