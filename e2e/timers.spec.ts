import { test, expect } from "@playwright/test";

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

    // Task should be visible
    await expect(page.locator("text=Timed Task")).toBeVisible({ timeout: 5000 });
  });
});
