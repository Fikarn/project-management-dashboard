import { test, expect } from "@playwright/test";

test.describe("Keyboard Shortcuts", () => {
  test("n opens new project modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
  });

  test("Escape closes modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("/ focuses search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("/");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[type="text"]')
      .first();
    await expect(searchInput).toBeFocused({ timeout: 3000 });
  });

  test("? toggles shortcuts help", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Shift+/"); // ? is Shift+/
    // Should show shortcuts modal or panel
    await expect(page.locator('text=Keyboard Shortcuts, text=shortcuts, [role="dialog"]').first()).toBeVisible({
      timeout: 3000,
    });
  });
});
