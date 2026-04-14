export type ProjectStatus = "todo" | "in-progress" | "blocked" | "done";
export type ViewFilter = "all" | ProjectStatus;
export type Priority = "p0" | "p1" | "p2" | "p3";
export type SortOption = "manual" | "priority" | "date" | "name";

// Light control types
export type LightType = "astra-bicolor" | "infinimat" | "infinibar-pb12";
export type ColorMode = "cct" | "rgb" | "hsi";
export type EffectType = "pulse" | "strobe" | "candle";
export type DeckMode = "project" | "light" | "audio";
export type DashboardView = "kanban" | "lighting" | "audio";

export interface LightEffect {
  type: EffectType;
  speed: number; // 1-10 (slow to fast)
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  createdAt: string;
  lastUpdated: string;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  isRunning: boolean;
  totalSeconds: number;
  lastStarted: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
}

export interface Light {
  id: string;
  name: string;
  type: LightType;
  dmxStartAddress: number;
  intensity: number;
  cct: number;
  on: boolean;
  order: number;
  red: number;
  green: number;
  blue: number;
  colorMode: ColorMode;
  gmTint: number | null;
  groupId: string | null;
  effect: LightEffect | null;
  spatialX: number | null;
  spatialY: number | null;
  spatialRotation: number; // degrees, 0 = up/north
}

export interface LightGroup {
  id: string;
  name: string;
  order: number;
}

export interface LightScene {
  id: string;
  name: string;
  lightStates: LightSceneEntry[];
  createdAt: string;
  order: number;
}

export interface LightSceneEntry {
  lightId: string;
  intensity: number;
  cct: number;
  on: boolean;
  red: number;
  green: number;
  blue: number;
  colorMode: ColorMode;
  gmTint: number | null;
}

export interface SpatialMarker {
  x: number;
  y: number;
  rotation: number; // degrees, 0 = facing up
}

export interface LightingSettings {
  apolloBridgeIp: string;
  dmxUniverse: number;
  dmxEnabled: boolean;
  selectedLightId: string | null;
  selectedSceneId: string | null;
  grandMaster: number; // 0-100, global intensity multiplier
  cameraMarker: SpatialMarker | null;
  subjectMarker: SpatialMarker | null;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  entityType: "project" | "task" | "light" | "scene" | "audio";
  entityId: string;
  action: string;
  detail: string;
}

export interface Settings {
  viewFilter: ViewFilter;
  sortBy: SortOption;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  dashboardView: DashboardView;
  deckMode: DeckMode;
  hasCompletedSetup: boolean;
}

/** Partial light values used for slider updates and DMX sends. */
export interface LightValues {
  intensity?: number;
  cct?: number;
  on?: boolean;
  red?: number;
  green?: number;
  blue?: number;
  colorMode?: ColorMode;
  gmTint?: number | null;
}

/** DMX connection status from /api/lights/status. */
export interface DmxStatus {
  connected: boolean;
  reachable: boolean;
  enabled: boolean;
}

// Audio control types
export interface AudioChannel {
  id: string;
  name: string;
  shortName: string;
  oscChannel: number; // TotalMix channel index within its bus (1-based, left channel for stereo pairs)
  order: number;
  kind: "hardware-input" | "software-playback";
  role: "front-preamp" | "rear-line" | "playback-pair";
  stereo: boolean;
  gain: number; // 0-75 (front preamp trim)
  fader: number; // legacy/default send value, mirrored from the active mix when edited
  mixLevels: Record<string, number>; // per-output send values, keyed by AudioMixTarget id
  mute: boolean;
  solo: boolean; // TotalMix Solo/PFL
  phantom: boolean; // 48V, supported on front preamps
  phase: boolean;
  pad: boolean; // supported on front preamps
  instrument: boolean; // supported on front preamps
  autoSet: boolean; // supported on front preamps
}

export interface AudioMixTarget {
  id: string;
  name: string;
  shortName: string;
  oscChannel: number; // TotalMix output channel index (left channel for stereo pairs)
  order: number;
  role: "main-out" | "phones-a" | "phones-b";
  stereo: boolean;
  volume: number; // 0.0-1.0
  mute: boolean;
  dim: boolean;
  mono: boolean;
  talkback: boolean;
}

export interface AudioSnapshot {
  id: string;
  name: string;
  oscIndex: number; // TotalMix snapshot slot (0-7)
  order: number;
}

export type AudioConsoleStateConfidence = "assumed" | "aligned";
export type AudioConsoleSyncReason = "startup" | "snapshot" | "manual-sync" | null;

