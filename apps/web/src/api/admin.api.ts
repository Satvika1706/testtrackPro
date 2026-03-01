import api from "./axios";

export type AdminRole = "TESTER" | "DEVELOPER" | "ADMIN" | "TRIAGE";

export interface AdminUser {
  id: number;
  email: string;
  role: AdminRole;
  isEmailVerified: boolean;
  isDeactivated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSummary {
  role: AdminRole;
  userCount: number;
  description: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  role: AdminRole;
}

export interface UpdateAdminUserPayload {
  email?: string;
  role?: AdminRole;
  isEmailVerified?: boolean;
  isDeactivated?: boolean;
}

export const getAdminUsers = async (params?: {
  search?: string;
  role?: string;
  isDeactivated?: string;
}) => {
  const res = await api.get<AdminUser[]>("/api/admin/users", { params });
  return res.data;
};

export const createAdminUser = async (payload: CreateAdminUserPayload) => {
  const res = await api.post<AdminUser>("/api/admin/users", payload);
  return res.data;
};

export const updateAdminUser = async (id: number, payload: UpdateAdminUserPayload) => {
  const res = await api.patch<AdminUser>(`/api/admin/users/${id}`, payload);
  return res.data;
};

export const updateAdminUserRole = async (id: number, role: AdminRole) => {
  const res = await api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role });
  return res.data;
};

export const updateAdminUserDeactivation = async (id: number, isDeactivated: boolean) => {
  const res = await api.patch<AdminUser>(`/api/admin/users/${id}/deactivation`, { isDeactivated });
  return res.data;
};

export const getRoleSummaries = async () => {
  const res = await api.get<{ roles: RoleSummary[] }>("/api/admin/roles");
  return res.data.roles;
};
