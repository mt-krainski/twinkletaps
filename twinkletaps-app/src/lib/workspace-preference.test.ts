import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock document.cookie
let cookieStore = "";
Object.defineProperty(globalThis, "document", {
  value: {
    get cookie() {
      return cookieStore;
    },
    set cookie(value: string) {
      cookieStore = value;
    },
  },
  writable: true,
});

import {
  saveLastWorkspace,
  getLastWorkspace,
  getLastWorkspaceCookieKey,
} from "./workspace-preference";

const STORAGE_KEY = "twinkletaps:lastActiveWorkspaceId";
const COOKIE_KEY = "twinkletaps_lastActiveWorkspaceId";

describe("saveLastWorkspace", () => {
  beforeEach(() => {
    localStorageMock.clear();
    cookieStore = "";
    vi.clearAllMocks();
  });

  it("stores the workspace id with the correct key", () => {
    saveLastWorkspace("ws-1");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "ws-1");
  });

  it("sets a cookie with the workspace id", () => {
    saveLastWorkspace("ws-1");
    expect(cookieStore).toContain(`${COOKIE_KEY}=ws-1`);
    expect(cookieStore).toContain("path=/");
  });

  it("overwrites a previously saved value", () => {
    saveLastWorkspace("ws-1");
    saveLastWorkspace("ws-2");
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      STORAGE_KEY,
      "ws-2",
    );
  });

  it("does not throw when localStorage setItem throws", () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveLastWorkspace("ws-1")).not.toThrow();
  });
});

describe("getLastWorkspace", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns the saved workspace id", () => {
    localStorageMock.getItem.mockReturnValueOnce("ws-1");
    expect(getLastWorkspace()).toBe("ws-1");
    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns null when nothing is saved", () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    expect(getLastWorkspace()).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error("localStorage unavailable");
    });
    expect(getLastWorkspace()).toBeNull();
  });
});

describe("getLastWorkspaceCookieKey", () => {
  it("returns the cookie key", () => {
    expect(getLastWorkspaceCookieKey()).toBe(COOKIE_KEY);
  });
});
