import { test, expect, takeSnapshot } from "@chromatic-com/playwright";
import {
  login,
  captureScreen,
  openSidebarIfMobile,
} from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("device invite: admin shares device, member accepts", async ({
  page,
  browser,
  isMobile,
}) => {
  const runId = crypto.randomUUID();
  const adminEmail = `testadmin-${runId}@test.com`;
  const memberEmail = `testmember-${runId}@test.com`;
  const deviceName = `Test device ${runId}`;

  // ── Admin: log in ────────────────────────────────────────────────
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, adminEmail);

  // After login, user is redirected to /w/<workspaceId>
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  await captureScreen(page, "admin-after-login");
  await takeSnapshot(page, "admin-after-login", test.info());

  // ── Admin: register a device via sidebar ─────────────────────────
  await openSidebarIfMobile(page, isMobile);
  await expect(
    page.getByRole("button", { name: "Register Device" }),
  ).toBeVisible({ timeout: 10000 });

  await captureScreen(page, "sidebar-open");
  await takeSnapshot(page, "sidebar-open", test.info());

  await page.getByRole("button", { name: "Register Device" }).click();

  // RegisterDeviceDialog — fill name, submit
  await page.getByRole("textbox", { name: "Device name" }).fill(deviceName);
  await page.getByRole("button", { name: "Register" }).click();

  // Credentials panel appears — dismiss
  await expect(page.getByText("Device registered")).toBeVisible({
    timeout: 10000,
  });

  await captureScreen(page, "device-registered");
  await takeSnapshot(page, "device-registered", test.info());

  await page.getByRole("button", { name: "Done" }).click();

  // ── Admin: navigate to the device ────────────────────────────────
  // router.refresh() in onSuccess causes the page to reload with the new device
  // Click the device card in the main content area (has role="button")
  const deviceCard = page.getByRole("main").getByRole("button", { name: deviceName });
  await expect(deviceCard).toBeVisible({ timeout: 10000 });
  await deviceCard.click();

  await expect(page).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: deviceName })).toBeVisible({
    timeout: 10000,
  });

  await captureScreen(page, "device-page-admin");
  await takeSnapshot(page, "device-page-admin", test.info());

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

  await captureScreen(page, "share-dialog-link");
  await takeSnapshot(page, "share-dialog-link", test.info());

  // Close dialog
  await page.getByRole("button", { name: "Done" }).click();

  // ── Member: separate browser context ─────────────────────────────
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/", { waitUntil: "networkidle" });
  await login(memberPage, memberEmail);

  // After login, member is redirected to /w/<workspaceId>
  await expect(memberPage).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  await captureScreen(memberPage, "member-after-login");
  await takeSnapshot(memberPage, "member-after-login", test.info());

  // ── Member: navigate to invite URL and accept ─────────────────────
  // Use "load" not "networkidle" — Next.js keeps connections open and
  // networkidle can hold the test until the 30 s timeout fires.
  await memberPage.goto(inviteUrl!.trim(), { waitUntil: "load" });
  // CardTitle renders as a <div>, not a heading, so use getByText
  await expect(memberPage.getByText("You're invited!")).toBeVisible({
    timeout: 10000,
  });

  await captureScreen(memberPage, "device-invite-page");
  await takeSnapshot(memberPage, "device-invite-page", test.info());

  await memberPage.getByRole("button", { name: "Accept Invitation" }).click();

  // After acceptance, redirected to /w/{workspaceId}/d/{deviceId}
  await expect(memberPage).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, { timeout: 10000 });

  // ── Member: verify device access and absence of admin-only settings ─
  await expect(
    memberPage.getByRole("heading", { name: deviceName }),
  ).toBeVisible({ timeout: 10000 });

  // "Device settings" card is admin-only — must not be visible to a guest
  await expect(memberPage.getByText("Device settings")).not.toBeVisible();

  await captureScreen(memberPage, "device-page-member");
  await takeSnapshot(memberPage, "device-page-member", test.info());

  await memberContext.close();
});
