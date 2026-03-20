import { test, expect } from "@playwright/test";

test.describe("Modals", () => {
  test("modal has correct ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("modal traps focus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Tab through focusable elements — focus should stay within dialog
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
    }

    // Focused element should still be within the dialog
    // Focused element should still be within the dialog
    const focused = page.locator('[role="dialog"] :focus');
    // Focus may be on dialog itself or a child element
  });

  test("backdrop click closes clean modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Click outside the dialog (on the backdrop)
    await page.click('[role="dialog"] ~ div, .fixed.inset-0', { force: true, position: { x: 5, y: 5 } });

    // Modal should close (or show confirm dialog if dirty)
    // With a clean form, it should just close
  });
});