export interface AudioSettings {
  oscEnabled: boolean;
  oscSendHost: string;
  oscSendPort: number;
  oscReceivePort: number;
  selectedChannelId: string | null;
  selectedMixTargetId: string;
  expectedPeakData: boolean;
  expectedSubmixLock: boolean;
  expectedCompatibilityMode: boolean;
  fadersPerBank: number;
  lastRecalledSnapshotId: string | null;
  consoleStateConfidence: AudioConsoleStateConfidence;
  lastConsoleSyncAt: string | null;
  lastConsoleSyncReason: AudioConsoleSyncReason;
  lastSnapshotRecallAt: string | null;
}

/** OSC connection status from /api/audio/status. */
export interface OscStatus {
  connected: boolean;
  verified: boolean;
  enabled: boolean;
  oscSendHost: string;
  oscSendPort: number;
  oscReceivePort: number;
  recoveryExhausted?: boolean;
  lastMessageAt: string | null;
  lastMeterAt: string | null;
  lastInboundType: "meter" | "message" | null;
  meteringState?: "disabled" | "offline" | "awaiting-peak-data" | "live" | "stale" | "transport-only";
  activeMeterChannels?: number;
  staleMeterChannels?: number;
  clippedChannels?: number;
  consoleStateConfidence?: AudioConsoleStateConfidence;
  lastConsoleSyncAt?: string | null;
  lastConsoleSyncReason?: AudioConsoleSyncReason;
  lastSnapshotRecallAt?: string | null;
}

/** Real-time metering data per channel. */
export interface AudioMeterData {
  channelId: string;
  left: number; // 0.0-1.0 peak
  right: number; // 0.0-1.0 peak
  level: number; // max(left, right)
  peakHold: number; // 0.0-1.0 short hold peak
  clip: boolean;
  updatedAt: number | null;
}

/** Partial audio channel values used for slider updates and OSC sends. */
export interface AudioChannelValues {
  gain?: number;
  fader?: number;
  mute?: boolean;
  solo?: boolean;
  phantom?: boolean;
  phase?: boolean;
  pad?: boolean;
  instrument?: boolean;
  autoSet?: boolean;
  mixTargetId?: string;
}

export interface DB {
  schemaVersion: number;
  projects: Project[];
  tasks: Task[];
  activityLog: ActivityEntry[];
  settings: Settings;
  lights: Light[];
  lightGroups: LightGroup[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  audioChannels: AudioChannel[];
  audioMixTargets: AudioMixTarget[];
  audioSnapshots: AudioSnapshot[];
  audioSettings: AudioSettings;
}

// ---------------------------------------------------------------------------
// Request DTOs — typed request bodies for the client API layer
// ---------------------------------------------------------------------------

// --- Projects ---

export interface CreateProjectRequest {
  title: string;
  description?: string;
  priority?: Priority;
  status?: ProjectStatus;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: ProjectStatus;
}

export interface ReorderProjectsRequest {
  projectId: string;
  newStatus?: ProjectStatus;
  newIndex?: number;
}

// --- Tasks ---

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
  completed?: boolean;
  order?: number;
}

// --- Lights ---

export interface CreateLightRequest {
  name: string;
  type?: LightType;
  dmxStartAddress?: number;
  groupId?: string | null;
}

export interface UpdateLightRequest {
  name?: string;
  type?: LightType;
  dmxStartAddress?: number;
  groupId?: string | null;
  spatialX?: number | null;
  spatialY?: number | null;
  spatialRotation?: number;
}

export interface SendDmxRequest {
  lightId: string;
  intensity?: number;
  cct?: number;
  on?: boolean;
  red?: number;
  green?: number;
  blue?: number;
  colorMode?: ColorMode;
  gmTint?: number | null;
}

// --- Scenes ---

export interface UpdateSceneRequest {
  name?: string;
  updateStates?: boolean;
}

export interface RecallSceneRequest {
  fadeDuration?: number;
}

// --- Audio ---

export interface CreateAudioChannelRequest {
  name: string;
  oscChannel?: number;
}

export interface UpdateAudioChannelRequest {
  name?: string;
  oscChannel?: number;
}

export interface SendOscRequest {
  channelId: string;
  mixTargetId?: string;
  gain?: number;
  fader?: number;
  mute?: boolean;
  solo?: boolean;
  instrument?: boolean;
  autoSet?: boolean;
}

export interface ReorderAudioRequest {
  ids: string[];
}

// --- Audio Snapshots ---

export interface CreateAudioSnapshotRequest {
  name: string;
  oscIndex: number;
}

export interface UpdateAudioSnapshotRequest {
  name?: string;
  oscIndex?: number;
}

// --- Route context for Next.js 14 App Router ---

export interface RouteContext {
  params?: Record<string, string>;
}
