export type AppRole = "TESTER" | "DEVELOPER" | "ADMIN" | "TRIAGE";

export interface TokenUser {
  userId: number;
  email: string;
  role: AppRole;
}

export function getCurrentUser(): TokenUser | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((ch) => `%${(`00${ch.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );

    const payload = JSON.parse(json) as Partial<TokenUser>;
    if (!payload.userId || !payload.email || !payload.role) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
