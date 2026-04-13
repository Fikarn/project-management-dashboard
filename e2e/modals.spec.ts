import { expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Modals", () => {
  test("modal has correct ARIA attributes", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("modal traps focus", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.waitForTimeout(200);

    const focusInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg?.contains(document.activeElement) ?? false;
    });
    expect(focusInside).toBe(true);

    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("backdrop click closes clean modal", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    await page.locator('[role="dialog"]').click({ position: { x: 5, y: 5 } });

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });
});
