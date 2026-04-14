import { expect, seedConsoleViewportState, test, waitForKanbanReady } from "./fixtures";

test.describe("Audio Console", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("updates focused strip and mix target summaries", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();
    await expect(page.getByText("Control Room")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Transport ready, awaiting peak data")).toBeVisible();

    await page.getByTestId("audio-strip-audio-input-10").click();
    await expect(page.getByTestId("audio-toolbar-selected")).toContainText("Guest");
    await expect(page.getByTestId("audio-strip-send-audio-input-10")).toContainText("0.6 dB");

    await page.getByTestId("audio-mix-target-audio-mix-phones-a").getByText("Phones 1").click();
    await expect(page.getByTestId("audio-toolbar-selected")).toContainText("Phones 1");
    await expect(page.getByTestId("audio-strip-send-audio-input-10")).toContainText("-3.6 dB");
    await expect(
      page.getByText("Changing the active mix swaps the send layer shown on every source strip.")
    ).toBeVisible();
  });

  test("makes console sync state explicit around startup and snapshot recall", async ({ page, request }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();
    await expect(page.getByTestId("audio-console-state")).toContainText("Console state assumed");

    const syncButton = page.getByRole("button", { name: /Sync Console/i });
    await syncButton.dispatchEvent("mousedown");
    await page.waitForTimeout(1300);
    await syncButton.dispatchEvent("mouseup");

    await expect(page.getByTestId("audio-console-state")).toContainText("Console aligned");

    const snapshot = page.getByRole("button", { name: /^Slot 2 Podcast$/ });
    await snapshot.dispatchEvent("mousedown");
    await page.waitForTimeout(1300);
    await snapshot.dispatchEvent("mouseup");

    await expect(page.getByTestId("audio-console-state")).toContainText("Snapshot changed hardware");
    await expect(page.getByText(/Snapshot recall changes hardware outside this surface/i)).toBeVisible();
  });

  test("shows front-preamp specific controls and requires hold before toggling phantom power", async ({
    page,
    request,
  }) => {
    await seedConsoleViewportState(request);
    await waitForKanbanReady(page);

    await page.getByRole("tab", { name: /audio/i }).click();
    await expect(page.getByText("Front Preamps 9-12", { exact: true })).toBeVisible({ timeout: 5000 });

    const strip = page.getByTestId("audio-strip-audio-input-12");
    const phantom = strip.getByRole("button", { name: /48V Hold/i });

    await expect(strip.getByRole("button", { name: /Inst/i })).toBeVisible();
    await expect(strip.getByRole("button", { name: /AutoSet/i })).toBeVisible();

    await phantom.dispatchEvent("mousedown");
    await page.waitForTimeout(200);
    await phantom.dispatchEvent("mouseup");

    await expect(strip.getByText(/^48V$/).first()).not.toBeVisible();

    await phantom.dispatchEvent("mousedown");
    await page.waitForTimeout(1100);
    await phantom.dispatchEvent("mouseup");

    await expect(strip.getByText(/^48V$/).first()).toBeVisible();
  });
});
