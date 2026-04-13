import { expect, gotoDashboard, gotoSetup, test } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

function axe(page: Parameters<typeof AxeBuilder>[0]["page"]) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
}

test.describe("Accessibility", () => {
  test("dashboard has no critical a11y violations", async ({ page }) => {
    await gotoDashboard(page);

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("lighting view has no critical a11y violations", async ({ page }) => {
    await gotoDashboard(page);

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "l", bubbles: true }));
    });

    await expect(page.getByRole("tab", { name: /lights/i })).toHaveAttribute("aria-selected", "true");

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("audio view has no critical a11y violations", async ({ page }) => {
    await gotoDashboard(page);

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });

    await expect(page.getByRole("tab", { name: /audio/i })).toHaveAttribute("aria-selected", "true");

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("setup page has no critical a11y violations", async ({ page }) => {
    await gotoSetup(page);

    const results = await axe(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("new project modal has no critical a11y violations", async ({ page }) => {
    await gotoDashboard(page);

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    // Disable color-contrast inside modals: axe mis-computes effective colors through the
    // semi-transparent backdrop overlay, reporting ~1.7:1 for elements that are actually ~6.5:1.
    // The four page-level tests above validate contrast for the full app surface.
    const results = await axe(page).include('[role="dialog"]').disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
