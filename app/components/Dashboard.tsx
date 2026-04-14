"use client";

import { DashboardDataProvider, useDashboardData } from "./shared/DashboardDataContext";
import { KanbanActionsProvider } from "./shared/KanbanActionsContext";
import { DashboardUIProvider } from "./shared/DashboardUIContext";
import DashboardHeader from "./dashboard/DashboardHeader";
import DashboardModalHost from "./dashboard/DashboardModalHost";
import DashboardStatusScreen from "./dashboard/DashboardStatusScreen";
import DashboardWorkspace from "./dashboard/DashboardWorkspace";

export default function Dashboard() {
  return (
    <DashboardDataProvider>
      <KanbanActionsProvider>
        <DashboardUIProvider>
          <DashboardInner />
        </DashboardUIProvider>
      </KanbanActionsProvider>
    </DashboardDataProvider>
  );
}

function DashboardInner() {
  const { initialLoadDone, initialLoadError, setInitialLoadDone, setInitialLoadError } = useDashboardData();

  if (!initialLoadDone) {
    return <DashboardStatusScreen mode="loading" />;
  }

  if (initialLoadError) {
    return (
      <DashboardStatusScreen
        mode="error"
        onRetry={() => {
          setInitialLoadError(false);
          setInitialLoadDone(false);
        }}
      />
    );
  }

  return (
    <main className="h-screen overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[2440px] flex-col gap-3 px-4 py-4 md:px-5 md:py-5">
        <DashboardHeader />
        <div className="min-h-0 flex-1 overflow-hidden">
          <DashboardWorkspace />
        </div>
        <DashboardModalHost />
      </div>
    </main>
  );
}
