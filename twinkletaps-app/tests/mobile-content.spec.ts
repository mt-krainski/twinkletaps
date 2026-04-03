import { test, expect } from "@playwright/test";
import {
  login,
  captureScreen,
  openSidebarIfMobile,
} from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("mobile content: dashboard, device view, and tap recorder", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile-only test");

  const runId = crypto.randomUUID();
  const adminEmail = `test+${runId}@test.com`;
  const deviceName = `Test device ${runId}`;

  // ── Login ──────────────────────────────────────────────────────────
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, adminEmail);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByText("Dashboard", { exact: true })).toBeVisible({
    timeout: 10000,
  });

  await page.waitForTimeout(1000);
  await captureScreen(page, "dashboard");

  // ── Register a device via sidebar ──────────────────────────────────
  await openSidebarIfMobile(page, isMobile);
  await expect(
    page.getByRole("button", { name: "Register Device" }),
  ).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Register Device" }).click();

  await page.getByRole("textbox", { name: "Device name" }).fill(deviceName);
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByText("Device registered")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Done" }).click();

  // ── Navigate to device via sidebar ─────────────────────────────────
  // Sidebar Sheet is still open after dialog closes. Click the device
  // in the sidebar — withMobileClose closes the Sheet and navigates.
  const sidebarDevice = page.getByRole("button", { name: deviceName });
  await expect(sidebarDevice).toBeVisible({ timeout: 10000 });
  await sidebarDevice.click();

  await expect(page).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, { timeout: 10000 });
  await expect(
    page.getByRole("heading", { name: deviceName }),
  ).toBeVisible({ timeout: 10000 });

  await page.waitForTimeout(1000);
  await captureScreen(page, "device-view");

  // ── Interact with TapRecorder ──────────────────────────────────────
  const tapButton = page.getByRole("button", {
    name: "Record tap sequence",
  });
  await expect(tapButton).toBeVisible({ timeout: 5000 });

  // Tap and hold briefly, then release
  await tapButton.dispatchEvent("mousedown");
  await page.waitForTimeout(600);
  await tapButton.dispatchEvent("mouseup");

  // Wait for recording to finish (12 steps * 250ms = 3s) + cooldown
  await page.waitForTimeout(4000);
  await captureScreen(page, "after-tap");
});
