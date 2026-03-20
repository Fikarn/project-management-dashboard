import { describe, it, expect } from "vitest";
import { logActivity } from "@/lib/activity";
import { makeDB } from "../helpers/fixtures";

describe("logActivity", () => {
  it("adds an activity entry to the log", () => {
    const db = makeDB();
    const result = logActivity(db, "project", "proj-1", "created", "Project created");

    expect(result.activityLog).toHaveLength(1);
    expect(result.activityLog[0]).toMatchObject({
      entityType: "project",
      entityId: "proj-1",
      action: "created",
      detail: "Project created",
    });
    expect(result.activityLog[0].id).toMatch(/^act-/);
    expect(result.activityLog[0].timestamp).toBeDefined();
  });

  it("prepends new entries (most recent first)", () => {
    let db = makeDB();
    db = logActivity(db, "project", "proj-1", "created", "First");
    db = logActivity(db, "project", "proj-2", "created", "Second");

    expect(db.activityLog[0].detail).toBe("Second");
    expect(db.activityLog[1].detail).toBe("First");
  });

  it("caps the log at 500 entries", () => {
    let db = makeDB({
      activityLog: Array.from({ length: 500 }, (_, i) => ({
        id: `act-${i}`,
        timestamp: new Date().toISOString(),
        entityType: "project" as const,
        entityId: "proj-1",
        action: "test",
        detail: `Entry ${i}`,
      })),
    });

    db = logActivity(db, "project", "proj-1", "new", "New entry");
    expect(db.activityLog).toHaveLength(500);
    expect(db.activityLog[0].detail).toBe("New entry");
  });

  it("does not mutate the original db", () => {
    const db = makeDB();
    const result = logActivity(db, "task", "task-1", "created", "Task created");

    expect(db.activityLog).toHaveLength(0);
    expect(result.activityLog).toHaveLength(1);
  });
});
