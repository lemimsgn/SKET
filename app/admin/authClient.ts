export type AdminSession = {
  email?: string;
  username?: string;
  name?: string;
};

const ADMIN_SESSION_KEY = "sket-admin-session";

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.warn("Failed to read admin session:", error);
    return null;
  }
}

export function setAdminSession(session: AdminSession | null): void {
  if (typeof window === "undefined") return;

  try {
    if (!session) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Failed to store admin session:", error);
  }
}
