"use client";

import ErrorBoundary from "../shared/ErrorBoundary";
import { useDashboardData } from "../shared/DashboardDataContext";
import AudioView from "../audio/AudioView";
import LightingView from "../lighting/LightingView";
import DashboardKanbanWorkspace from "./DashboardKanbanWorkspace";

export default function DashboardWorkspace() {
  const {
    dashboardView,
    lights,
    lightGroups,
    lightScenes,
    lightingSettings,
    audioChannels,
    audioMixTargets,
    audioSnapshots,
    audioSettings,
    fetchData,
  } = useDashboardData();

  if (dashboardView === "lighting") {
    return (
      <div className="h-full min-h-0">
        <ErrorBoundary fallbackLabel="Lighting view failed to render" onRetry={fetchData}>
          <LightingView
            lights={lights}
            lightGroups={lightGroups}
            lightScenes={lightScenes}
            lightingSettings={lightingSettings}
            onDataChange={fetchData}
          />
        </ErrorBoundary>
      </div>
    );
  }

  if (dashboardView === "audio") {
    return (
      <div className="h-full min-h-0">
        <ErrorBoundary fallbackLabel="Audio view failed to render" onRetry={fetchData}>
          <AudioView
            audioChannels={audioChannels}
            audioMixTargets={audioMixTargets}
            audioSnapshots={audioSnapshots}
            audioSettings={audioSettings}
            onDataChange={fetchData}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <DashboardKanbanWorkspace />
    </div>
  );
}
