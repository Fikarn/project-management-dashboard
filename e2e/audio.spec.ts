import { expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Audio View", () => {
  test("navigates to audio view with keyboard shortcut", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("a");

    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to audio view via header button", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();

    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows empty state when no channels exist", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    await expect(page.locator("button", { hasText: "Add Channel" }).first()).toBeVisible();
  });

  test("creates a new audio channel", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    await page.locator("button", { hasText: "Add Channel" }).first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.locator('input[type="text"]').fill("Presenter");

    await dialog.locator("button", { hasText: "Create" }).click();

    await expect(page.locator("text=Presenter")).toBeVisible({ timeout: 5000 });
  });

  test("switches between all three views", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("l");
    await expect(page.locator("text=All On").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: /projects/i }).click();
    await expect(page.getByText("To Do").first()).toBeVisible({ timeout: 5000 });
  });
});
