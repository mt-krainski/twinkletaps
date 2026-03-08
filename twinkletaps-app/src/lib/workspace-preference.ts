const STORAGE_KEY = "twinkletaps:lastActiveWorkspaceId";
const COOKIE_KEY = "twinkletaps_lastActiveWorkspaceId";

export function saveLastWorkspace(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
  try {
    document.cookie = `${COOKIE_KEY}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    // document.cookie unavailable (SSR)
  }
}

export function getLastWorkspace(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getLastWorkspaceCookieKey(): string {
  return COOKIE_KEY;
}
