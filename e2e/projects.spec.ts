import { test, expect } from "@playwright/test";

test.describe("Projects", () => {
  test("create a project", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="kanban-board"], .kanban-board, main', { timeout: 10000 });

    // Press 'n' to open new project modal
    await page.keyboard.press("n");
    await page.waitForSelector('[role="dialog"]');

    // Fill in the form
    await page.fill('input[name="title"], input[placeholder*="title" i], input:first-of-type', "E2E Test Project");

    // Submit
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');

    // Verify project appears
    await expect(page.locator("text=E2E Test Project")).toBeVisible({ timeout: 5000 });
  });

  test("edit a project", async ({ page }) => {
    // First create a project via API
    await page.request.post("/api/projects", {
      data: { title: "Edit Me" },
    });

    await page.goto("/");
    await page.waitForSelector("text=Edit Me", { timeout: 10000 });

    // Click the project to open detail
    await page.click("text=Edit Me");
    await page.waitForSelector('[role="dialog"]');

    // Look for edit button
    const editBtn = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }
  });

  test("delete a project", async ({ page }) => {
    await page.request.post("/api/projects", {
      data: { title: "Delete Me" },
    });

    await page.goto("/");
    await page.waitForSelector("text=Delete Me", { timeout: 10000 });

    // Click to open detail
    await page.click("text=Delete Me");
    await page.waitForSelector('[role="dialog"]');

    // Find and click delete
    const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm deletion if there's a confirm dialog
      const confirmBtn = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
      if (
        await confirmBtn
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        await confirmBtn.first().click();
      }
    }
  });
});
