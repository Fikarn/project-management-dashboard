import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import {
  initOsc,
  destroyOsc,
  isOscConnected,
  sendOscGain,
  sendOscFader,
  sendOscToggle,
  sendOscSnapshotRecall,
  updateOscLiveState,
  getOscLiveState,
  clearOscLiveState,
  getMeterData,
  clearMeterData,
  isValidOscHost,
  isValidPort,
  validateGain,
  validateFader,
  validateOscChannel,
  validateSnapshotIndex,
  isOscRecoveryExhausted,
} from "@/lib/osc";

describe("OSC validation helpers", () => {
  it("validates OSC host addresses", () => {
    expect(isValidOscHost("127.0.0.1")).toBe(true);
    expect(isValidOscHost("localhost")).toBe(true);
    expect(isValidOscHost("192.168.1.100")).toBe(true);
    expect(isValidOscHost("999.999.999.999")).toBe(false);
    expect(isValidOscHost("not-an-ip")).toBe(false);
    expect(isValidOscHost("")).toBe(false);
  });

  it("validates port numbers", () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(7001)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(1.5)).toBe(false);
  });

  it("validates gain values", () => {
    expect(validateGain(0)).toBe(true);
    expect(validateGain(75)).toBe(true);
    expect(validateGain(37.5)).toBe(true);
    expect(validateGain(-1)).toBe(false);
    expect(validateGain(76)).toBe(false);
    expect(validateGain(NaN)).toBe(false);
  });

  it("validates fader values", () => {
    expect(validateFader(0)).toBe(true);
    expect(validateFader(1)).toBe(true);
    expect(validateFader(0.5)).toBe(true);
    expect(validateFader(-0.1)).toBe(false);
    expect(validateFader(1.1)).toBe(false);
    expect(validateFader(NaN)).toBe(false);
  });

  it("validates OSC channel numbers", () => {
    expect(validateOscChannel(1)).toBe(true);
    expect(validateOscChannel(128)).toBe(true);
    expect(validateOscChannel(0)).toBe(false);
    expect(validateOscChannel(129)).toBe(false);
    expect(validateOscChannel(1.5)).toBe(false);
  });

  it("validates snapshot indices", () => {
    expect(validateSnapshotIndex(0)).toBe(true);
    expect(validateSnapshotIndex(7)).toBe(true);
    expect(validateSnapshotIndex(-1)).toBe(false);
    expect(validateSnapshotIndex(8)).toBe(false);
    expect(validateSnapshotIndex(1.5)).toBe(false);
  });
});

describe("OSC init/destroy", () => {
  it("initializes and reports connected", async () => {
    expect(isOscConnected()).toBe(false);
    await initOsc("127.0.0.1", 7001, 9001);
    expect(isOscConnected()).toBe(true);
  });

  it("destroys and reports disconnected", async () => {
    await initOsc("127.0.0.1", 7001, 9001);
    expect(isOscConnected()).toBe(true);
    await destroyOsc();
    expect(isOscConnected()).toBe(false);
  });

  it("double-destroy is safe", async () => {
    await initOsc("127.0.0.1", 7001, 9001);
    await destroyOsc();
    await destroyOsc(); // no error
    expect(isOscConnected()).toBe(false);
  });
});

describe("OSC send functions", () => {
  beforeEach(async () => {
    await initOsc("127.0.0.1", 7001, 9001);
  });

  it("sends gain via OSC", async () => {
    await sendOscGain(1, 50);
    expect(global.oscClient!.send).toHaveBeenCalled();
  });

  it("sends fader via OSC", async () => {
    await sendOscFader(2, 0.8);
    expect(global.oscClient!.send).toHaveBeenCalled();
  });

  it("sends toggle via OSC", async () => {
    await sendOscToggle("mute", 1, true);
    expect(global.oscClient!.send).toHaveBeenCalled();
  });

  it("sends snapshot recall via OSC", async () => {
    await sendOscSnapshotRecall(3);
    expect(global.oscClient!.send).toHaveBeenCalled();
  });

  it("no-ops when not connected", async () => {
    await destroyOsc();
    // Clear reinit attempts to prevent auto-reinit
    global.oscLastSettings = undefined;
    await sendOscGain(1, 50); // should not throw
  });
});

describe("OSC live state", () => {
  it("stores and retrieves live state", () => {
    updateOscLiveState("ch-1", { gain: 30 });
    expect(getOscLiveState("ch-1")).toEqual({ gain: 30 });
  });

  it("merges values on update", () => {
    updateOscLiveState("ch-1", { gain: 30 });
    updateOscLiveState("ch-1", { fader: 0.5 });
    expect(getOscLiveState("ch-1")).toEqual({ gain: 30, fader: 0.5 });
  });

  it("clears live state for a channel", () => {
    updateOscLiveState("ch-1", { gain: 30 });
    clearOscLiveState("ch-1");
    expect(getOscLiveState("ch-1")).toBeUndefined();
  });

  it("returns undefined for unknown channel", () => {
    expect(getOscLiveState("nonexistent")).toBeUndefined();
  });
});

describe("OSC metering", () => {
  it("returns empty map when no meter data", () => {
    const data = getMeterData();
    expect(data.size).toBe(0);
  });

  it("clears meter data", () => {
    global.oscMeterData = new Map([["1", { channelId: "1", level: 0.5 }]]);
    clearMeterData();
    expect(getMeterData().size).toBe(0);
  });
});

describe("OSC recovery", () => {
  it("reports not exhausted initially", () => {
    expect(isOscRecoveryExhausted()).toBe(false);
  });

  it("reports exhausted after max attempts", () => {
    const now = Date.now();
    global.oscReinitAttempts = [now, now, now];
    expect(isOscRecoveryExhausted()).toBe(true);
  });
});
