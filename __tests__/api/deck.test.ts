import { describe, it, expect, vi } from "vitest";

vi.mock("sacn", () => import("../__mocks__/sacn"));
vi.mock("node-osc", () => import("../__mocks__/node-osc"));

import { POST as deckAction } from "@/app/api/deck/action/route";
import { GET as deckContext } from "@/app/api/deck/context/route";
import { POST as deckSelect } from "@/app/api/deck/select/route";
import { GET as deckLcd } from "@/app/api/deck/lcd/route";
import { GET as deckLightLcd } from "@/app/api/deck/light-lcd/route";
import { GET as deckAudioLcd } from "@/app/api/deck/audio-lcd/route";
import { POST as lightAction } from "@/app/api/deck/light-action/route";
import { POST as audioAction } from "@/app/api/deck/audio-action/route";
import { createDefaultAudioChannels } from "@/lib/audio-console";
import { writeDB, readDB } from "@/lib/db";
import { makeRequest } from "../helpers/request";
import { makeDB, makeProject, makeTask, makeLight, makeAudioSnapshot } from "../helpers/fixtures";

// ── Deck Action (project mode) ──────────────────────────

describe("POST /api/deck/action", () => {
  it("returns 400 for missing action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: {} });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "fly" } });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("selectNextProject cycles through projects", async () => {
    const p1 = makeProject({ id: "proj-1" });
    const p2 = makeProject({ id: "proj-2" });
    writeDB(
      makeDB({
        projects: [p1, p2],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "selectNextProject" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.selectedProjectId).toBe("proj-2");
  });

  it("selectPrevProject wraps around", async () => {
    const p1 = makeProject({ id: "proj-1" });
    const p2 = makeProject({ id: "proj-2" });
    writeDB(
      makeDB({
        projects: [p1, p2],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "selectPrevProject" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.selectedProjectId).toBe("proj-2");
  });

  it("selectNextTask cycles tasks within project", async () => {
    const t1 = makeTask({ id: "t-1", projectId: "proj-1", order: 0 });
    const t2 = makeTask({ id: "t-2", projectId: "proj-1", order: 1 });
    writeDB(
      makeDB({
        projects: [makeProject({ id: "proj-1" })],
        tasks: [t1, t2],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: "t-1",
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "selectNextTask" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.selectedTaskId).toBe("t-2");
  });

  it("setStatus changes project status", async () => {
    const p = makeProject({ id: "proj-1", status: "todo" });
    writeDB(
      makeDB({
        projects: [p],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setStatus", value: "done" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.project.status).toBe("done");
  });

  it("setStatus returns 400 for invalid status", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setStatus", value: "invalid" } });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("nextStatus cycles forward", async () => {
    const p = makeProject({ id: "proj-1", status: "todo" });
    writeDB(
      makeDB({
        projects: [p],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "nextStatus" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.project.status).toBe("in-progress");
  });

  it("prevStatus cycles backward", async () => {
    const p = makeProject({ id: "proj-1", status: "todo" });
    writeDB(
      makeDB({
        projects: [p],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "prevStatus" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.project.status).toBe("done");
  });

  it("setPriority sets priority", async () => {
    const p = makeProject({ id: "proj-1", priority: "p2" });
    writeDB(
      makeDB({
        projects: [p],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setPriority", value: "p0" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.project.priority).toBe("p0");
  });

  it("setPriority returns 400 for invalid value", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setPriority", value: "p99" } });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("nextSort cycles sort mode", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "nextSort" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.sortBy).toBe("priority");
  });

  it("prevSort cycles sort mode backward", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "prevSort" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.sortBy).toBe("name");
  });

  it("resetSort sets manual", async () => {
    writeDB(
      makeDB({
        settings: {
          viewFilter: "all",
          sortBy: "priority",
          selectedProjectId: null,
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "resetSort" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.sortBy).toBe("manual");
  });

  it("toggleTimer starts a timer", async () => {
    const t = makeTask({ id: "t-1", projectId: "proj-1", isRunning: false });
    writeDB(
      makeDB({
        projects: [makeProject({ id: "proj-1" })],
        tasks: [t],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: "t-1",
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "toggleTimer" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.task.isRunning).toBe(true);
  });

  it("toggleTimer returns 400 with no project", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "toggleTimer" } });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("toggleTaskComplete marks task done", async () => {
    const t = makeTask({ id: "t-1", projectId: "proj-1", completed: false });
    writeDB(
      makeDB({
        projects: [makeProject({ id: "proj-1" })],
        tasks: [t],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: "t-1",
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "toggleTaskComplete" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.task.completed).toBe(true);
  });

  it("createProject creates and selects", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", {
      method: "POST",
      body: { action: "createProject", value: "Deck Project" },
    });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.project.title).toBe("Deck Project");
    expect(readDB().settings.selectedProjectId).toBe(data.project.id);
  });

  it("deleteProject removes selected project", async () => {
    const p = makeProject({ id: "proj-1" });
    const t = makeTask({ id: "t-1", projectId: "proj-1" });
    writeDB(
      makeDB({
        projects: [p],
        tasks: [t],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: "t-1",
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "deleteProject" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.deleted).toBe(true);
    expect(readDB().projects).toHaveLength(0);
    expect(readDB().tasks).toHaveLength(0);
  });

  it("setFilter sets view filter", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setFilter", value: "done" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.viewFilter).toBe("done");
  });

  it("setFilter returns 400 for invalid filter", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "setFilter", value: "nope" } });
    const res = await deckAction(req, {});
    expect(res.status).toBe(400);
  });

  it("openDetail emits update", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/action", { method: "POST", body: { action: "openDetail" } });
    const res = await deckAction(req, {});
    const data = await res.json();
    expect(data.action).toBe("openDetail");
  });
});

// ── Deck Context ──────────────────────────────────────────

describe("GET /api/deck/context", () => {
  it("returns empty context", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/context");
    const res = await deckContext(req, {});
    const data = await res.json();
    expect(data.selectedProject).toBeNull();
    expect(data.projectCount).toBe(0);
  });

  it("returns selected project and tasks", async () => {
    const p = makeProject({ id: "proj-1", title: "My Proj" });
    const t = makeTask({ id: "t-1", projectId: "proj-1", title: "Task 1" });
    writeDB(
      makeDB({
        projects: [p],
        tasks: [t],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: "t-1",
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/context");
    const res = await deckContext(req, {});
    const data = await res.json();

    expect(data.selectedProject.title).toBe("My Proj");
    expect(data.taskCount).toBe(1);
    expect(data.selectedTask.title).toBe("Task 1");
  });
});

// ── Deck Select ──────────────────────────────────────────

describe("POST /api/deck/select", () => {
  it("selects by projectId", async () => {
    const p = makeProject({ id: "proj-1" });
    const t = makeTask({ id: "t-1", projectId: "proj-1", order: 0 });
    writeDB(makeDB({ projects: [p], tasks: [t] }));

    const req = makeRequest("/api/deck/select", { method: "POST", body: { projectId: "proj-1" } });
    const res = await deckSelect(req, {});
    const data = await res.json();
    expect(data.selectedProjectId).toBe("proj-1");
    expect(data.selectedTaskId).toBe("t-1");
  });

  it("selects next by direction", async () => {
    const p1 = makeProject({ id: "proj-1" });
    const p2 = makeProject({ id: "proj-2" });
    writeDB(
      makeDB({
        projects: [p1, p2],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/select", { method: "POST", body: { direction: "next" } });
    const res = await deckSelect(req, {});
    const data = await res.json();
    expect(data.selectedProjectId).toBe("proj-2");
  });

  it("returns 400 for invalid direction", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/select", { method: "POST", body: { direction: "up" } });
    const res = await deckSelect(req, {});
    expect(res.status).toBe(400);
  });
});

// ── Deck LCD ─────────────────────────────────────────────

describe("GET /api/deck/lcd", () => {
  it("returns 400 for missing key", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/lcd");
    const res = await deckLcd(req, {});
    expect(res.status).toBe(400);
  });

  it("returns project nav text", async () => {
    const p = makeProject({ id: "proj-1", title: "My Project" });
    writeDB(
      makeDB({
        projects: [p],
        settings: {
          viewFilter: "all",
          sortBy: "manual",
          selectedProjectId: "proj-1",
          selectedTaskId: null,
          dashboardView: "kanban",
          deckMode: "project",
          hasCompletedSetup: false,
        },
      })
    );

    const req = makeRequest("/api/deck/lcd?key=project_nav");
    const res = await deckLcd(req, {});
    const data = await res.json();
    expect(data).toContain("PROJECT");
    expect(data).toContain("1/1");
  });

  it("returns sort mode", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/lcd?key=sort_mode");
    const res = await deckLcd(req, {});
    const data = await res.json();
    expect(data).toContain("SORT");
    expect(data).toContain("Manual");
  });

  it("returns -- for unknown key", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/lcd?key=nonexistent");
    const res = await deckLcd(req, {});
    const data = await res.json();
    expect(data).toBe("--");
  });
});

// ── Deck Light LCD ────────────────────────────────────────

describe("GET /api/deck/light-lcd", () => {
  it("returns 400 for missing key", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-lcd");
    const res = await deckLightLcd(req, {});
    expect(res.status).toBe(400);
  });

  it("returns light nav text with selected light", async () => {
    const light = makeLight({ id: "l-1", name: "Key Light", order: 0 });
    writeDB(
      makeDB({
        lights: [light],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/deck/light-lcd?key=light_nav");
    const res = await deckLightLcd(req, {});
    const data = await res.json();
    expect(data).toContain("LIGHT");
    expect(data).toContain("Key Light");
  });

  it("returns intensity text", async () => {
    const light = makeLight({ id: "l-1", intensity: 75, order: 0 });
    writeDB(
      makeDB({
        lights: [light],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/deck/light-lcd?key=dial_1");
    const res = await deckLightLcd(req, {});
    const data = await res.json();
    expect(data).toContain("75%");
  });

  it("returns -- for no selected light", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-lcd?key=light_nav");
    const res = await deckLightLcd(req, {});
    const data = await res.json();
    expect(data).toContain("(none)");
  });
});

// ── Deck Audio LCD ────────────────────────────────────────

describe("GET /api/deck/audio-lcd", () => {
  it("returns 400 for missing key", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/audio-lcd");
    const res = await deckAudioLcd(req, {});
    expect(res.status).toBe(400);
  });

  it("returns channel info for audio_ch_nav", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, name: "Mic 1", gain: 45 } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const req = makeRequest("/api/deck/audio-lcd?key=audio_ch_nav");
    const res = await deckAudioLcd(req, {});
    const data = await res.json();
    expect(data).toContain("Mic 1");
    expect(data).toContain("45dB");
  });

  it("returns the first fixed strip on a fresh console", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/audio-lcd?key=audio_ch_nav");
    const res = await deckAudioLcd(req, {});
    const data = await res.json();
    expect(data).toContain("Front 9");
    expect(data).toContain("34dB");
  });
});

// ── Deck Light Action ────────────────────────────────────

describe("POST /api/deck/light-action", () => {
  it("returns 400 for missing action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-action", { method: "POST", body: {} });
    const res = await lightAction(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "dance" } });
    const res = await lightAction(req, {});
    expect(res.status).toBe(400);
  });

  it("selectNextLight cycles through lights", async () => {
    const l1 = makeLight({ id: "l-1", order: 0 });
    const l2 = makeLight({ id: "l-2", order: 1 });
    writeDB(
      makeDB({
        lights: [l1, l2],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "selectNextLight" } });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.selectedLightId).toBe("l-2");
  });

  it("toggleLight toggles on/off", async () => {
    const light = makeLight({ id: "l-1", on: false, order: 0 });
    writeDB(
      makeDB({
        lights: [light],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "toggleLight" } });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.light.on).toBe(true);
  });

  it("intensityUp increases intensity", async () => {
    const light = makeLight({ id: "l-1", intensity: 50, order: 0 });
    writeDB(
      makeDB({
        lights: [light],
        lightingSettings: {
          apolloBridgeIp: "2.0.0.1",
          dmxUniverse: 1,
          dmxEnabled: false,
          selectedLightId: "l-1",
          selectedSceneId: null,
          grandMaster: 100,
          cameraMarker: null,
          subjectMarker: null,
        },
      })
    );

    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "intensityUp" } });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.light.intensity).toBe(55);
  });

  it("allOn turns all lights on", async () => {
    const l1 = makeLight({ id: "l-1", on: false });
    const l2 = makeLight({ id: "l-2", on: false });
    writeDB(makeDB({ lights: [l1, l2] }));

    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "allOn" } });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.on).toBe(true);
    expect(readDB().lights.every((l) => l.on)).toBe(true);
  });

  it("saveScene creates a scene", async () => {
    const light = makeLight({ id: "l-1", intensity: 80, cct: 5600, on: true });
    writeDB(makeDB({ lights: [light] }));

    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "saveScene" } });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.scene).toBeDefined();
    expect(data.scene.lightStates).toHaveLength(1);
    expect(readDB().lightScenes).toHaveLength(1);
  });

  it("recallScene returns 400 with no scene selected", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-action", { method: "POST", body: { action: "recallScene" } });
    const res = await lightAction(req, {});
    expect(res.status).toBe(400);
  });

  it("switchToDeckMode changes mode", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/light-action", {
      method: "POST",
      body: { action: "switchToDeckMode", value: "project" },
    });
    const res = await lightAction(req, {});
    const data = await res.json();
    expect(data.deckMode).toBe("project");
  });
});

