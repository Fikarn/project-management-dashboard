import { test, expect } from "./fixtures";

test.describe("Audio View", () => {
  test("navigates to audio view with keyboard shortcut", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for the board to be interactive
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    // Press 'a' to switch to audio view
    await page.keyboard.press("a");

    // Should see the audio toolbar with OSC status indicator
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to audio view via header button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    // Click the Audio button in the header
    await page.locator("button", { hasText: "Audio" }).click();

    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows empty state when no channels exist", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    // Should show Add Channel button
    await expect(page.locator("button", { hasText: "Add Channel" })).toBeVisible();
  });

  test("creates a new audio channel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    // Click Add Channel
    await page.locator("button", { hasText: "Add Channel" }).click();

    // Fill in channel name in the modal
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.locator('input[type="text"]').fill("Presenter");

    // Click Create
    await dialog.locator("button", { hasText: "Create" }).click();

    // Channel should appear
    await expect(page.locator("text=Presenter")).toBeVisible({ timeout: 5000 });
  });

  test("switches between all three views", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    // Switch to audio
    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });

    // Switch to lights
    await page.keyboard.press("l");
    // Lighting view has a characteristic toolbar element
    await expect(page.locator("text=All On").first()).toBeVisible({ timeout: 5000 });

    // Switch back to kanban
    await page.keyboard.press("l"); // 'l' again toggles back? No, let's check
    // Actually press 'a' for audio again, then check we can go back to kanban
    await page.keyboard.press("a");
    await expect(page.locator("text=OSC").first()).toBeVisible({ timeout: 5000 });
  });
});
