import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the sacn module before importing dmx
vi.mock("sacn", () => import("../__mocks__/sacn"));

import {
  initDmx,
  destroyDmx,
  sendDmxFrame,
  sendDmxFrameThrottled,
  updateLiveState,
  getLiveState,
  clearLiveState,
  isDmxConnected,
  isValidIpv4,
  isValidUniverse,
  checkBridgeReachable,
} from "@/lib/dmx";
import type { Light, LightingSettings } from "@/lib/types";

function makeLight(overrides: Partial<Light> = {}): Light {
  return {
    id: "light-1",
    name: "Test Light",
    type: "astra-bicolor",
    dmxStartAddress: 1,
    intensity: 100,
    cct: 4500,
    on: true,
    order: 0,
    red: 0,
    green: 0,
    blue: 0,
    colorMode: "cct",
    ...overrides,
  };
}

const defaultSettings: LightingSettings = {
  apolloBridgeIp: "2.0.0.1",
  dmxUniverse: 1,
  dmxEnabled: true,
  selectedLightId: null,
  selectedSceneId: null,
};

describe("isValidIpv4", () => {
  it("accepts valid IPs", () => {
    expect(isValidIpv4("192.168.1.1")).toBe(true);
    expect(isValidIpv4("2.0.0.1")).toBe(true);
    expect(isValidIpv4("0.0.0.0")).toBe(true);
    expect(isValidIpv4("255.255.255.255")).toBe(true);
  });

  it("rejects invalid IPs", () => {
    expect(isValidIpv4("")).toBe(false);
    expect(isValidIpv4("not-an-ip")).toBe(false);
    expect(isValidIpv4("256.1.1.1")).toBe(false);
    expect(isValidIpv4("1.2.3")).toBe(false);
    expect(isValidIpv4("1.2.3.4.5")).toBe(false);
  });
});

describe("isValidUniverse", () => {
  it("accepts valid universes", () => {
    expect(isValidUniverse(1)).toBe(true);
    expect(isValidUniverse(63999)).toBe(true);
  });

  it("rejects invalid universes", () => {
    expect(isValidUniverse(0)).toBe(false);
    expect(isValidUniverse(-1)).toBe(false);
    expect(isValidUniverse(64000)).toBe(false);
    expect(isValidUniverse(1.5)).toBe(false);
  });
});

describe("initDmx", () => {
  beforeEach(async () => {
    await destroyDmx();
  });

  it("creates a sender on success", async () => {
    await initDmx("2.0.0.1", 1);
    expect(isDmxConnected()).toBe(true);
  });

  it("rejects invalid IP", async () => {
    await initDmx("999.999.999.999", 1);
    expect(isDmxConnected()).toBe(false);
  });

  it("rejects invalid universe", async () => {
    await initDmx("2.0.0.1", 0);
    expect(isDmxConnected()).toBe(false);
  });

  it("destroys previous sender before creating new one", async () => {
    await initDmx("2.0.0.1", 1);
    const firstSender = global.dmxSender;
    await initDmx("2.0.0.1", 2);
    expect(firstSender.close).toHaveBeenCalled();
    expect(isDmxConnected()).toBe(true);
  });
});

describe("destroyDmx", () => {
  it("cleans up sender and timers", async () => {
    await initDmx("2.0.0.1", 1);
    expect(isDmxConnected()).toBe(true);
    await destroyDmx();
    expect(isDmxConnected()).toBe(false);
    expect(global.dmxSendTimer).toBeUndefined();
    expect(global.dmxPendingSend).toBe(false);
  });

  it("is safe to call when no sender exists", async () => {
    await destroyDmx(); // Should not throw
  });
});

describe("sendDmxFrame", () => {
  beforeEach(async () => {
    await initDmx("2.0.0.1", 1);
  });

  it("sends channel data for lights", async () => {
    const light = makeLight({ dmxStartAddress: 1, intensity: 50, cct: 4600, on: true });
    await sendDmxFrame([light], defaultSettings);
    expect(global.dmxSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceName: "EdvinProjectManager",
        priority: 100,
        payload: expect.any(Object),
      })
    );
  });

  it("sends 0 intensity when light is off", async () => {
    const light = makeLight({ dmxStartAddress: 1, intensity: 100, on: false });
    await sendDmxFrame([light], defaultSettings);

    const call = global.dmxSender.send.mock.calls[0][0];
    expect(call.payload[1]).toBe(0); // intensity channel = 0 when off
  });

  it("returns early when DMX is disabled", async () => {
    const light = makeLight();
    await sendDmxFrame([light], { ...defaultSettings, dmxEnabled: false });
    expect(global.dmxSender.send).not.toHaveBeenCalled();
  });

  it("returns early when no sender exists", async () => {
    await destroyDmx();
    const light = makeLight();
    // dmxLastSettings is set from the beforeEach initDmx, but sender is gone
    // It will try to reinit — clear lastSettings to prevent that
    global.dmxLastSettings = undefined;
    await sendDmxFrame([light], defaultSettings); // Should not throw
  });

  it("uses live state over persisted values", async () => {
    const light = makeLight({ dmxStartAddress: 1, intensity: 50, cct: 4500, on: true });
    updateLiveState("light-1", { intensity: 80, cct: 5000, on: true });
    await sendDmxFrame([light], defaultSettings);

    const call = global.dmxSender.send.mock.calls[0][0];
    // 80% = 204
    expect(call.payload[1]).toBe(204);
  });

  it("destroys sender on send failure for auto-recovery", async () => {
    global.dmxSender.send.mockRejectedValueOnce(new Error("network error"));
    const light = makeLight();
    await sendDmxFrame([light], defaultSettings);
    expect(isDmxConnected()).toBe(false);
    expect(global.dmxNeedsReinit).toBe(true);
  });
});

describe("sendDmxFrameThrottled", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await initDmx("2.0.0.1", 1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces rapid calls", () => {
    const light = makeLight();
    sendDmxFrameThrottled([light], defaultSettings);
    sendDmxFrameThrottled([light], defaultSettings);
    sendDmxFrameThrottled([light], defaultSettings);

    expect(global.dmxSender.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30);
    expect(global.dmxSender.send).toHaveBeenCalledTimes(1);
  });
});

describe("updateLiveState / getLiveState / clearLiveState", () => {
  it("stores and retrieves live state", () => {
    updateLiveState("light-1", { intensity: 75, cct: 5000, on: true });
    const state = getLiveState("light-1");
    expect(state).toMatchObject({ intensity: 75, cct: 5000, on: true });
  });

  it("merges partial updates", () => {
    updateLiveState("light-1", { intensity: 50, cct: 4000, on: true });
    updateLiveState("light-1", { intensity: 80 });
    const state = getLiveState("light-1");
    expect(state?.intensity).toBe(80);
    expect(state?.cct).toBe(4000);
  });

  it("returns undefined for unknown light", () => {
    expect(getLiveState("nonexistent")).toBeUndefined();
  });

  it("clears state", () => {
    updateLiveState("light-1", { intensity: 50, cct: 4000, on: true });
    clearLiveState("light-1");
    expect(getLiveState("light-1")).toBeUndefined();
  });
});

describe("checkBridgeReachable", () => {
  it("rejects invalid IP immediately", async () => {
    const result = await checkBridgeReachable("not-an-ip");
    expect(result).toBe(false);
  });
});

// Import afterEach for fake timers cleanup
import { afterEach } from "vitest";
