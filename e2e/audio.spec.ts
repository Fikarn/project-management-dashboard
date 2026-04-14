import { expect, seedConsoleViewportState, test, waitForKanbanReady } from "./fixtures";

test.describe("Audio View", () => {
  test("navigates to audio view with keyboard shortcut", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.keyboard.press("a");

    await expect(page.getByText("Control Room")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Front Preamps 9-12", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("shows the fixed UFX III console layout", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();

    await expect(page.getByText("Front Preamps 9-12", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Rear Line Inputs 1-8", { exact: true })).toBeVisible();
    await expect(page.getByText("Software Playback", { exact: true })).toBeVisible();
    await expect(page.getByTestId("audio-mix-target-audio-mix-main")).toBeVisible();
  });

  test("switches between all three views", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.keyboard.press("a");
    await expect(page.getByText("Control Room")).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("l");
    await expect(page.locator("text=All On").first()).toBeVisible({ timeout: 5000 });

    await page.getByRole("tab", { name: /projects/i }).click();
    await expect(page.getByText("To Do").first()).toBeVisible({ timeout: 5000 });
  });
});
