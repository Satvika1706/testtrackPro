import api from "./axios";

export type WebhookEventType =
  | "BUG_CREATED"
  | "BUG_UPDATED"
  | "BUG_RESOLVED"
  | "BUG_DELETED";

export type BugPriority = "P1" | "P2" | "P3" | "P4";

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  secret?: string | null;
  projectId?: string | null;
  eventTypes: WebhookEventType[];
  priorityFilter: BugPriority[];
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWebhookPayload {
  name: string;
  url: string;
  projectId?: string | null;
  secret?: string;
  isActive?: boolean;
  eventTypes: WebhookEventType[];
  priorityFilter?: BugPriority[];
  maxRetries?: number;
}

export const getWebhookEndpoints = async (projectId?: string) => {
  const res = await api.get<{ data: WebhookEndpoint[] }>("/api/integrations/webhooks", {
    params: projectId ? { projectId } : undefined,
  });
  return res.data.data ?? [];
};

export const createWebhookEndpoint = async (payload: UpsertWebhookPayload) => {
  const res = await api.post<{ data: WebhookEndpoint }>("/api/integrations/webhooks", payload);
  return res.data.data;
};

export const updateWebhookEndpoint = async (
  id: string,
  payload: Partial<UpsertWebhookPayload> & { secret?: string | null }
) => {
  const res = await api.patch<{ data: WebhookEndpoint }>(`/api/integrations/webhooks/${id}`, payload);
  return res.data.data;
};

export const deleteWebhookEndpoint = async (id: string) => {
  await api.delete(`/api/integrations/webhooks/${id}`);
};
