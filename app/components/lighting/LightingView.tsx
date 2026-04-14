"use client";

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from "react-resizable-panels";
import type { Light, LightGroup, LightScene, LightingSettings } from "@/lib/types";
import LightingContentPanel from "./LightingContentPanel";
import LightingModalHost from "./LightingModalHost";
import LightingSidebar from "./LightingSidebar";
import LightingToolbar from "./LightingToolbar";
import { useLightingController } from "./hooks/useLightingController";

interface LightingViewProps {
  lights: Light[];
  lightGroups: LightGroup[];
  lightScenes: LightScene[];
  lightingSettings: LightingSettings;
  onDataChange: () => void;
}

export default function LightingView({
  lights,
  lightGroups,
  lightScenes,
  lightingSettings,
  onDataChange,
}: LightingViewProps) {
  const horizontalLayout = useDefaultLayout({
    id: "lighting-layout-v2",
    panelIds: ["content", "sidebar"],
    storage: typeof window !== "undefined" ? localStorage : undefined,
  });

  const controller = useLightingController({
    lights,
    lightGroups,
    lightingSettings,
    onDataChange,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <LightingToolbar
        allLoading={controller.allLoading}
        onAllOn={controller.handleAllOn}
        onAllOff={controller.handleAllOff}
        gmValue={controller.gmValue}
        onGmDrag={controller.handleGmDrag}
        onGmRelease={controller.handleGmRelease}
        dmxStatus={controller.dmxStatus}
        showDmxHint={controller.showDmxHint}
        onDismissHint={controller.dismissHint}
      />

      <div className="console-surface min-h-0 flex-1 overflow-hidden p-3">
        <PanelGroup
          orientation="horizontal"
          defaultLayout={horizontalLayout.defaultLayout}
          onLayoutChanged={horizontalLayout.onLayoutChanged}
          className="h-full min-h-0"
        >
          <Panel id="content" defaultSize="75%" minSize="40%">
            <LightingContentPanel
              contentRef={controller.contentRef}
              viewMode={controller.viewMode}
              lights={controller.sortedLights}
              lightingSettings={lightingSettings}
              selectedLightId={lightingSettings.selectedLightId}
              selectedIds={controller.spatialSelectedIds}
              dmxStatus={controller.dmxStatus}
              gridStyle={controller.gridStyle}
              sortedGroups={controller.sortedGroups}
              ungroupedLights={controller.ungroupedLights}
              collapsedGroups={controller.collapsedGroups}
              getGroupedLights={controller.getGroupedLights}
              onToggleGroupCollapsed={controller.toggleGroupCollapsed}
              onGroupPower={controller.handleGroupPower}
              onSelect={controller.handleSelect}
              onUpdate={controller.handleUpdate}
              onDmx={controller.handleDmx}
              onEffect={controller.handleEffect}
              onEditLight={(light) => controller.setModal({ type: "editLight", light })}
              onDeleteLight={(light) => controller.setModal({ type: "deleteLight", light })}
              onAddLight={() => controller.setModal({ type: "addLight" })}
              onSpatialSelect={controller.handleSpatialSelect}
              onSpatialDeselect={controller.handleSpatialDeselect}
              onSpatialSelectAll={controller.handleSpatialSelectAll}
              onMarqueeSelect={controller.setSpatialSelectedIds}
              onPositionChange={controller.handlePositionChange}
              onRotationChange={controller.handleRotationChange}
              onMarkerChange={controller.handleMarkerChange}
            />
          </Panel>

          <PanelResizeHandle className="lighting-resize-handle-h" style={{ flexBasis: 8 }} />

          <LightingSidebar
            lights={lights}
            lightScenes={lightScenes}
            lightingSettings={lightingSettings}
            sortedGroups={controller.sortedGroups}
            viewMode={controller.viewMode}
            showDmxMonitor={controller.showDmxMonitor}
            groupSaving={controller.groupSaving}
            spatialSelectedIds={controller.spatialSelectedIds}
            onSwitchViewMode={controller.switchViewMode}
            onToggleDmxMonitor={() => controller.setShowDmxMonitor((visible) => !visible)}
            onAddLight={() => controller.setModal({ type: "addLight" })}
            onOpenSettings={() => controller.setModal({ type: "settings" })}
            onUpdate={controller.handleUpdate}
            onDmx={controller.handleDmx}
            onEffect={controller.handleEffect}
            onEditLight={(light) => controller.setModal({ type: "editLight", light })}
            onDeleteLight={(light) => controller.setModal({ type: "deleteLight", light })}
            onDeselectSpatial={controller.handleSpatialDeselect}
            onRequestRenameGroup={(group) => {
              controller.setRenameGroupName(group.name);
              controller.setModal({ type: "renameGroup", groupId: group.id, groupName: group.name });
            }}
            onRequestDeleteGroup={(group) =>
              controller.setModal({ type: "deleteGroup", groupId: group.id, groupName: group.name })
            }
            onAddGroup={controller.handleAddGroup}
            getLightCount={(groupId) => controller.getGroupedLights(groupId).length}
          />
        </PanelGroup>
      </div>

      <LightingModalHost
        modal={controller.modal}
        lights={lights}
        lightGroups={lightGroups}
        lightingSettings={lightingSettings}
        renameGroupName={controller.renameGroupName}
        groupSaving={controller.groupSaving}
        onRenameGroupNameChange={controller.setRenameGroupName}
        onClose={() => controller.setModal({ type: "none" })}
        onSaved={onDataChange}
        onDeleteLight={controller.handleDeleteLight}
        onDeleteGroup={controller.handleDeleteGroup}
        onRenameGroup={controller.handleRenameGroup}
      />
    </div>
  );
}
