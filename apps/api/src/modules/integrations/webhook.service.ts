import {
  BugPriority,
  BugSeverity,
  WebhookDeliveryStatus,
  WebhookEndpoint,
  WebhookEventType,
} from "@prisma/client";
import { prisma } from "../../prisma";

type BugWebhookRecord = {
  id: string;
  bugId: string;
  title: string;
  priority: BugPriority;
  severity: BugSeverity;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  createdBy?: {
    id: number;
    email: string;
  } | null;
};

class WebhookDeliveryError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DEFAULT_WORKER_INTERVAL_MS = 15_000;
const DEFAULT_MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 15 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

export class WebhookService {
  private static worker: NodeJS.Timeout | null = null;

  static async listEndpoints(projectId?: string) {
    return prisma.webhookEndpoint.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createEndpoint(input: {
    name: string;
    url: string;
    projectId?: string | null;
    secret?: string;
    isActive?: boolean;
    eventTypes: WebhookEventType[];
    priorityFilter?: BugPriority[];
    maxRetries?: number;
    createdById?: number;
  }) {
    return prisma.webhookEndpoint.create({
      data: {
        name: input.name,
        url: input.url,
        projectId: input.projectId ?? null,
        secret: input.secret,
        isActive: input.isActive ?? true,
        eventTypes: input.eventTypes,
        priorityFilter: input.priorityFilter ?? [],
        maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
        createdById: input.createdById,
      },
    });
  }

  static async updateEndpoint(
    endpointId: string,
    input: {
      name?: string;
      url?: string;
      projectId?: string | null;
      secret?: string | null;
      isActive?: boolean;
      eventTypes?: WebhookEventType[];
      priorityFilter?: BugPriority[];
      maxRetries?: number;
    }
  ) {
    return prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        ...(typeof input.name !== "undefined" ? { name: input.name } : {}),
        ...(typeof input.url !== "undefined" ? { url: input.url } : {}),
        ...(typeof input.projectId !== "undefined" ? { projectId: input.projectId } : {}),
        ...(typeof input.secret !== "undefined" ? { secret: input.secret } : {}),
        ...(typeof input.isActive !== "undefined" ? { isActive: input.isActive } : {}),
        ...(typeof input.eventTypes !== "undefined" ? { eventTypes: input.eventTypes } : {}),
        ...(typeof input.priorityFilter !== "undefined" ? { priorityFilter: input.priorityFilter } : {}),
        ...(typeof input.maxRetries !== "undefined" ? { maxRetries: input.maxRetries } : {}),
      },
    });
  }

  static async deleteEndpoint(endpointId: string) {
    return prisma.webhookEndpoint.delete({
      where: { id: endpointId },
    });
  }

  static async emitBugEvent(eventType: WebhookEventType, bug: BugWebhookRecord) {
    const projectScope = bug.projectId
      ? [{ projectId: null }, { projectId: bug.projectId }]
      : [{ projectId: null }];

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        eventTypes: { has: eventType },
        OR: projectScope,
      },
    });

    const eligible = endpoints.filter((endpoint) =>
      this.matchesPriorityFilter(endpoint, bug.priority)
    );

    if (!eligible.length) {
      return;
    }

    const payload = this.buildBugEventPayload(eventType, bug);
    await prisma.webhookDelivery.createMany({
      data: eligible.map((endpoint) => ({
        endpointId: endpoint.id,
        bugId: bug.id,
        eventType,
        status: WebhookDeliveryStatus.PENDING,
        attempts: 0,
        maxAttempts: Math.max(1, endpoint.maxRetries + 1),
        requestBody: payload,
        nextAttemptAt: new Date(),
      })),
    });

    void this.processPendingDeliveries(10);
  }

  static startWorker() {
    if (this.worker) {
      return;
    }

    const intervalMs = Number(process.env.WEBHOOK_WORKER_INTERVAL_MS ?? DEFAULT_WORKER_INTERVAL_MS);
    this.worker = setInterval(() => {
      void this.processPendingDeliveries().catch((error) => {
        console.error("Webhook worker failed:", error);
      });
    }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_WORKER_INTERVAL_MS);
    this.worker.unref();
  }

  static async processPendingDeliveries(limit = 25) {
    const now = new Date();
    const queue = await prisma.webhookDelivery.findMany({
      where: {
        status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED] },
        nextAttemptAt: { lte: now },
      },
      include: {
        endpoint: true,
      },
      orderBy: { nextAttemptAt: "asc" },
      take: limit,
    });

    for (const delivery of queue) {
      const claim = await prisma.webhookDelivery.updateMany({
        where: {
          id: delivery.id,
          status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED] },
          attempts: delivery.attempts,
        },
        data: {
          status: WebhookDeliveryStatus.PROCESSING,
          attempts: { increment: 1 },
        },
      });

      if (!claim.count) {
        continue;
      }

      const attemptNo = delivery.attempts + 1;
      if (!delivery.endpoint.isActive) {
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DEAD,
            lastError: "Endpoint is inactive",
          },
        });
        continue;
      }

      try {
        const responseStatus = await this.sendWebhook(
          delivery.endpoint.url,
          delivery.requestBody,
          delivery.endpoint.secret
        );
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            responseStatus,
            deliveredAt: new Date(),
            lastError: null,
          },
        });
      } catch (error: any) {
        const statusCode = error instanceof WebhookDeliveryError ? error.statusCode : undefined;
        const errorMessage = error instanceof Error ? error.message : "Delivery failed";
        const terminal = attemptNo >= delivery.maxAttempts;

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: terminal ? WebhookDeliveryStatus.DEAD : WebhookDeliveryStatus.FAILED,
            responseStatus: statusCode,
            lastError: errorMessage.slice(0, 500),
            nextAttemptAt: terminal ? delivery.nextAttemptAt : new Date(Date.now() + this.backoffMs(attemptNo)),
          },
        });
      }
    }
  }

  private static matchesPriorityFilter(endpoint: WebhookEndpoint, priority: BugPriority) {
    if (!endpoint.priorityFilter.length) {
      return true;
    }
    return endpoint.priorityFilter.includes(priority);
  }

  private static buildBugEventPayload(eventType: WebhookEventType, bug: BugWebhookRecord) {
    const baseUrl = process.env.WEB_APP_BASE_URL || process.env.APP_BASE_URL || "http://localhost:3000";
    return {
      event: eventType,
      timestamp: new Date().toISOString(),
      bug: {
        id: bug.id,
        bugId: bug.bugId,
        title: bug.title,
        status: bug.status,
        priority: bug.priority,
        severity: bug.severity,
        reporter: bug.createdBy?.email ?? null,
        reporterId: bug.createdBy?.id ?? null,
        projectId: bug.projectId,
        createdAt: bug.createdAt.toISOString(),
        updatedAt: bug.updatedAt.toISOString(),
        url: `${baseUrl}/bugs/${bug.id}`,
      },
    };
  }

  private static backoffMs(attemptNo: number) {
    const ms = DEFAULT_WORKER_INTERVAL_MS * 2 ** Math.max(0, attemptNo - 1);
    return Math.min(ms, MAX_BACKOFF_MS);
  }

  private static async sendWebhook(url: string, payload: unknown, secret?: string | null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(secret ? { "x-webhook-secret": secret } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new WebhookDeliveryError(
          `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
          response.status
        );
      }

      return response.status;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new WebhookDeliveryError("Webhook request timeout");
      }
      if (error instanceof WebhookDeliveryError) {
        throw error;
      }
      throw new WebhookDeliveryError(error?.message || "Webhook delivery failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
