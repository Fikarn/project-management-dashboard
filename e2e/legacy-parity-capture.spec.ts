import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "parity", "legacy", "operator-2560x1440");

const PARITY_DB = {
  projects: [
    {
      id: "project-1",
      title: "Restore native planning parity",
      description: "Keep the operator workflow aligned with the legacy board.",
      status: "todo",
      priority: "p1",
      createdAt: "2026-04-17T12:00:00.000Z",
      lastUpdated: "2026-04-17T12:00:00.000Z",
      order: 0,
    },
    {
      id: "project-2",
      title: "Stabilize startup routing",
      description: "Make diagnostics secondary to the operator surface.",
      status: "in-progress",
      priority: "p2",
      createdAt: "2026-04-17T12:00:00.000Z",
      lastUpdated: "2026-04-17T13:00:00.000Z",
      order: 1,
    },
    {
      id: "project-3",
      title: "Document checkpoint evidence",
      description: "Capture deterministic native screenshots for the parity checkpoint.",
      status: "blocked",
      priority: "p3",
      createdAt: "2026-04-17T12:00:00.000Z",
      lastUpdated: "2026-04-17T14:00:00.000Z",
      order: 2,
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "project-1",
      title: "Verify modal open from board",
      description: "Open the native project detail directly from the lane.",
      priority: "p1",
      dueDate: "2026-04-22",
      labels: ["planning", "modal"],
      checklist: [
        { id: "check-1", text: "Confirm board title opens detail", done: false },
        { id: "check-2", text: "Confirm close returns to board", done: true },
      ],
      isRunning: true,
      totalSeconds: 780,
      lastStarted: null,
      completed: false,
      order: 0,
      createdAt: "2026-04-17T12:15:00.000Z",
    },
    {
      id: "task-2",
      projectId: "project-1",
      title: "Preserve shortcut focus path",
      description: "N should route directly into project creation.",
      priority: "p2",
      dueDate: null,
      labels: ["keyboard"],
      checklist: [],
      isRunning: false,
      totalSeconds: 120,
      lastStarted: null,
      completed: false,
      order: 1,
      createdAt: "2026-04-17T13:00:00.000Z",
    },
    {
      id: "task-3",
      projectId: "project-2",
      title: "Hide runtime shell chrome",
      description: "",
      priority: "p2",
      dueDate: null,
      labels: ["startup"],
      checklist: [],
      isRunning: false,
      totalSeconds: 220,
      lastStarted: null,
      completed: false,
      order: 0,
      createdAt: "2026-04-17T14:00:00.000Z",
    },
  ],
  activityLog: [
    {
      id: "activity-1",
      timestamp: "2026-04-17T12:00:00.000Z",
      entityType: "project",
      entityId: "project-1",
      action: "updated",
      detail: "Planning board detail flow reviewed.",
    },
    {
      id: "activity-2",
      timestamp: "2026-04-17T13:00:00.000Z",
      entityType: "task",
      entityId: "project-1",
      action: "updated",
      detail: "Shortcut routing aligned with the create-project modal.",
    },
  ],
  settings: {
    viewFilter: "all",
    sortBy: "manual",
    selectedProjectId: "project-1",
    selectedTaskId: "task-1",
    dashboardView: "kanban",
    deckMode: "project",
    hasCompletedSetup: true,
  },
};

async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

test("captures fullscreen legacy parity references at 2560x1440", async ({ page, request }) => {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const restoreResponse = await request.post("/api/backup/restore", { data: PARITY_DB });
  expect(restoreResponse.ok()).toBeTruthy();

  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await disableMotion(page);

  await expect(page.getByText("Planning Workspace")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Restore native planning parity")).toBeVisible({ timeout: 15000 });

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "planning-populated.png"),
    fullPage: false,
  });

  await page.locator('button[title="Time report"]').click();
  await expect(page.getByRole("dialog", { name: /time report/i })).toBeVisible();
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "time-report-open.png"),
    fullPage: false,
  });

  await page
    .getByRole("dialog", { name: /time report/i })
    .locator("button")
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: /time report/i })).toHaveCount(0);

  await page.getByText("Restore native planning parity").first().click();
  await expect(page.getByRole("dialog", { name: "Restore native planning parity" })).toBeVisible();
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "project-detail-open.png"),
    fullPage: false,
  });
});
