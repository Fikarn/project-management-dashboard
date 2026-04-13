import { expect, test, waitForKanbanReady } from "./fixtures";

test.describe("Keyboard Shortcuts", () => {
  test("n opens new project modal", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
  });

  test("Escape closes modal", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("/ focuses search", async ({ page }) => {
    await waitForKanbanReady(page);
    await page.keyboard.press("/");

    await expect(page.locator("#search-input")).toBeFocused({ timeout: 3000 });
  });

  test("? toggles shortcuts help", async ({ page }) => {
    await waitForKanbanReady(page);

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
    });

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="dialog"] >> text=Keyboard Shortcuts')).toBeVisible();
  });

  test("number shortcuts set status filter chips aria-pressed", async ({ page }) => {
    await waitForKanbanReady(page);

    const filterGroup = page.locator('[role="group"][aria-label="Filter projects by status"]');
    await expect(filterGroup).toBeVisible();

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    });
    await expect(filterGroup.getByRole("button", { name: "In Progress" })).toHaveAttribute("aria-pressed", "true");
    await expect(filterGroup.getByRole("button", { name: "To Do" })).toHaveAttribute("aria-pressed", "false");

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    });
    await expect(filterGroup.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  test("filter chips activate with Enter and Space", async ({ page }) => {
    await waitForKanbanReady(page);

    const filterGroup = page.locator('[role="group"][aria-label="Filter projects by status"]');

    const todoChip = filterGroup.getByRole("button", { name: "To Do", exact: true });
    await todoChip.focus();
    await page.keyboard.press("Enter");
    await expect(todoChip).toHaveAttribute("aria-pressed", "true");

    const allChip = filterGroup.getByRole("button", { name: "All", exact: true });
    await allChip.focus();
    await page.keyboard.press("Space");
    await expect(allChip).toHaveAttribute("aria-pressed", "true");
  });

  test("view toggle tabs reflect active view via aria-selected", async ({ page }) => {
    await waitForKanbanReady(page);

    const tablist = page.locator('[role="tablist"][aria-label="Dashboard view"]');
    await expect(tablist).toBeVisible();

    const projectsTab = tablist.getByRole("tab", { name: /Projects/i });
    await expect(projectsTab).toHaveAttribute("aria-selected", "true");

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "l", bubbles: true }));
    });
    const lightsTab = tablist.getByRole("tab", { name: /Lights/i });
    await expect(lightsTab).toHaveAttribute("aria-selected", "true");
    await expect(projectsTab).toHaveAttribute("aria-selected", "false");
  });
});
