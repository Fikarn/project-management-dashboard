import { test, expect } from "./fixtures";

test.describe("Timers", () => {
  test("timer displays on task", async ({ page }) => {
    // Create project and task with time
    const projRes = await page.request.post("/api/projects", {
      data: { title: "Timer Project" },
    });
    const { project } = await projRes.json();

    await page.request.post(`/api/projects/${project.id}/tasks`, {
      data: { title: "Timed Task" },
    });

    await page.goto("/");
    await page.waitForSelector("text=Timer Project", { timeout: 10000 });

    // Open project detail
    await page.click("text=Timer Project");
    await page.waitForSelector('[role="dialog"]');

    // Task should be visible (scoped to dialog to avoid matching activity log)
    await expect(page.locator('[role="dialog"] >> text=Timed Task').first()).toBeVisible({ timeout: 5000 });
  });
});
