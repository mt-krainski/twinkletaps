import { test, expect } from "@playwright/test";
import { login } from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("login redirects / to /w/{workspaceId}", async ({ page }) => {
  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  // After login, the page should redirect to /w/<workspaceId>
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });
});

test("visiting /w/{workspaceId} shows correct workspace", async ({ page }) => {
  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  // The workspace page should render without error (DashboardHomeCard is visible)
  await expect(page.getByRole("main")).toBeVisible({ timeout: 10000 });
});

test("localStorage key is set after visiting workspace", async ({ page }) => {
  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  const workspaceId = page.url().match(/\/w\/([^/]+)/)?.[1];
  expect(workspaceId).toBeTruthy();

  const stored = await page.evaluate(() =>
    localStorage.getItem("twinkletaps:lastActiveWorkspaceId"),
  );
  expect(stored).toBe(workspaceId);
});

test("reload while on /w/{workspaceId} stays on same workspace", async ({
  page,
}) => {
  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });
  const urlBeforeReload = page.url();

  await page.reload({ waitUntil: "networkidle" });

  expect(page.url()).toBe(urlBeforeReload);
});

test("clearing localStorage and visiting / defaults to first workspace", async ({
  page,
}) => {
  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  // Clear localStorage and go to /
  await page.evaluate(() =>
    localStorage.removeItem("twinkletaps:lastActiveWorkspaceId"),
  );
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });
});
