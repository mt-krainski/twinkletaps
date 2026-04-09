import { test, expect } from "@chromatic-com/playwright";
import { login } from "../src/test-utils/playwright";

test("has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(process.env.NEXT_PUBLIC_COMPANY_NAME!);
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

  await page.getByRole("textbox", { name: "Full Name" }).fill(testUserName);
  await page.getByRole("button", { name: "Update Profile" }).click();
  await expect(page.getByText("Profile updated successfully!")).toBeVisible();

  await page.getByRole("button", { name: "Sign Out" }).click();

  await expect(page).toHaveURL("/auth");

  await login(page, testUserEmail);

  // After login, user is redirected to workspace
  await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

  // Navigate to account page to verify profile was saved
  await page.goto("/account", { waitUntil: "networkidle" });

  await expect(page.getByRole("textbox", { name: "Full Name" })).toHaveValue(
    testUserName,
  );
});
