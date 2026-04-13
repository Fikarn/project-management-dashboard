"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import type {
  Project,
  Task,
  ViewFilter,
  SortOption,
  DashboardView,
  Light,
  LightGroup,
  LightScene,
  LightingSettings,
  AudioChannel,
  AudioSnapshot,
  AudioSettings,
  DmxStatus,
  OscStatus,
  Settings,
} from "@/lib/types";
import { useToast } from "./ToastContext";
import { lightsApi, scenesApi, projectsApi, settingsApi, audioApi } from "@/lib/client-api";

interface ProjectsResponse {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
  settings: Settings;
}

interface DashboardDataContextValue {
  projects: Project[];
  tasks: Task[];
  filter: ViewFilter;
  sortBy: SortOption;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  dashboardView: DashboardView;
  lights: Light[];
  lightGroups: LightGroup[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  audioChannels: AudioChannel[];
  audioSnapshots: AudioSnapshot[];
  audioSettings: AudioSettings;
  connected: "connected" | "connecting" | "disconnected";
  lastSavedKey: number;
  globalDmxStatus: DmxStatus | null;
  globalOscStatus: OscStatus | null;
  initialLoadDone: boolean;
  initialLoadError: boolean;
  hasCompletedSetup: boolean;
  fetchData: () => Promise<void>;
  handleViewChange: (view: DashboardView) => Promise<void>;
  handleFilterChange: (newFilter: ViewFilter) => Promise<void>;
  handleSortChange: (newSort: SortOption) => Promise<void>;
  setInitialLoadDone: (v: boolean) => void;
  setInitialLoadError: (v: boolean) => void;
  setHasCompletedSetup: (v: boolean) => void;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return ctx;
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [connected, setConnected] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [lastSavedKey, setLastSavedKey] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(true);
  const [dashboardView, setDashboardView] = useState<DashboardView>("kanban");
  const [lights, setLights] = useState<Light[]>([]);
  const [lightGroups, setLightGroups] = useState<LightGroup[]>([]);
  const [lightScenes, setLightScenes] = useState<LightScene[]>([]);
  const [lightingSettings, setLightingSettings] = useState<LightingSettings>({
    apolloBridgeIp: "2.0.0.1",
    dmxUniverse: 1,
    dmxEnabled: false,
    selectedLightId: null,
    selectedSceneId: null,
    grandMaster: 100,
    cameraMarker: null,
    subjectMarker: null,
  });
  const [audioChannels, setAudioChannels] = useState<AudioChannel[]>([]);
  const [audioSnapshots, setAudioSnapshots] = useState<AudioSnapshot[]>([]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    oscEnabled: false,
    oscSendHost: "127.0.0.1",
    oscSendPort: 7001,
    oscReceivePort: 9001,
    selectedChannelId: null,
  });

  const [globalDmxStatus, setGlobalDmxStatus] = useState<DmxStatus | null>(null);
  const [globalOscStatus, setGlobalOscStatus] = useState<OscStatus | null>(null);

  const toast = useToast();
  const dashboardViewRef = useRef(dashboardView);
  dashboardViewRef.current = dashboardView;
  const disconnectedSinceRef = useRef<number | null>(null);
  const disconnectToastShownRef = useRef(false);

