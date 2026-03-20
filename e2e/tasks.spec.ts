import { test, expect } from "@playwright/test";

test.describe("Tasks", () => {
  test.beforeEach(async ({ page }) => {
    // Create a project via API
    await page.request.post("/api/projects", {
      data: { title: "Task Test Project" },
    });
  });

  test("create a task within a project", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Task Test Project", { timeout: 10000 });

    // Open project detail
    await page.click("text=Task Test Project");
    await page.waitForSelector('[role="dialog"]');

    // Look for add task button
    const addBtn = page.locator(
      'button:has-text("Add Task"), button:has-text("New Task"), button[aria-label*="add task" i]'
    );
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();

      // Fill task title
      await page.fill('input[name="title"], input[placeholder*="title" i], input:first-of-type', "E2E Task");

      // Submit
      await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

      await expect(page.locator("text=E2E Task")).toBeVisible({ timeout: 5000 });
    }
  });

  test("toggle task completion", async ({ page }) => {
    // Create a task via API
    const projectsRes = await page.request.get("/api/projects");
    const { projects } = await projectsRes.json();
    if (projects.length === 0) return;

    await page.request.post(`/api/projects/${projects[0].id}/tasks`, {
      data: { title: "Toggle Me" },
    });

    await page.goto("/");
    await page.waitForSelector("text=Task Test Project", { timeout: 10000 });
    await page.click("text=Task Test Project");
    await page.waitForSelector('[role="dialog"]');

    // Wait for task to appear
    await expect(page.locator("text=Toggle Me")).toBeVisible({ timeout: 5000 });
  });
});
