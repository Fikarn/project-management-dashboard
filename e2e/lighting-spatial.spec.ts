import { expect, seedConsoleViewportState, test, waitForKanbanReady } from "./fixtures";

test.describe("Lighting Spatial View", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("supports viewport controls and framing presets", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /lights/i }).click();
    await expect(page.getByText("All On").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: /studio layout view/i }).click();
    await expect(page.getByText("Studio Plot").first()).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole("button", { name: /fit all/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reset view/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pan mode/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /grid on/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /snap on/i })).toBeVisible();

    await page.getByRole("button", { name: /zoom in/i }).click();
    await expect(page.getByText("115%").first()).toBeVisible();

    await page.getByRole("button", { name: /reset view/i }).click();
    await expect(page.getByText("100%").first()).toBeVisible();

    await page.getByRole("button", { name: /camera/i }).click();
    await page.getByRole("button", { name: /tight/i }).click();
    await expect(page.getByText("tight").first()).toBeVisible();
  });

  test("supports keyboard selection and keeps quick actions onscreen", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /lights/i }).click();
    await expect(page.getByText("All On").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: /studio layout view/i }).click();
    await expect(page.getByText("Studio Plot").first()).toBeVisible({ timeout: 5000 });

    const keyLeftNode = page.getByRole("button", { name: /Key Left/i }).first();
    await keyLeftNode.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText("Selection").first()).toBeVisible();
    await expect(page.getByText("Key Left").first()).toBeVisible();

    await keyLeftNode.click({ button: "right" });
    const quickMenu = page.getByTestId("spatial-context-menu");
    await expect(quickMenu).toBeVisible();

    const box = await quickMenu.boundingBox();
    expect(box).not.toBeNull();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});
