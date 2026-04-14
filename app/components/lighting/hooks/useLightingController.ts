"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Light, LightGroup, LightingSettings } from "@/lib/types";
import { groupsApi, lightsApi } from "@/lib/client-api";
import { useToast } from "../../shared/ToastContext";
import type { LightingModalState, LightingViewMode, LightValueUpdate } from "../types";
import { useDmxPolling } from "./useDmxPolling";

interface UseLightingControllerProps {
  lights: Light[];
  lightGroups: LightGroup[];
  lightingSettings: LightingSettings;
  onDataChange: () => void;
}

export function useLightingController({
  lights,
  lightGroups,
  lightingSettings,
  onDataChange,
}: UseLightingControllerProps) {
  const viewModeStorageKey = "lightingViewMode-v2";
  const [modal, setModal] = useState<LightingModalState>({ type: "none" });
  const [gmLocal, setGmLocal] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<LightingViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(viewModeStorageKey);
      if (stored === "compact" || stored === "spatial") return stored;
      if (localStorage.getItem("lightingViewCompact") === "1") return "compact";
    }
    return "expanded";
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showDmxMonitor, setShowDmxMonitor] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [spatialSelectedIds, setSpatialSelectedIds] = useState<string[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [contentWidth, setContentWidth] = useState(800);

  const gmRafRef = useRef<number | null>(null);
  const dmxErrorToastRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const sortedLights = useMemo(() => [...lights].sort((a, b) => a.order - b.order), [lights]);
  const sortedGroups = useMemo(() => [...lightGroups].sort((a, b) => a.order - b.order), [lightGroups]);

  const { dmxStatus, showDmxHint, dismissHint } = useDmxPolling({
    dmxEnabled: lightingSettings.dmxEnabled,
    apolloBridgeIp: lightingSettings.apolloBridgeIp,
  });

  const gmValue = gmLocal ?? lightingSettings.grandMaster ?? 100;

  useEffect(() => {
    const key = "lighting-panels-v2";
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.removeItem("react-resizable-panels:lighting-layout");
      localStorage.removeItem("react-resizable-panels:lighting-sidebar");
      localStorage.setItem(key, "1");
    }
  }, []);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setContentWidth(entries[0].contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const gridCols = useMemo(() => (contentWidth >= 900 ? 3 : contentWidth >= 550 ? 2 : 1), [contentWidth]);
  const gridStyle = useMemo(() => ({ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }), [gridCols]);

  const getGroupedLights = useCallback(
    (groupId: string) => sortedLights.filter((light) => light.groupId === groupId),
    [sortedLights]
  );

  const ungroupedLights = useMemo(() => sortedLights.filter((light) => !light.groupId), [sortedLights]);

  const handleGmDrag = useCallback((value: number) => {
    setGmLocal(value);
    if (gmRafRef.current) cancelAnimationFrame(gmRafRef.current);
    gmRafRef.current = requestAnimationFrame(() => {
      gmRafRef.current = null;
      lightsApi.updateSettings({ grandMaster: value }).catch(() => {});
    });
  }, []);

  const handleGmRelease = useCallback(
    (value: number) => {
      setGmLocal(null);
      lightsApi.updateSettings({ grandMaster: value }).catch(() => toast("error", "Failed to save grand master"));
    },
    [toast]
  );

  const switchViewMode = useCallback(
    (mode: LightingViewMode) => {
      setViewMode(mode);
      localStorage.setItem(viewModeStorageKey, mode);
    },
    [viewModeStorageKey]
  );

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleSelect = useCallback(async (lightId: string) => {
    try {
      await lightsApi.updateSettings({ selectedLightId: lightId });
    } catch {
      // Selection is cosmetic.
    }
  }, []);

  const handleDeselect = useCallback(async () => {
    try {
      await lightsApi.updateSettings({ selectedLightId: null });
    } catch {
      // Selection is cosmetic.
    }
  }, []);

  const handleUpdate = useCallback(
    async (lightId: string, values: LightValueUpdate) => {
      try {
        await lightsApi.updateValue(lightId, values);
      } catch {
        toast("error", "Failed to save light value");
      }
    },
    [toast]
  );

  const handleDmx = useCallback(
    async (lightId: string, values: LightValueUpdate) => {
      try {
        await lightsApi.sendDmx({ lightId, ...values });
      } catch (error) {
        console.error("DMX send failed:", error);
        if (!dmxErrorToastRef.current) {
          toast("error", "DMX send failed — check lighting settings");
          dmxErrorToastRef.current = true;
          setTimeout(() => {
            dmxErrorToastRef.current = false;
          }, 5000);
        }
      }
    },
    [toast]
  );

  const handleEffect = useCallback(
    async (lightId: string, effect: Light["effect"]) => {
      try {
        await lightsApi.setEffect(lightId, effect);
      } catch {
        toast("error", "Failed to set effect");
      }
    },
    [toast]
  );

  const handleAllOn = useCallback(async () => {
    setAllLoading(true);
    try {
      await lightsApi.setAll(true);
    } catch {
      toast("error", "Failed to turn on all lights");
    }
    setAllLoading(false);
  }, [toast]);

  const handleAllOff = useCallback(async () => {
    setAllLoading(true);
    try {
      await lightsApi.setAll(false);
    } catch {
      toast("error", "Failed to turn off all lights");
    }
    setAllLoading(false);
  }, [toast]);

  const handleDeleteLight = useCallback(
    async (light: Light) => {
      try {
        await lightsApi.delete(light.id);
        toast("success", `Deleted "${light.name}"`);
      } catch {
        toast("error", "Failed to delete light");
      }
      setModal({ type: "none" });
    },
    [toast]
  );

  const handleAddGroup = useCallback(
    async (name: string) => {
      setGroupSaving(true);
      try {
        await groupsApi.create(name);
        toast("success", `Group "${name}" created`);
        onDataChange();
      } catch {
        toast("error", "Failed to create group");
      }
      setGroupSaving(false);
    },
    [onDataChange, toast]
  );

  const handleRenameGroup = useCallback(
    async (groupId: string) => {
      const name = renameGroupName.trim();
      if (!name) return;
      setGroupSaving(true);
      try {
        await groupsApi.rename(groupId, name);
        toast("success", `Renamed to "${name}"`);
        onDataChange();
      } catch {
        toast("error", "Failed to rename group");
      }
      setGroupSaving(false);
      setModal({ type: "none" });
    },
    [onDataChange, renameGroupName, toast]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string, groupName: string) => {
      try {
        await groupsApi.delete(groupId);
        toast("success", `Deleted group "${groupName}"`);
        onDataChange();
      } catch {
        toast("error", "Failed to delete group");
      }
      setModal({ type: "none" });
    },
    [onDataChange, toast]
  );

  const handleGroupPower = useCallback(
    async (groupId: string, on: boolean) => {
      try {
        await groupsApi.setPower(groupId, on);
      } catch {
        toast("error", "Failed to update group");
      }
    },
    [toast]
  );

  const handlePositionChange = useCallback(
    async (lightId: string, x: number, y: number) => {
      try {
        await lightsApi.update(lightId, { spatialX: x, spatialY: y });
      } catch {
        toast("error", "Failed to save position");
      }
    },
    [toast]
  );

  const handleRotationChange = useCallback(
    async (lightId: string, rotation: number) => {
      try {
        await lightsApi.update(lightId, { spatialRotation: rotation });
      } catch {
        toast("error", "Failed to save rotation");
      }
    },
    [toast]
  );

  const handleMarkerChange = useCallback(
    async (type: "camera" | "subject", marker: LightingSettings["cameraMarker"]) => {
      const key = type === "camera" ? "cameraMarker" : "subjectMarker";
      try {
        await lightsApi.updateSettings({ [key]: marker });
      } catch {
        toast("error", "Failed to save marker position");
      }
    },
    [toast]
  );

  const handleSpatialSelect = useCallback(
    async (lightId: string, additive: boolean) => {
      if (additive) {
        setSpatialSelectedIds((previous) =>
          previous.includes(lightId) ? previous.filter((id) => id !== lightId) : [...previous, lightId]
        );
      } else {
        setSpatialSelectedIds([lightId]);
      }
      handleSelect(lightId);
    },
    [handleSelect]
  );

  const handleSpatialDeselect = useCallback(async () => {
    setSpatialSelectedIds([]);
    handleDeselect();
  }, [handleDeselect]);

  const handleSpatialSelectAll = useCallback(() => {
    setSpatialSelectedIds(sortedLights.map((light) => light.id));
  }, [sortedLights]);

  return {
    modal,
    setModal,
    viewMode,
    switchViewMode,
    collapsedGroups,
    toggleGroupCollapsed,
    showDmxMonitor,
    setShowDmxMonitor,
    groupSaving,
    renameGroupName,
    setRenameGroupName,
    spatialSelectedIds,
    setSpatialSelectedIds,
    allLoading,
    contentRef,
    sortedLights,
    sortedGroups,
    ungroupedLights,
    getGroupedLights,
    dmxStatus,
    showDmxHint,
    dismissHint,
    gmValue,
    gridStyle,
    handleGmDrag,
    handleGmRelease,
    handleSelect,
    handleUpdate,
    handleDmx,
    handleEffect,
    handleAllOn,
    handleAllOff,
    handleDeleteLight,
    handleAddGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleGroupPower,
    handlePositionChange,
    handleRotationChange,
    handleMarkerChange,
    handleSpatialSelect,
    handleSpatialDeselect,
    handleSpatialSelectAll,
  };
}
