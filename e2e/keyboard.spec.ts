import { test, expect } from "./fixtures";

test.describe("Keyboard Shortcuts", () => {
  test("n opens new project modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
  });

  test("Escape closes modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("/ focuses search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for the search input to be present before pressing the shortcut
    await page.waitForSelector("#search-input", { timeout: 5000 });
    await page.keyboard.press("/");

    await expect(page.locator("#search-input")).toBeFocused({ timeout: 3000 });
  });

  test("? toggles shortcuts help", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for the board to be interactive before pressing shortcut
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    // Dispatch ? keydown directly — Shift+/ may not produce "?" in all keyboard layouts
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
    });

    // Should show shortcuts modal with "Keyboard Shortcuts" heading
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="dialog"] >> text=Keyboard Shortcuts')).toBeVisible();
  });
});
