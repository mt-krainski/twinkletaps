import { test, expect, takeSnapshot } from "@chromatic-com/playwright";
import { login, captureScreen } from "../src/test-utils/playwright";

test("has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("TwinkleTaps");
});

test.describe.configure({ retries: 2 });
test("create account, logout, login", async ({ page }) => {
  const runId = crypto.randomUUID();
  const testUserEmail = `test+${runId}@test.com`;
  const testUserName = `Test user - ${runId}`;

  await page.goto("/", { waitUntil: "networkidle" });

  await login(page, testUserEmail);

  // After login, user is redirected to workspace
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  // Navigate to account page
  await page.goto("/account", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("button", { name: "Update Profile" }),
  ).toBeEnabled({ timeout: 10000 });

  await captureScreen(page, "account-page");
  await takeSnapshot(page, "account-page", test.info());

  await page.getByRole("textbox", { name: "Full Name" }).fill(testUserName);
  await page.getByRole("button", { name: "Update Profile" }).click();
  await expect(page.getByText("Profile updated successfully!")).toBeVisible();

  await captureScreen(page, "profile-updated");
  await takeSnapshot(page, "profile-updated", test.info());

  await page.getByRole("button", { name: "Sign Out" }).click();

  await expect(page).toHaveURL("/auth");

  await captureScreen(page, "auth-page");
  await takeSnapshot(page, "auth-page", test.info());

  await login(page, testUserEmail);

  // After login, user is redirected to workspace
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  // Navigate to account page to verify profile was saved
  await page.goto("/account", { waitUntil: "networkidle" });

  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(
    testUserName,
  );

  await captureScreen(page, "profile-persisted");
  await takeSnapshot(page, "profile-persisted", test.info());
});