  // Lightweight status polling for health strip (30s interval)
  useEffect(() => {
    const controller = new AbortController();
    async function poll() {
      try {
        const res = await lightsApi.fetchStatus({ signal: controller.signal });
        if (!controller.signal.aborted) {
          const data = await res.json();
          setGlobalDmxStatus({ connected: data.connected, reachable: data.reachable, enabled: data.enabled });
        }
      } catch {
        /* ignore — background polling */
      }
      try {
        const res = await audioApi.fetchStatus({ signal: controller.signal });
        if (!controller.signal.aborted) {
          const data = await res.json();
          setGlobalOscStatus({
            connected: data.connected,
            enabled: data.enabled,
            oscSendHost: data.oscSendHost,
            oscSendPort: data.oscSendPort,
            oscReceivePort: data.oscReceivePort,
          });
        }
      } catch {
        /* ignore — background polling */
      }
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [lightingSettings.dmxEnabled, audioSettings.oscEnabled]);

  const fetchLightingData = useCallback(async () => {
    try {
      const res = await lightsApi.fetchAll();
      const data = await res.json();
      setLights(data.lights);
      setLightGroups(data.lightGroups ?? []);
      setLightingSettings(data.lightingSettings);
      const scenesRes = await scenesApi.fetchAll();
      const scenesData = await scenesRes.json();
      setLightScenes(scenesData.scenes);
    } catch {
      if (dashboardViewRef.current === "lighting") {
        toast("error", "Failed to load lighting data");
      }
    }
  }, [toast]);

  const fetchAudioData = useCallback(async () => {
    try {
      const res = await audioApi.fetchAll();
      const data = await res.json();
      setAudioChannels(data.audioChannels ?? []);
      setAudioSnapshots(data.audioSnapshots ?? []);
      setAudioSettings(data.audioSettings);
    } catch {
      if (dashboardViewRef.current === "audio") {
        toast("error", "Failed to load audio data");
      }
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      const res = await projectsApi.fetchAll();
      const data: ProjectsResponse = await res.json();
      setProjects(data.projects);
      setTasks(data.tasks);
      setFilter(data.filter ?? data.settings?.viewFilter ?? "all");
      if (data.settings?.sortBy) setSortBy(data.settings.sortBy);
      if (data.settings?.selectedProjectId !== undefined) setSelectedProjectId(data.settings.selectedProjectId);
      if (data.settings?.selectedTaskId !== undefined) setSelectedTaskId(data.settings.selectedTaskId);
      if (data.settings?.dashboardView) setDashboardView(data.settings.dashboardView);
      if (data.settings?.hasCompletedSetup !== undefined) setHasCompletedSetup(data.settings.hasCompletedSetup);
    } catch {
      toast("error", "Failed to load projects");
    }
    await Promise.all([fetchLightingData(), fetchAudioData()]);
  }, [fetchLightingData, fetchAudioData, toast]);

  // Initial load with auto-retry for Electron server startup delays
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxRetries = 5;
    const tryLoad = () => {
      fetchData()
        .then(() => {
          if (!cancelled) {
            setInitialLoadDone(true);
            setInitialLoadError(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          attempts++;
          if (attempts < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
            setTimeout(tryLoad, delay);
          } else {
            setInitialLoadError(true);
            setInitialLoadDone(true);
          }
        });
    };
    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // SSE subscription with auto-reconnect
  useEffect(() => {
    let es: EventSource | null = null;
    let backoff = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function connectSSE() {
      if (cancelled) return;
      setConnected("connecting");
      es = new EventSource("/api/events");

      es.addEventListener("update", () => {
        fetchData();
        setLastSavedKey((k) => k + 1);
      });

      es.addEventListener("db-error", () => {
        toast("error", "Database read failed on server");
      });

      es.onopen = () => {
        backoff = 1000;
        setConnected("connected");
        fetchData();
        if (disconnectedSinceRef.current && disconnectToastShownRef.current) {
          toast("success", "Connection restored");
        }
        disconnectedSinceRef.current = null;
        disconnectToastShownRef.current = false;
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected("disconnected");
        if (!disconnectedSinceRef.current) {
          disconnectedSinceRef.current = Date.now();
        }
        es?.close();
        es = null;
        reconnectTimer = setTimeout(() => {
          connectSSE();
          backoff = Math.min(backoff * 2, 10000);
        }, backoff);
      };
    }

    connectSSE();

    const disconnectCheckInterval = setInterval(() => {
      const since = disconnectedSinceRef.current;
      if (since && Date.now() - since > 15000 && !disconnectToastShownRef.current) {
        disconnectToastShownRef.current = true;
        toast("error", "Connection lost. Changes may not be saved. Reconnecting...");
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(disconnectCheckInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
      setConnected("disconnected");
    };
  }, [fetchData, toast]);

  const handleViewChange = useCallback(
    async (view: DashboardView) => {
      if (view === dashboardView) return;
      setDashboardView(view);
      try {
        await settingsApi.update({ dashboardView: view });
      } catch {
        toast("error", "Failed to save view setting");
      }
    },
    [dashboardView, toast]
  );

  const handleFilterChange = useCallback(
    async (newFilter: ViewFilter) => {
      setFilter(newFilter);
      try {
        await settingsApi.update({ viewFilter: newFilter });
      } catch {
        toast("error", "Failed to save filter setting");
      }
    },
    [toast]
  );

  const handleSortChange = useCallback(
    async (newSort: SortOption) => {
      setSortBy(newSort);
      try {
        await settingsApi.update({ sortBy: newSort });
      } catch {
        toast("error", "Failed to save sort setting");
      }
    },
    [toast]
  );

  const value = useMemo(
    (): DashboardDataContextValue => ({
      projects,
      tasks,
      filter,
      sortBy,
      selectedProjectId,
      selectedTaskId,
      dashboardView,
      lights,
      lightGroups,
      lightScenes,
      lightingSettings,
      audioChannels,
      audioSnapshots,
      audioSettings,
      connected,
      lastSavedKey,
      globalDmxStatus,
      globalOscStatus,
      initialLoadDone,
      initialLoadError,
      hasCompletedSetup,
      fetchData,
      handleViewChange,
      handleFilterChange,
      handleSortChange,
      setInitialLoadDone,
      setInitialLoadError,
      setHasCompletedSetup,
    }),
    [
      projects,
      tasks,
      filter,
      sortBy,
      selectedProjectId,
      selectedTaskId,
      dashboardView,
      lights,
      lightGroups,
      lightScenes,
      lightingSettings,
      audioChannels,
      audioSnapshots,
      audioSettings,
      connected,
      lastSavedKey,
      globalDmxStatus,
      globalOscStatus,
      initialLoadDone,
      initialLoadError,
      hasCompletedSetup,
      fetchData,
      handleViewChange,
      handleFilterChange,
      handleSortChange,
    ]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}
