const STORAGE_KEY = "twinkletaps:lastActiveWorkspaceId";

export function saveLastWorkspace(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}

export function getLastWorkspace(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
