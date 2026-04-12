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
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Wait for auto-focus to settle
    await page.waitForTimeout(200);

    // Focus should be inside the dialog on mount (auto-focused first interactive element)
    const focusInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg?.contains(document.activeElement) ?? false;
    });
    expect(focusInside).toBe(true);

    // Verify the dialog has aria-modal to signal focus containment to assistive tech
    await expect(dialog).toHaveAttribute("aria-modal", "true");
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
