import { createProject, expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Kanban Board", () => {
  test("displays columns", async ({ page }) => {
    await waitForKanbanReady(page);

    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=In Progress").first()).toBeVisible();
    await expect(page.locator("text=Blocked").first()).toBeVisible();
    await expect(page.locator("text=Done").first()).toBeVisible();
  });

  test("projects appear in correct columns", async ({ page }) => {
    await createProject(page.request, "Todo Project", { status: "todo" });
    await createProject(page.request, "Progress Project", { status: "in-progress" });

    await waitForKanbanReady(page);

    await expect(page.locator("text=Todo Project")).toBeVisible();
    await expect(page.locator("text=Progress Project")).toBeVisible();
  });
});
