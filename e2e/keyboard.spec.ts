import { test, expect } from "./fixtures";

test.describe("Keyboard Shortcuts", () => {
  test("n opens new project modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
  });

  test("Escape closes modal", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.keyboard.press("n");
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("/ focuses search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for the search input to be present before pressing the shortcut
    await page.waitForSelector("#search-input", { timeout: 5000 });
    await page.keyboard.press("/");

    await expect(page.locator("#search-input")).toBeFocused({ timeout: 3000 });
  });

  test("? toggles shortcuts help", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Wait for the board to be interactive before pressing shortcut
    await expect(page.locator("text=To Do").first()).toBeVisible({ timeout: 10000 });

    // Dispatch ? keydown directly — Shift+/ may not produce "?" in all keyboard layouts
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
    });

    // Should show shortcuts modal with "Keyboard Shortcuts" heading
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="dialog"] >> text=Keyboard Shortcuts')).toBeVisible();
  });

  test("number shortcuts set status filter chips aria-pressed", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    const filterGroup = page.locator('[role="group"][aria-label="Filter projects by status"]');
    await expect(filterGroup).toBeVisible();

    // Fire "2" keyboard shortcut → In Progress
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    });
    await expect(filterGroup.getByRole("button", { name: "In Progress" })).toHaveAttribute("aria-pressed", "true");
    await expect(filterGroup.getByRole("button", { name: "To Do" })).toHaveAttribute("aria-pressed", "false");

    // Fire "0" → All
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    });
    await expect(filterGroup.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  test("filter chips activate with Enter and Space", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

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
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    const tablist = page.locator('[role="tablist"][aria-label="Dashboard view"]');
    await expect(tablist).toBeVisible();

    // Button labels in Dashboard.tsx are "Projects"/"Lights"/"Audio"
    const projectsTab = tablist.getByRole("tab", { name: /Projects/i });
    await expect(projectsTab).toHaveAttribute("aria-selected", "true");

    // Switch to lighting via keyboard shortcut "l"
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "l", bubbles: true }));
    });
    const lightsTab = tablist.getByRole("tab", { name: /Lights/i });
    await expect(lightsTab).toHaveAttribute("aria-selected", "true");
    await expect(projectsTab).toHaveAttribute("aria-selected", "false");
  });
});
