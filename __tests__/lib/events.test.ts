import { describe, it, expect, vi } from "vitest";

describe("eventEmitter", () => {
  it("emits and receives events", async () => {
    const { default: eventEmitter } = await import("@/lib/events");
    const handler = vi.fn();
    eventEmitter.on("update", handler);

    eventEmitter.emit("update");

    expect(handler).toHaveBeenCalledOnce();
    eventEmitter.off("update", handler);
  });

  it("is an EventEmitter instance", async () => {
    const { default: eventEmitter } = await import("@/lib/events");
    expect(eventEmitter).toBeDefined();
    expect(typeof eventEmitter.on).toBe("function");
    expect(typeof eventEmitter.emit).toBe("function");
  });
});
