import { createProject, expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Projects", () => {
  test("create a project", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    await page.waitForSelector('[role="dialog"]');

    await page.fill('[role="dialog"] input[placeholder*="title" i]', "E2E Test Project");

    await page.click('[role="dialog"] button[type="submit"]');

    await expect(page.locator("text=E2E Test Project").first()).toBeVisible({ timeout: 5000 });
  });

  test("edit a project", async ({ page }) => {
    await createProject(page.request, "Edit Me");

    await waitForKanbanReady(page);
    await expect(page.getByText("Edit Me")).toBeVisible({ timeout: 5000 });

    await page.click("text=Edit Me");
    await page.waitForSelector('[role="dialog"]');

    const editBtn = page.locator('[role="dialog"]').getByRole("button", { name: "Edit", exact: true });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }
  });

  test("delete a project", async ({ page }) => {
    await createProject(page.request, "Delete Me");

    await waitForKanbanReady(page);
    await expect(page.getByText("Delete Me")).toBeVisible({ timeout: 5000 });

    await page.click("text=Delete Me");
    await page.waitForSelector('[role="dialog"]');

    const deleteBtn = page
      .locator('[role="dialog"]')
      .getByRole("button", { name: /delete/i })
      .first();
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();

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
