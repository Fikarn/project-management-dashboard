import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("dashboard has no critical a11y violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("lighting view has no critical a11y violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    // Switch to lighting view via keyboard shortcut
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    });

    // Wait for lighting view to render
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
