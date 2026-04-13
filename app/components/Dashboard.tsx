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
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pb-6 pt-5 md:px-5">
        <DashboardHeader />
        <DashboardWorkspace />
        <DashboardModalHost />
      </div>
    </main>
  );
}
