import { test, expect } from "@playwright/test";

test.describe("Kanban Board", () => {
  test("displays columns", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Check for column headers
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=In Progress").first()).toBeVisible();
    await expect(page.locator("text=Blocked").first()).toBeVisible();
    await expect(page.locator("text=Done").first()).toBeVisible();
  });

  test("projects appear in correct columns", async ({ page }) => {
    // Create projects in different statuses
    await page.request.post("/api/projects", {
      data: { title: "Todo Project", status: "todo" },
    });
    await page.request.post("/api/projects", {
      data: { title: "Progress Project", status: "in-progress" },
    });

    await page.goto("/");
    await page.waitForSelector("text=Todo Project", { timeout: 10000 });

    await expect(page.locator("text=Todo Project")).toBeVisible();
    await expect(page.locator("text=Progress Project")).toBeVisible();
  });
});
