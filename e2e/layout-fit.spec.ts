import type { Page } from "@playwright/test";
import { expect, gotoSetup, seedConsoleViewportState, test, waitForKanbanReady } from "./fixtures";

async function expectNoPageScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollHeight: document.body.scrollHeight,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
  expect(metrics.bodyScrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

test.describe("Viewport Fit", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("kanban view fits within 1920x1080 without page scroll", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await expectNoPageScroll(page);
  });

  test("lighting view fits within 1920x1080 without page scroll", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /lights/i }).click();
    await expect(page.getByRole("tab", { name: /lights/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("All On").first()).toBeVisible({ timeout: 5000 });

    await expectNoPageScroll(page);
  });

  test("lighting spatial view fits within 1920x1080 without page scroll", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /lights/i }).click();
    await expect(page.getByRole("tab", { name: /lights/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("All On").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: /studio layout view/i }).click();
    await expect(page.getByRole("tab", { name: /studio layout view/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Studio Plot").first()).toBeVisible({ timeout: 5000 });

    await expectNoPageScroll(page);
  });

  test("audio view fits within 1920x1080 without page scroll", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();
    await expect(page.getByRole("tab", { name: /audio/i })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Control Room")).toBeVisible({ timeout: 5000 });

    await expectNoPageScroll(page);
  });

  test("setup view fits within 1920x1080 without page scroll", async ({ page }) => {
    await gotoSetup(page);
    await expect(page.getByRole("heading", { level: 1, name: /control surface setup/i })).toBeVisible({
      timeout: 5000,
    });

    await expectNoPageScroll(page);
  });
});
