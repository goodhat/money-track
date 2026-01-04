import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login
    await expect(page).toHaveURL("/login");

    // Should have MoneyTrack title
    await expect(page.getByRole("heading", { name: "MoneyTrack" })).toBeVisible();

    // Should have email and password inputs
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("密碼")).toBeVisible();
  });

  test("should show login/signup toggle", async ({ page }) => {
    await page.goto("/login");

    // Initially should show login form
    await expect(page.getByRole("button", { name: "登入" })).toBeVisible();

    // Click signup toggle
    await page.getByRole("button", { name: "沒有帳號？註冊" }).click();

    // Should show signup form
    await expect(page.getByRole("button", { name: "註冊" })).toBeVisible();

    // Toggle back to login
    await page.getByRole("button", { name: "已有帳號？登入" }).click();

    // Should show login form again
    await expect(page.getByRole("button", { name: "登入" })).toBeVisible();
  });
});
