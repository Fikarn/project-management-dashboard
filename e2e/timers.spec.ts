import { createProject, createTask, expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Timers", () => {
  test("timer displays on task", async ({ page }) => {
    const project = await createProject(page.request, "Timer Project");
    await createTask(page.request, project.id, "Timed Task");

    await waitForKanbanReady(page);
    await expect(page.getByText("Timer Project")).toBeVisible({ timeout: 5000 });

    await page.click("text=Timer Project");
    await page.waitForSelector('[role="dialog"]');

    await expect(page.locator('[role="dialog"] >> text=Timed Task').first()).toBeVisible({ timeout: 5000 });
  });
});
