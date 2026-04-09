import { test, expect, takeSnapshot } from "@chromatic-com/playwright";
import {
  login,
  captureScreen,
  openSidebarIfMobile,
} from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("workspace invite: user A creates link, user B accepts", async ({
  page,
  browser,
  isMobile,
}) => {
  const runId = crypto.randomUUID();
  const adminEmail = `testadmin-${runId}@test.com`;
  const memberEmail = `testmember-${runId}@test.com`;

  // ── User A: log in ────────────────────────────────────────────────
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, adminEmail);

  // After login, user is redirected to /w/<workspaceId>
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  await captureScreen(page, "admin-after-login");
  await takeSnapshot(page, "admin-after-login", test.info());

  // ── User A: open "Invite to workspace" from sidebar ───────────────
  await openSidebarIfMobile(page, isMobile);
  await expect(
    page.getByRole("button", { name: "Invite to workspace" }),
  ).toBeVisible({ timeout: 10000 });

  await captureScreen(page, "sidebar-open");
  await takeSnapshot(page, "sidebar-open", test.info());

  await page.getByRole("button", { name: "Invite to workspace" }).click();

  // ShareDialog opens — click "Generate link"
  await captureScreen(page, "invite-dialog");
  await takeSnapshot(page, "invite-dialog", test.info());

  await page.getByRole("button", { name: "Generate link" }).click();

  // Read the invite URL from the <code> element scoped to the dialog
  const inviteUrl = await page
    .getByRole("dialog")
    .locator("code")
    .textContent({ timeout: 10000 });
  expect(inviteUrl).toBeTruthy();
  expect(inviteUrl).toMatch(/\/invite\//);

  await captureScreen(page, "invite-link-generated");
  await takeSnapshot(page, "invite-link-generated", test.info());

  // Close dialog
  await page.getByRole("button", { name: "Done" }).click();

  // ── User B: separate browser context ──────────────────────────────
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/", { waitUntil: "networkidle" });
  await login(memberPage, memberEmail);
  // After login, member is redirected to /w/<workspaceId>
  await expect(memberPage).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  await captureScreen(memberPage, "member-after-login");
  await takeSnapshot(memberPage, "member-after-login", test.info());

  // ── User B: navigate to invite URL and accept ─────────────────────
  // Use "load" not "networkidle" — Next.js keeps connections open and
  // networkidle can hold the test until the 30 s timeout fires.
  await memberPage.goto(inviteUrl!.trim(), { waitUntil: "load" });
  // CardTitle renders as a <div>, not a heading, so use getByText
  await expect(memberPage.getByText("You're invited!")).toBeVisible({
    timeout: 10000,
  });

  await captureScreen(memberPage, "invite-page");
  await takeSnapshot(memberPage, "invite-page", test.info());

  await memberPage.getByRole("button", { name: "Accept Invitation" }).click();

  // After acceptance, redirected to "/" which then bounces to /w/{workspaceId}
  await expect(memberPage).toHaveURL(/\/w\/[^/]+/, { timeout: 15000 });

  await captureScreen(memberPage, "after-acceptance");
  await takeSnapshot(memberPage, "after-acceptance", test.info());

  // ── User B: verify membership in two workspaces ────────────────────
  // The layout is a Server Component — navigating to "/" re-fetches workspace
  // membership, so the workspace switcher (first dropdown in the navbar)
  // should now list two entries: own workspace + the accepted one.
  await memberPage.locator("[aria-haspopup='menu']").first().click();
  await expect(memberPage.getByRole("menuitemcheckbox")).toHaveCount(2, {
    timeout: 10000,
  });

  await captureScreen(memberPage, "workspace-switcher");
  await takeSnapshot(memberPage, "workspace-switcher", test.info());

  await memberPage.keyboard.press("Escape");

  await memberContext.close();
});
