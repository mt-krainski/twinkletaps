import { test, expect } from "@playwright/test";
import { login } from "../src/test-utils/playwright";

test.describe.configure({ retries: 2 });

test("workspace invite: user A creates link, user B accepts", async ({
  page,
  browser,
  isMobile,
}) => {
  // The sidebar footer is a Sheet on mobile and has no trigger in the current UI
  test.skip(isMobile, "Sidebar is inaccessible on mobile — SidebarTrigger not present");

  const runId = crypto.randomUUID();
  const adminEmail = `testadmin-${runId}@test.com`;
  const memberEmail = `testmember-${runId}@test.com`;

  // ── User A: log in ────────────────────────────────────────────────
  await page.goto("/", { waitUntil: "networkidle" });
  await login(page, adminEmail);

  // Wait for the page to settle after first login (same pattern as account.spec.ts)
  await expect(
    page.getByRole("button", { name: "Update Profile" }),
  ).toBeEnabled({ timeout: 15000 });

  // ── User A: open "Invite to workspace" from sidebar ───────────────
  await expect(
    page.getByRole("button", { name: "Invite to workspace" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Invite to workspace" }).click();

  // ShareDialog opens — click "Generate link"
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

  // ── User B: separate browser context ──────────────────────────────
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await memberPage.goto("/", { waitUntil: "networkidle" });
  await login(memberPage, memberEmail);
  // Wait for the page to settle after first login
  await expect(
    memberPage.getByRole("button", { name: "Update Profile" }),
  ).toBeEnabled({ timeout: 15000 });

  // ── User B: navigate to invite URL and accept ─────────────────────
  // Use "load" not "networkidle" — Next.js keeps connections open and
  // networkidle can hold the test until the 30 s timeout fires.
  await memberPage.goto(inviteUrl!.trim(), { waitUntil: "load" });
  // CardTitle renders as a <div>, not a heading, so use getByText
  await expect(memberPage.getByText("You're invited!")).toBeVisible({
    timeout: 10000,
  });
  await memberPage.getByRole("button", { name: "Accept Invitation" }).click();

  // After acceptance, redirected to "/"
  await expect(memberPage).toHaveURL("/", { timeout: 10000 });

  await memberContext.close();
});
