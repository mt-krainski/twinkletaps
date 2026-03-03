import { test, expect } from "@playwright/test";
import { login } from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("device invite: admin shares device, member accepts", async ({
  page,
  browser,
  isMobile,
}) => {
  // The sidebar footer is a Sheet on mobile and has no trigger in the current UI
  test.skip(isMobile, "Sidebar is inaccessible on mobile — SidebarTrigger not present");

  const runId = crypto.randomUUID();
  const adminEmail = `testadmin-${runId}@test.com`;
  const memberEmail = `testmember-${runId}@test.com`;
  const deviceName = `Test device ${runId}`;

  // ── Admin: log in ────────────────────────────────────────────────
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, adminEmail);

  // After first login, verifyOtp redirects to /account
  await expect(
    page.getByRole("button", { name: "Update Profile" }),
  ).toBeEnabled({ timeout: 15000 });

  // ── Admin: register a device via sidebar ─────────────────────────
  await expect(
    page.getByRole("button", { name: "Register Device" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Register Device" }).click();

  // RegisterDeviceDialog — fill name, submit
  await page.getByRole("textbox", { name: "Device name" }).fill(deviceName);
  await page.getByRole("button", { name: "Register" }).click();

  // Credentials panel appears — dismiss
  await expect(page.getByText("Device registered")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Done" }).click();

  // ── Admin: navigate to the device via sidebar ─────────────────────
  // router.refresh() in onSuccess causes the sidebar to reload with the new device
  await expect(
    page.getByRole("button", { name: deviceName }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: deviceName }).click();

  await expect(page).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: deviceName })).toBeVisible({
    timeout: 10000,
  });

  // ── Admin: open ShareDialog and generate a device invite link ─────
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Generate link" }).click();

  // Read the invite URL from the <code> element scoped to the dialog
  const inviteUrl = await page
    .getByRole("dialog")
    .locator("code")
    .textContent({ timeout: 10000 });
  expect(inviteUrl).toBeTruthy();
  expect(inviteUrl).toMatch(/\/invite\//);

  // Close dialog
  await page.getByRole("button", { name: "Done" }).click();

  // ── Member: separate browser context ─────────────────────────────
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/", { waitUntil: "networkidle" });
  await login(memberPage, memberEmail);

  // Wait for the page to settle after first login
  await expect(
    memberPage.getByRole("button", { name: "Update Profile" }),
  ).toBeEnabled({ timeout: 15000 });

  // ── Member: navigate to invite URL and accept ─────────────────────
  // Use "load" not "networkidle" — Next.js keeps connections open and
  // networkidle can hold the test until the 30 s timeout fires.
  await memberPage.goto(inviteUrl!.trim(), { waitUntil: "load" });
  // CardTitle renders as a <div>, not a heading, so use getByText
  await expect(memberPage.getByText("You're invited!")).toBeVisible({
    timeout: 10000,
  });
  await memberPage.getByRole("button", { name: "Accept Invitation" }).click();

  // After acceptance, redirected to /w/{workspaceId}/d/{deviceId}
  await expect(memberPage).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, { timeout: 10000 });

  // ── Member: verify device access and absence of admin-only settings ─
  await expect(
    memberPage.getByRole("heading", { name: deviceName }),
  ).toBeVisible({ timeout: 10000 });

  // "Device settings" card is admin-only — must not be visible to a guest
  await expect(memberPage.getByText("Device settings")).not.toBeVisible();

  await memberContext.close();
});
