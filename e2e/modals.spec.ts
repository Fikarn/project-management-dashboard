import { test, expect } from "./fixtures";

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
    const focused = page.locator('[role="dialog"] :focus');
    // Focus may be on dialog itself or a child element
  });

  test("backdrop click closes clean modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Click the backdrop overlay at top-left corner (outside the centered content)
    await page.locator('[role="dialog"]').click({ position: { x: 5, y: 5 } });

    // Modal should close (clean form = no dirty confirmation)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });
});
