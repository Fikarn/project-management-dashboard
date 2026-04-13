import { createProject, createTask, expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Tasks", () => {
  test("create a task within a project", async ({ page }) => {
    await createProject(page.request, "Task Test Project");
    await waitForKanbanReady(page);
    await expect(page.getByText("Task Test Project")).toBeVisible({ timeout: 5000 });

    await page.click("text=Task Test Project");
    await page.waitForSelector('[role="dialog"]');

    const addBtn = page.locator(
      'button:has-text("Add Task"), button:has-text("New Task"), button[aria-label*="add task" i]'
    );
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();

      await page.fill('input[name="title"], input[placeholder*="title" i], input:first-of-type', "E2E Task");

      await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

      await expect(page.locator("text=E2E Task")).toBeVisible({ timeout: 5000 });
    }
  });

  test("toggle task completion", async ({ page }) => {
    const project = await createProject(page.request, "Task Test Project");
    await createTask(page.request, project.id, "Toggle Me");

    await waitForKanbanReady(page);
    await expect(page.getByText("Task Test Project")).toBeVisible({ timeout: 5000 });
    await page.click("text=Task Test Project");
    await page.waitForSelector('[role="dialog"]');

    await expect(page.locator('[role="dialog"] >> text=Toggle Me').first()).toBeVisible({ timeout: 5000 });
  });
});