// ── Deck Audio Action ────────────────────────────────────

describe("POST /api/deck/audio-action", () => {
  it("returns 400 for missing action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: {} });
    const res = await audioAction(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown action", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "nope" } });
    const res = await audioAction(req, {});
    expect(res.status).toBe(400);
  });

  it("toggleMute toggles channel mute", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "toggleMute", value: "1" } });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.mute).toBe(true);
  });

  it("togglePhantom toggles phantom power", async () => {
    writeDB(makeDB());

    const req = makeRequest("/api/deck/audio-action", {
      method: "POST",
      body: { action: "togglePhantom", value: "1" },
    });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.phantom).toBe(true);
  });

  it("gainUp increases gain", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, gain: 30 } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "gainUp", value: "1" } });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.gain).toBe(33);
  });

  it("gainDown decreases gain", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, gain: 30 } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "gainDown", value: "1" } });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.gain).toBe(27);
  });

  it("gainDown clamps to 0", async () => {
    const channels = createDefaultAudioChannels().map((channel) =>
      channel.id === "audio-input-9" ? { ...channel, gain: 1 } : channel
    );
    writeDB(makeDB({ audioChannels: channels }));

    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "gainDown", value: "1" } });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.gain).toBe(0);
  });

  it("recallSnapshot recalls first snapshot", async () => {
    const snap = makeAudioSnapshot({ id: "snap-1", name: "Snap 1", oscIndex: 1, order: 0 });
    writeDB(makeDB({ audioSnapshots: [snap] }));

    const req = makeRequest("/api/deck/audio-action", { method: "POST", body: { action: "recallSnapshot" } });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.recalled).toBe("Snap 1");
  });

  it("switchToDeckMode changes deck mode", async () => {
    writeDB(makeDB());
    const req = makeRequest("/api/deck/audio-action", {
      method: "POST",
      body: { action: "switchToDeckMode", value: "project" },
    });
    const res = await audioAction(req, {});
    const data = await res.json();
    expect(data.deckMode).toBe("project");
  });
});
