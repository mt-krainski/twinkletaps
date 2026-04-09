import { test, expect } from "@chromatic-com/playwright";
import {
  login,
  captureScreen,
  openSidebarIfMobile,
} from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("mobile navbar: open sidebar and navigate", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only test");

  const runId = crypto.randomUUID();
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, `test+${runId}@test.com`);

  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByText("Dashboard", { exact: true })).toBeVisible({
    timeout: 10000,
  });

  await page.waitForTimeout(1000);
  await captureScreen(page, "after-login");

  // Open sidebar via hamburger button
  await openSidebarIfMobile(page, isMobile);
  await expect(page.getByText("Home")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await captureScreen(page, "sidebar-open");

  // Navigate to Home — wait for sidebar Sheet to close before capturing
  await page.getByText("Home").click();
  await expect(
    page.getByRole("button", { name: "Toggle Sidebar" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Dashboard", { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.waitForTimeout(1000);
  await captureScreen(page, "after-home");

  // Re-open sidebar and navigate to a device (if available)
  await openSidebarIfMobile(page, isMobile);
  const devicesSection = page.getByText("Devices");
  if (await devicesSection.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.waitForTimeout(1000);
    await captureScreen(page, "sidebar-devices");
  }
});
