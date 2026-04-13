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
    audioSnapshots,
    audioSettings,
    fetchData,
  } = useDashboardData();

  if (dashboardView === "lighting") {
    return (
      <ErrorBoundary fallbackLabel="Lighting view failed to render" onRetry={fetchData}>
        <LightingView
          lights={lights}
          lightGroups={lightGroups}
          lightScenes={lightScenes}
          lightingSettings={lightingSettings}
          onDataChange={fetchData}
        />
      </ErrorBoundary>
    );
  }

  if (dashboardView === "audio") {
    return (
      <ErrorBoundary fallbackLabel="Audio view failed to render" onRetry={fetchData}>
        <AudioView
          audioChannels={audioChannels}
          audioSnapshots={audioSnapshots}
          audioSettings={audioSettings}
          onDataChange={fetchData}
        />
      </ErrorBoundary>
    );
  }

  return <DashboardKanbanWorkspace />;
}
