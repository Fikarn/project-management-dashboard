import { describe, it, expect } from "vitest";
import { generateId } from "@/lib/id";

describe("generateId", () => {
  it("generates an ID with the given prefix", () => {
    const id = generateId("proj");
    expect(id).toMatch(/^proj-\d+-[a-z0-9]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId("test")));
    expect(ids.size).toBe(100);
  });

  it("works with different prefixes", () => {
    expect(generateId("task")).toMatch(/^task-/);
    expect(generateId("act")).toMatch(/^act-/);
    expect(generateId("light")).toMatch(/^light-/);
  });
});
