import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window
import "OperatorParityHelpers.js" as OperatorParityHelpers

ApplicationWindow {
    id: root
    property var engineController: null
    property bool shellSmokeTest: false
    property bool windowSettingsApplied: false
    property bool suppressWindowStateSync: false
    property string planningSearchQuery: ""
    property bool planningTimeReportVisible: false
    property bool keyboardHelpVisible: false
    property bool aboutDialogVisible: false
    property bool planningProjectDetailVisible: false
    property real dashboardUiScale: 1.0
    property var planningWorkspacePanelRef: null
    property string selectedProjectTitleDraft: ""
    property string selectedProjectDescriptionDraft: ""
    property string selectedProjectPriorityDraft: "p2"
    property string selectedTaskTitleDraft: ""
    property string selectedTaskDescriptionDraft: ""
    property string selectedTaskPriorityDraft: "p2"
    property string selectedTaskDueDateDraft: ""
    property string selectedTaskLabelsDraft: ""
    property string selectedChecklistItemDraft: ""
    property bool audioOscEnabledDraft: true
    property string audioSendHostDraft: "127.0.0.1"
    property int audioSendPortDraft: 7001
    property int audioReceivePortDraft: 9001
    property bool audioExpectedPeakDataDraft: true
    property bool audioExpectedSubmixLockDraft: true
    property bool audioExpectedCompatibilityModeDraft: false
    property string audioNewSnapshotNameDraft: ""
    property int audioNewSnapshotSlotDraft: 1
    property string selectedAudioChannelId: ""
    property string selectedAudioMixTargetId: ""
    property string commissioningHardwareProfileDraft: ""
    property string commissioningLightingBridgeIpDraft: ""
    property int commissioningLightingUniverseDraft: 1
    property string commissioningAudioSendHostDraft: "127.0.0.1"
    property int commissioningAudioSendPortDraft: 7001
    property int commissioningAudioReceivePortDraft: 9001
    property bool lightingEnabledDraft: false
    property string lightingBridgeIpDraft: ""
    property int lightingUniverseDraft: 1
    property int lightingGrandMasterDraft: 100
    property string lightingNewFixtureNameDraft: ""
    property string lightingNewFixtureTypeDraft: "astra-bicolor"
    property int lightingNewFixtureDmxDraft: 1
    property string lightingNewFixtureGroupDraft: ""
    property string lightingNewGroupNameDraft: ""
    property string lightingNewSceneNameDraft: ""
    property string supportRestorePathDraft: ""
    property string selectedControlSurfacePageId: ""
    property string selectedControlSurfaceControlId: ""
    property string operatorSurfaceTarget: engineController && engineController.appSnapshotLoaded
                                           ? engineController.startupTargetSurface
                                           : "locked"

    width: 1280
    height: 800
    visible: !shellSmokeTest
    title: operatorSurfaceTarget === "dashboard"
           ? "SSE ExEd Studio Control - Dashboard"
           : operatorSurfaceTarget === "commissioning"
             ? "SSE ExEd Studio Control - Commissioning"
             : "SSE ExEd Studio Control"
    color: "#0f1724"

    function workspaceLabel(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return "Planning"
        case "lighting":
            return "Lighting"
        case "audio":
            return "Audio"
        case "setup":
            return "Setup"
        default:
            return "Planning"
        }
    }

    function workspaceSummary(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return engineController && engineController.planningSnapshotLoaded
                   ? engineController.planningDetails
                   : "Planning snapshot is loading from the engine."
        case "lighting":
            return engineController && engineController.lightingSnapshotLoaded
                   ? engineController.lightingDetails
                   : "Lighting snapshot is loading from the engine."
        case "audio":
            return engineController && engineController.audioSnapshotLoaded
                   ? engineController.audioDetails
                   : "Audio snapshot is loading from the engine."
        case "setup":
            return engineController && engineController.commissioningSnapshotLoaded
                   ? engineController.commissioningDetails
                   : "Commissioning snapshot is loading from the engine."
        default:
            return "Dashboard content will be driven by engine-owned state."
        }
    }

    function hostPlatformLabel() {
        switch (Qt.platform.os) {
        case "windows":
            return "Windows 11 x64"
        case "osx":
            return "macOS Apple Silicon"
        default:
            return "this workstation"
        }
    }

    function hostInstallerArtifact() {
        switch (Qt.platform.os) {
        case "windows":
            return "SSE-ExEd-Studio-Control-Native-windows-Installer.exe"
        case "osx":
            return "SSE-ExEd-Studio-Control-Native-macOS-Installer.zip"
        default:
            return "the platform-specific native installer"
        }
    }

    function hostUpdateArtifact() {
        switch (Qt.platform.os) {
        case "windows":
            return "SSE-ExEd-Studio-Control-Native-windows-UpdateRepository.zip"
        case "osx":
            return "SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip"
        default:
            return "the platform-specific native update repository archive"
        }
    }

    function commissioningSummary(stage) {
        switch (stage) {
        case "setup-required":
            return "This workstation has not completed commissioning, so the shell keeps the operator on setup instead of opening the dashboard."
        case "in-progress":
            return "Commissioning is in progress. The shell remains in setup until the engine marks the workstation ready."
        case "ready":
            return "Commissioning reports ready. Future launches should route directly to the dashboard surface."
        default:
            return "Commissioning state is engine-owned and controls startup routing."
        }
    }

    function dashboardModuleSummary(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return "Primary model: projects, tasks, activity, reports"
        case "lighting":
            return "Primary model: fixtures, groups, scenes, DMX state"
        case "audio":
            return "Primary model: channels, metering, snapshots, sync"
        case "setup":
            return "Primary model: commissioning status and support tools"
        default:
            return "Primary model: engine snapshot pending"
        }
    }

    function commissioningStatusLabel(status) {
        switch (status) {
        case "completed":
            return "Completed"
        case "passed":
            return "Passed"
        case "ready":
            return "Ready"
        case "in-progress":
            return "In Progress"
        case "attention":
            return "Needs Attention"
        case "failed":
            return "Failed"
        case "idle":
            return "Idle"
        default:
            return root.formatEnumLabel(status)
        }
    }

    function commissioningStatusColor(status) {
        switch (status) {
        case "completed":
        case "passed":
            return "#34d399"
        case "ready":
            return "#60a5fa"
        case "in-progress":
            return "#f59e0b"
        case "attention":
        case "failed":
            return "#f87171"
        default:
            return "#9bb0c9"
        }
    }

    function commissioningCheckById(checkId) {
        if (!engineController || !engineController.commissioningSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.commissioningChecks.length; index += 1) {
            const check = engineController.commissioningChecks[index]
            if (check.id === checkId) {
                return check
            }
        }

        return null
    }

    function formatEnumLabel(value) {
        if (!value || value.length === 0) {
            return "Unknown"
        }

        const spaced = value.replace(/-/g, " ")
        return spaced.charAt(0).toUpperCase() + spaced.slice(1)
    }

    function formatSeconds(totalSeconds) {
        if (!totalSeconds || totalSeconds <= 0) {
            return "0m"
        }

        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)

        if (hours > 0 && minutes > 0) {
            return hours + "h " + minutes + "m"
        }

        if (hours > 0) {
            return hours + "h"
        }

        return minutes + "m"
    }

    function audioMixTargetById(mixTargetId) {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
            const target = engineController.audioMixTargets[index]
            if (target.id === mixTargetId) {
                return target
            }
        }

        return null
    }

    function audioChannelById(channelId) {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.audioChannels.length; index += 1) {
            const channel = engineController.audioChannels[index]
            if (channel.id === channelId) {
                return channel
            }
        }

        return null
    }

    function audioChannelsByRole(role) {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return []
        }

        const channels = []
        for (let index = 0; index < engineController.audioChannels.length; index += 1) {
            const channel = engineController.audioChannels[index]
            if (channel.role === role) {
                channels.push(channel)
            }
        }

        return channels
    }

    function audioLiveChannelCount() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return 0
        }

        let liveCount = 0
        for (let index = 0; index < engineController.audioChannels.length; index += 1) {
            const channel = engineController.audioChannels[index]
            if (channel.meterLevel && channel.meterLevel > 0.015) {
                liveCount += 1
            }
        }

        return liveCount
    }

    function audioPeakReturnStatus() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return "Pending"
        }

        if (!engineController.audioExpectedPeakData) {
            return "Optional"
        }

        switch (engineController.audioMeteringState) {
        case "live":
            return root.audioLiveChannelCount() + " live"
        case "stale":
            return "Stale"
        case "offline":
            return "Offline"
        case "disabled":
            return "OSC disabled"
        default:
            return "Check TotalMix"
        }
    }

    function audioInputCount() {
        return root.audioChannelsByRole("front-preamp").length + root.audioChannelsByRole("rear-line").length
    }

    function audioPlaybackCount() {
        return root.audioChannelsByRole("playback-pair").length
    }

    function audioOscStatusColor() {
        if (!engineController || !engineController.audioSnapshotLoaded || !engineController.audioOscEnabled) {
            return "#8ea4c0"
        }

        switch (engineController.audioMeteringState) {
        case "live":
            return "#6fd3a8"
        case "stale":
        case "awaiting-peak-data":
        case "transport-only":
            return "#f7d47c"
        default:
            return "#f7b4bc"
        }
    }

    function audioOscStatusLabel() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return "Audio snapshot pending"
        }

        if (!engineController.audioOscEnabled) {
            return "OSC disabled"
        }

        switch (engineController.audioMeteringState) {
        case "live":
            return "Meter return verified"
        case "stale":
            return "Meter return stale"
        case "awaiting-peak-data":
            return "Transport ready, awaiting peak data"
        case "transport-only":
            return "Transport ready, peak verification optional"
        case "offline":
            return "OSC offline"
        default:
            return root.audioMeteringLabel(engineController.audioMeteringState)
        }
    }

    function audioOscStatusDetail() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return "Audio workspace is still loading."
        }

        if (!engineController.audioOscEnabled) {
            return "OSC transport is disabled in audio settings."
        }

        switch (engineController.audioMeteringState) {
        case "live":
            return root.audioLiveChannelCount() + " channels returning live peak data"
        case "stale":
            return "Peak data stopped updating. Verify TotalMix peak return settings and transport health."
        case "awaiting-peak-data":
            return "Check TotalMix OSC: Send Peak Level Data."
        case "transport-only":
            return "Inbound peak verification is disabled for this console profile."
        case "offline":
            return "No active TotalMix transport detected."
        default:
            return engineController.audioDetails
        }
    }

    function audioConsoleStateColor() {
        return engineController && engineController.audioConsoleStateConfidence === "aligned" ? "#6fd3a8" : "#f7d47c"
    }

    function audioConsoleStateDetail() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return "Console state is waiting for the latest audio snapshot."
        }

        if (engineController.audioConsoleStateConfidence === "aligned") {
            return engineController.audioLastConsoleSyncAt.length > 0
                   ? "Last full push " + root.formatTimestamp(engineController.audioLastConsoleSyncAt)
                   : "Console state is aligned with the stored mix."
        }

        if (engineController.audioLastConsoleSyncReason === "snapshot") {
            return engineController.audioLastSnapshotRecallAt.length > 0
                   ? "A snapshot was recalled " + root.formatTimestamp(engineController.audioLastSnapshotRecallAt)
                     + ". Sync Console to reassert the stored mix."
                   : "A snapshot changed hardware outside this surface. Sync Console before trusting stored strip values."
        }

        return "Startup is transport-safe. This surface assumes hardware state until you intentionally sync."
    }

    function audioSnapshotWarningVisible() {
        return !!engineController
               && engineController.audioSnapshotLoaded
               && engineController.audioConsoleStateConfidence === "assumed"
               && engineController.audioLastConsoleSyncReason === "snapshot"
    }

    function lightingGroupOptions() {
        const options = [{ "id": "", "name": "Ungrouped" }]
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return options
        }

        for (let index = 0; index < engineController.lightingGroups.length; index += 1) {
            options.push(engineController.lightingGroups[index])
        }

        return options
    }

    function lightingGroupIndex(groupId, options) {
        const targetGroupId = groupId ? groupId : ""
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === targetGroupId) {
                return index
            }
        }

        return 0
    }

    function lightingGroupName(groupId) {
        if (!groupId) {
            return "Ungrouped"
        }

        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return groupId
        }

        for (let index = 0; index < engineController.lightingGroups.length; index += 1) {
            const group = engineController.lightingGroups[index]
            if (group.id === groupId) {
                return group.name
            }
        }

        return groupId
    }

    function lightingFixtureTypeOptions() {
        return [
            { "id": "astra-bicolor", "name": "Litepanels Astra Bi-Color Soft", "channels": 2, "minCct": 3200, "maxCct": 5600 },
            { "id": "infinimat", "name": "Aputure Infinimat 2x4", "channels": 4, "minCct": 2000, "maxCct": 10000 },
            { "id": "infinibar-pb12", "name": "Aputure Infinibar PB12", "channels": 8, "minCct": 2000, "maxCct": 10000 }
        ]
    }

    function lightingFixtureTypeIndex(fixtureType, options) {
        const targetType = fixtureType ? fixtureType : "astra-bicolor"
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === targetType) {
                return index
            }
        }

        return 0
    }

    function lightingFixtureTypeName(fixtureType) {
        const options = root.lightingFixtureTypeOptions()
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === fixtureType) {
                return options[index].name
            }
        }

        return root.formatEnumLabel(fixtureType)
    }

    function lightingFixtureTypeChannels(fixtureType) {
        const options = root.lightingFixtureTypeOptions()
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === fixtureType) {
                return options[index].channels
            }
        }

        return 2
    }

    function lightingFixtureMaxStartAddress(fixtureType) {
        return 512 - root.lightingFixtureTypeChannels(fixtureType) + 1
    }

    function lightingFixtureMinCct(fixtureType) {
        const options = root.lightingFixtureTypeOptions()
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === fixtureType) {
                return options[index].minCct
            }
        }

        return 3200
    }

    function lightingFixtureMaxCct(fixtureType) {
        const options = root.lightingFixtureTypeOptions()
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === fixtureType) {
                return options[index].maxCct
            }
        }

        return 5600
    }

    function lightingEffectOptions() {
        return [
            { "id": "pulse", "name": "Pulse" },
            { "id": "strobe", "name": "Strobe" },
            { "id": "candle", "name": "Candle" }
        ]
    }

    function lightingEffectName(effect) {
        if (!effect || !effect.type) {
            return "No FX"
        }

        const options = root.lightingEffectOptions()
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === effect.type) {
                return options[index].name
            }
        }

        return root.formatEnumLabel(effect.type)
    }

    function lightingSceneOptions() {
        const options = [{ "id": "", "name": "No scene focus" }]
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return options
        }

        for (let index = 0; index < engineController.lightingScenes.length; index += 1) {
            options.push(engineController.lightingScenes[index])
        }

        return options
    }

    function lightingSceneIndex(sceneId, options) {
        const targetSceneId = sceneId ? sceneId : ""
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === targetSceneId) {
                return index
            }
        }

        return 0
    }

    function lightingFixtureOptions() {
        const options = [{ "id": "", "name": "No selection" }]
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return options
        }

        for (let index = 0; index < engineController.lightingFixtures.length; index += 1) {
            options.push(engineController.lightingFixtures[index])
        }

        return options
    }

    function lightingFixtureIndex(fixtureId, options) {
        const targetFixtureId = fixtureId ? fixtureId : ""
        for (let index = 0; index < options.length; index += 1) {
            if (options[index].id === targetFixtureId) {
                return index
            }
        }

        return 0
    }

    function lightingFixtureById(fixtureId) {
        if (!fixtureId || !engineController || !engineController.lightingSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.lightingFixtures.length; index += 1) {
            const fixture = engineController.lightingFixtures[index]
            if (fixture.id === fixtureId) {
                return fixture
            }
        }

        return null
    }

    function lightingSpatialPercent(value, fallbackPercent) {
        if (value === undefined || value === null) {
            return fallbackPercent
        }

        return value * 100
    }

    function lightingSpatialRotation(value) {
        if (value === undefined || value === null) {
            return 0
        }

        return value
    }

    function lightingHasMarker(marker) {
        return !!marker && marker.x !== undefined && marker.x !== null && marker.y !== undefined && marker.y !== null
    }

    function lightingMarkerPercent(marker, axis, fallbackPercent) {
        if (!root.lightingHasMarker(marker)) {
            return fallbackPercent
        }

        const value = marker[axis]
        return value === undefined || value === null ? fallbackPercent : value * 100
    }

    function lightingMarkerRotation(marker) {
        if (!root.lightingHasMarker(marker)) {
            return 0
        }

        return marker.rotation === undefined || marker.rotation === null ? 0 : marker.rotation
    }

    function lightingFirstUnplacedFixtureId() {
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return ""
        }

        for (let index = 0; index < engineController.lightingFixtures.length; index += 1) {
            const fixture = engineController.lightingFixtures[index]
            if (fixture.spatialX === undefined || fixture.spatialX === null
                    || fixture.spatialY === undefined || fixture.spatialY === null) {
                return fixture.id
            }
        }

        return ""
    }

    function lightingMarkerPayload(markerKey, markerValue) {
        if (markerKey === "cameraMarker") {
            return { "cameraMarker": markerValue }
        }

        return { "subjectMarker": markerValue }
    }

    function audioChannelSendLevel(channel, mixTargetId) {
        if (!channel) {
            return 0
        }

        const mixLevels = channel.mixLevels || {}
        if (mixTargetId && mixLevels[mixTargetId] !== undefined) {
            return mixLevels[mixTargetId]
        }

        return channel.fader !== undefined ? channel.fader : 0
    }

    function audioLevelLabel(value) {
        if (value <= 0) {
            return "-inf"
        }

        return ((value - 0.75) * 60).toFixed(1) + " dB"
    }

    function audioRoleLabel(role) {
        switch (role) {
        case "front-preamp":
            return "Front Preamp"
        case "rear-line":
            return "Rear Line"
        case "playback-pair":
            return "Playback Pair"
        case "main-out":
            return "Main Out"
        case "phones-a":
            return "Phones 1"
        case "phones-b":
            return "Phones 2"
        default:
            return root.formatEnumLabel(role)
        }
    }

    function audioBusLabel(channel) {
        if (!channel) {
            return "Unknown bus"
        }

        return channel.role === "playback-pair" ? "Playback bus" : "Input bus"
    }

    function audioMixLabel(target) {
        if (!target) {
            return "Main Out"
        }

        switch (target.role) {
        case "main-out":
            return "Main Monitors"
        case "phones-a":
            return "Phones 1"
        case "phones-b":
            return "Phones 2"
        default:
            return target.name
        }
    }

    function activeAudioSnapshot() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        if (engineController.audioLastRecalledSnapshotId.length > 0) {
            for (let index = 0; index < engineController.audioSnapshots.length; index += 1) {
                const snapshot = engineController.audioSnapshots[index]
                if (snapshot.id === engineController.audioLastRecalledSnapshotId) {
                    return snapshot
                }
            }
        }

        for (let index = 0; index < engineController.audioSnapshots.length; index += 1) {
            const snapshot = engineController.audioSnapshots[index]
            if (snapshot.lastRecalled) {
                return snapshot
            }
        }

        return null
    }

    function selectedAudioSendMatrix() {
        const channel = root.audioChannelById(root.selectedAudioChannelId)
        if (!channel || !engineController || !engineController.audioSnapshotLoaded) {
            return []
        }

        const entries = []
        for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
            const target = engineController.audioMixTargets[index]
            entries.push({
                "target": target,
                "level": root.audioChannelSendLevel(channel, target.id)
            })
        }

        return entries
    }

    function audioMeteringLabel(state) {
        switch (state) {
        case "live":
            return "Meter return verified"
        case "stale":
            return "Meter return stale"
        case "awaiting-peak-data":
            return "Awaiting peak data"
        case "transport-only":
            return "Transport ready"
        case "offline":
            return "OSC offline"
        case "disabled":
            return "OSC disabled"
        default:
            return root.formatEnumLabel(state)
        }
    }

    function audioMeterDb(value) {
        if (!value || value <= 0.0001) {
            return "-inf"
        }

        return (20 * Math.log(value) / Math.log(10)).toFixed(1) + " dB"
    }

    function audioConsoleStateLabel(confidence, reason) {
        if (confidence === "aligned") {
            return "Console aligned"
        }

        if (reason === "snapshot") {
            return "Snapshot changed hardware"
        }

        if (confidence === "assumed") {
            return "Console state assumed"
        }

        return "Console state pending"
    }

    function audioSettingsDirty() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return false
        }

        return audioOscEnabledDraft !== engineController.audioOscEnabled
               || audioSendHostDraft !== engineController.audioSendHost
               || audioSendPortDraft !== engineController.audioSendPort
               || audioReceivePortDraft !== engineController.audioReceivePort
               || audioExpectedPeakDataDraft !== engineController.audioExpectedPeakData
               || audioExpectedSubmixLockDraft !== engineController.audioExpectedSubmixLock
               || audioExpectedCompatibilityModeDraft !== engineController.audioExpectedCompatibilityMode
    }

    function audioChannelSupportsGain(channel) {
        return !!channel && channel.role === "front-preamp"
    }

    function audioChannelSupportsPhantom(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsPad(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsInstrument(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsAutoSet(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsPhase(channel) {
        return !!channel && channel.role !== "playback-pair"
    }

    function syncAudioSelection() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            root.selectedAudioChannelId = ""
            root.selectedAudioMixTargetId = ""
            return
        }

        root.selectedAudioChannelId = engineController.audioSelectedChannelId
        root.selectedAudioMixTargetId = engineController.audioSelectedMixTargetId
    }

    function syncAudioSettingsDrafts() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return
        }

        root.audioOscEnabledDraft = engineController.audioOscEnabled
        root.audioSendHostDraft = engineController.audioSendHost
        root.audioSendPortDraft = engineController.audioSendPort
        root.audioReceivePortDraft = engineController.audioReceivePort
        root.audioExpectedPeakDataDraft = engineController.audioExpectedPeakData
        root.audioExpectedSubmixLockDraft = engineController.audioExpectedSubmixLock
        root.audioExpectedCompatibilityModeDraft = engineController.audioExpectedCompatibilityMode
    }

    function syncLightingSettingsDrafts() {
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return
        }

        root.lightingEnabledDraft = engineController.lightingEnabled
        root.lightingBridgeIpDraft = engineController.lightingBridgeIp
        root.lightingUniverseDraft = engineController.lightingUniverse
        root.lightingGrandMasterDraft = engineController.lightingGrandMaster
    }

    function checklistProgress(checklist) {
        if (!checklist || checklist.length === 0) {
            return "No checklist"
        }

        let completedCount = 0
        for (let index = 0; index < checklist.length; index += 1) {
            if (checklist[index].done) {
                completedCount += 1
            }
        }

        return completedCount + "/" + checklist.length + " checklist complete"
    }

    function formatTimestamp(timestamp) {
        if (!timestamp || timestamp.length === 0) {
            return "Unknown time"
        }

        return timestamp.slice(0, 16).replace("T", " ")
    }

    function formatUnixTimestamp(timestamp) {
        if (!timestamp || timestamp <= 0) {
            return "Unknown time"
        }

        const date = new Date(timestamp * 1000)
        return date.toISOString().slice(0, 16).replace("T", " ")
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes <= 0) {
            return "0 B"
        }

        if (bytes < 1024) {
            return bytes + " B"
        }
        if (bytes < 1024 * 1024) {
            return Math.round(bytes / 1024) + " KB"
        }

        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }

    function formatDueDate(dueDate) {
        if (!dueDate || dueDate.length === 0) {
            return ""
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(dueDate + "T00:00:00")
        const diffMs = due.getTime() - today.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return "Overdue " + dueDate
        }
        if (diffDays === 0) {
            return "Due today"
        }
        if (diffDays <= 3) {
            return "Due " + dueDate
        }

        return dueDate
    }

    function projectTitle(projectId) {
        if (!engineController) {
            return projectId
        }

        const project = root.projectById(projectId)
        if (project) {
            return project.title
        }

        return projectId
    }

    function taskTitle(taskId) {
        if (!engineController) {
            return taskId
        }

        const task = root.taskById(taskId)
        if (task) {
            return task.title
        }

        return taskId
    }

    function projectById(projectId) {
        if (!engineController || !projectId || projectId.length === 0) {
            return null
        }

        for (let index = 0; index < engineController.planningProjects.length; index += 1) {
            const project = engineController.planningProjects[index]
            if (project.id === projectId) {
                return project
            }
        }

        return null
    }

    function taskById(taskId) {
        if (!engineController || !taskId || taskId.length === 0) {
            return null
        }

        for (let index = 0; index < engineController.planningTasks.length; index += 1) {
            const task = engineController.planningTasks[index]
            if (task.id === taskId) {
                return task
            }
        }

        return null
    }

    function labelsToCsv(labels) {
        if (!labels || labels.length === 0) {
            return ""
        }

        return labels.join(", ")
    }

    function tasksForProject(projectId) {
        const items = []
        if (!engineController || !projectId || projectId.length === 0) {
            return items
        }

        for (let index = 0; index < engineController.planningTasks.length; index += 1) {
            const task = engineController.planningTasks[index]
            if (task.projectId === projectId) {
                items.push(task)
            }
        }

        return items
    }

    function activityForProject(projectId) {
        const items = []
        if (!engineController || !projectId || projectId.length === 0) {
            return items
        }

        const taskIds = {}
        const tasks = root.tasksForProject(projectId)
        for (let index = 0; index < tasks.length; index += 1) {
            taskIds[tasks[index].id] = true
        }

        for (let index = 0; index < engineController.planningActivityLog.length; index += 1) {
            const entry = engineController.planningActivityLog[index]
            if (entry.entityId === projectId || taskIds[entry.entityId]) {
                items.push(entry)
            }
        }

        return items
    }

    function completedTaskCountForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let count = 0
        for (let index = 0; index < tasks.length; index += 1) {
            if (tasks[index].completed) {
                count += 1
            }
        }

        return count
    }

    function totalSecondsForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let total = 0
        for (let index = 0; index < tasks.length; index += 1) {
            total += tasks[index].totalSeconds
        }

        return total
    }

    function checklistTotalsForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let done = 0
        let total = 0
        for (let index = 0; index < tasks.length; index += 1) {
            const checklist = tasks[index].checklist || []
            total += checklist.length
            for (let itemIndex = 0; itemIndex < checklist.length; itemIndex += 1) {
                if (checklist[itemIndex].done) {
                    done += 1
                }
            }
        }

        return { done: done, total: total }
    }

    function progressForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        if (tasks.length === 0) {
            return 0
        }

        return root.completedTaskCountForProject(projectId) / tasks.length
    }

    function syncPlanningDrafts() {
        const selectedProject = root.projectById(engineController ? engineController.planningSelectedProjectId : "")
        const selectedTask = root.taskById(engineController ? engineController.planningSelectedTaskId : "")
        root.selectedProjectTitleDraft = selectedProject ? selectedProject.title : ""
        root.selectedProjectDescriptionDraft = selectedProject ? selectedProject.description : ""
        root.selectedProjectPriorityDraft = selectedProject ? selectedProject.priority : "p2"
        root.selectedTaskTitleDraft = selectedTask ? selectedTask.title : ""
        root.selectedTaskDescriptionDraft = selectedTask ? selectedTask.description : ""
        root.selectedTaskPriorityDraft = selectedTask ? selectedTask.priority : "p2"
        root.selectedTaskDueDateDraft = selectedTask && selectedTask.dueDate ? selectedTask.dueDate : ""
        root.selectedTaskLabelsDraft = selectedTask ? root.labelsToCsv(selectedTask.labels) : ""
        root.selectedChecklistItemDraft = ""
    }

    function isSelectedProject(projectId) {
        return engineController && engineController.planningSelectedProjectId === projectId
    }

    function isSelectedTask(taskId) {
        return engineController && engineController.planningSelectedTaskId === taskId
    }

    function taskStateLabel(task) {
        if (task.isRunning) {
            return "Running"
        }

        if (task.completed) {
            return "Completed"
        }

        return "Queued"
    }

    function inputFieldHasFocus() {
        const item = root.activeFocusItem
        return !!item && item.hasOwnProperty("cursorPosition")
    }

    function planningPriorityRank(priority) {
        return OperatorParityHelpers.planningPriorityRank(priority)
    }

    function planningProjectMatchesSearch(project) {
        return OperatorParityHelpers.planningProjectMatchesSearch(
            project,
            root.planningSearchQuery,
            root.tasksForProject(project.id)
        )
    }

    function filteredPlanningProjects() {
        if (!engineController || !engineController.planningSnapshotLoaded) {
            return []
        }

        return OperatorParityHelpers.filteredPlanningProjects(
            engineController.planningProjects,
            engineController.planningTasks,
            engineController.planningViewFilter,
            engineController.planningSortBy,
            root.planningSearchQuery
        )
    }

    function filteredPlanningProjectsForStatus(status) {
        if (!engineController || !engineController.planningSnapshotLoaded) {
            return []
        }

        return OperatorParityHelpers.filteredPlanningProjectsForStatus(
            engineController.planningProjects,
            engineController.planningTasks,
            engineController.planningViewFilter,
            engineController.planningSortBy,
            root.planningSearchQuery,
            status
        )
    }

    function planningResultCount() {
        if (!engineController || !engineController.planningSnapshotLoaded) {
            return 0
        }

        return OperatorParityHelpers.planningResultCount(
            engineController.planningProjects,
            engineController.planningTasks,
            engineController.planningViewFilter,
            engineController.planningSortBy,
            root.planningSearchQuery
        )
    }

    function focusPlanningSearch() {
        if (planningWorkspacePanelRef) {
            planningWorkspacePanelRef.focusSearch()
        }
    }

    function closeTransientPanels() {
        root.keyboardHelpVisible = false
        root.aboutDialogVisible = false
        root.planningTimeReportVisible = false
        root.planningProjectDetailVisible = false
    }

    function openPlanningProjectDetail(projectId) {
        if (!engineController || !projectId || projectId.length === 0) {
            return
        }

        engineController.selectPlanningProject(projectId)
        root.planningProjectDetailVisible = true
    }

    function selectAudioMixTarget(mixTargetId) {
        if (!engineController || !mixTargetId || mixTargetId.length === 0) {
            return
        }

        root.selectedAudioMixTargetId = mixTargetId
        engineController.updateAudioSettings({ "selectedMixTargetId": mixTargetId })
    }

    function focusAudioChannel(channelId) {
        if (!engineController || !channelId || channelId.length === 0) {
            return
        }

        root.selectedAudioChannelId = channelId
        engineController.updateAudioSettings({ "selectedChannelId": channelId })
    }

    function controlSurfacePageById(pageId) {
        if (!engineController || !engineController.controlSurfaceSnapshotLoaded) {
            return null
        }

        return OperatorParityHelpers.controlSurfacePageById(engineController.controlSurfacePages, pageId)
    }

    function controlSurfaceControlById(pageId, controlId) {
        if (!engineController || !engineController.controlSurfaceSnapshotLoaded) {
            return null
        }

        return OperatorParityHelpers.controlSurfaceControlById(
            engineController.controlSurfacePages,
            pageId,
            controlId
        )
    }

    function activitySummary(entry) {
        if (!entry) {
            return ""
        }

        const action = root.formatEnumLabel(entry.action)
        const entityType = root.formatEnumLabel(entry.entityType)
        return action + " " + entityType
    }

    function scheduleWindowStateSync() {
        if (shellSmokeTest || !engineController || !windowSettingsApplied || suppressWindowStateSync) {
            return
        }

        if (!engineController.operatorUiReady) {
            return
        }

        windowStateSyncTimer.restart()
    }

    onWidthChanged: scheduleWindowStateSync()
    onHeightChanged: scheduleWindowStateSync()
    onVisibilityChanged: scheduleWindowStateSync()

    Timer {
        id: windowStateSyncTimer
        interval: 350
        repeat: false
        onTriggered: {
            if (!engineController || !engineController.operatorUiReady) {
                return
            }

            engineController.syncWindowState(
                Math.round(root.width),
                Math.round(root.height),
                root.visibility === Window.Maximized
            )
        }
    }

    Component {
        id: commissioningSurfaceComponent

        Item {
            ColumnLayout {
                anchors.fill: parent
                spacing: 12

                Label {
                    text: "Commissioning Surface"
                    color: "#ffffff"
                    font.pixelSize: 22
                    font.weight: Font.DemiBold
                }

                Label {
                    text: root.commissioningSummary(engineController.commissioningStage)
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1100 ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 164

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Commissioning Gate"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: engineController.commissioningStage
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Dashboard remains blocked until the engine marks setup complete."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: ["setup-required", "in-progress", "ready"]

                                    Button {
                                        required property string modelData
                                        text: modelData === "ready" ? "Mark Ready" : root.formatEnumLabel(modelData)
                                        highlighted: engineController.commissioningStage === modelData
                                        onClicked: engineController.updateCommissioningStage(modelData)
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 164

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Hardware Profile"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: engineController.hardwareProfile
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Adapter configuration and commissioning checks will attach to this engine-owned profile."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    Layout.fillWidth: true
                                    text: root.commissioningHardwareProfileDraft
                                    placeholderText: "Hardware profile id"
                                    onTextChanged: root.commissioningHardwareProfileDraft = text
                                }

                                Button {
                                    text: "Save"
                                    enabled: root.commissioningHardwareProfileDraft.trim().length > 0
                                    onClicked: engineController.updateHardwareProfile(root.commissioningHardwareProfileDraft)
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 220

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Commissioning Workstreams"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: engineController.commissioningSteps

                                    Rectangle {
                                        required property var modelData
                                        radius: 10
                                        color: "#101826"
                                        border.color: "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: 56

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 2

                                            RowLayout {
                                                Layout.fillWidth: true

                                                Label {
                                                    text: modelData.label
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    text: root.commissioningStatusLabel(modelData.status)
                                                    color: root.commissioningStatusColor(modelData.status)
                                                    font.pixelSize: 11
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            Label {
                                                text: modelData.summary
                                                color: "#b4c0cf"
                                                wrapMode: Text.WordWrap
                                                font.pixelSize: 11
                                                Layout.fillWidth: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 128

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Persisted Dashboard Landing"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "When commissioning completes, the shell will route to the dashboard and restore this workspace first."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: ["planning", "lighting", "audio", "setup"]

                                    Button {
                                        required property string modelData
                                        text: root.workspaceLabel(modelData)
                                        highlighted: engineController.workspaceMode === modelData
                                        onClicked: engineController.setWorkspaceMode(modelData)
                                    }
                                }
                            }
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1250 ? 3 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    Rectangle {
                        id: controlSurfaceProbeCard
                        property var probeState: root.commissioningCheckById("control-surface")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Control Surface Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: controlSurfaceProbeCard.probeState ? root.commissioningStatusLabel(controlSurfaceProbeCard.probeState.status) : "Idle"
                                color: controlSurfaceProbeCard.probeState ? root.commissioningStatusColor(controlSurfaceProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: controlSurfaceProbeCard.probeState
                                      ? controlSurfaceProbeCard.probeState.message
                                      : (engineController.controlSurfaceBaseUrl.length > 0
                                         ? "Run a native probe against the deck-facing planning context served at "
                                           + engineController.controlSurfaceBaseUrl + "."
                                         : "Run a native probe against the deck-facing planning context.")
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                            Button {
                                text: "Run Probe"
                                onClicked: engineController.runControlSurfaceProbe()
                            }
                        }
                    }

                    Rectangle {
                        id: lightingProbeCard
                        property var probeState: root.commissioningCheckById("lighting")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Lighting Bridge Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: lightingProbeCard.probeState ? root.commissioningStatusLabel(lightingProbeCard.probeState.status) : "Idle"
                                color: lightingProbeCard.probeState ? root.commissioningStatusColor(lightingProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    Layout.fillWidth: true
                                    text: root.commissioningLightingBridgeIpDraft
                                    placeholderText: "Bridge IP"
                                    onTextChanged: root.commissioningLightingBridgeIpDraft = text
                                }

                                SpinBox {
                                    from: 1
                                    to: 63999
                                    value: root.commissioningLightingUniverseDraft
                                    editable: true
                                    onValueModified: root.commissioningLightingUniverseDraft = value
                                }
                            }

                            Label {
                                text: lightingProbeCard.probeState ? lightingProbeCard.probeState.message : "Validate the configured Apollo Bridge address before DMX adapter work lands."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Button {
                                text: "Run Lighting Probe"
                                enabled: root.commissioningLightingBridgeIpDraft.trim().length > 0
                                onClicked: engineController.runLightingProbe(
                                               root.commissioningLightingBridgeIpDraft,
                                               root.commissioningLightingUniverseDraft
                                           )
                            }
                        }
                    }

                    Rectangle {
                        id: audioProbeCard
                        property var probeState: root.commissioningCheckById("audio")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Audio OSC Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: audioProbeCard.probeState ? root.commissioningStatusLabel(audioProbeCard.probeState.status) : "Idle"
                                color: audioProbeCard.probeState ? root.commissioningStatusColor(audioProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            TextField {
                                Layout.fillWidth: true
                                text: root.commissioningAudioSendHostDraft
                                placeholderText: "OSC send host"
                                onTextChanged: root.commissioningAudioSendHostDraft = text
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                SpinBox {
                                    from: 1
                                    to: 65535
                                    value: root.commissioningAudioSendPortDraft
                                    editable: true
                                    onValueModified: root.commissioningAudioSendPortDraft = value
                                }

                                SpinBox {
                                    from: 1
                                    to: 65535
                                    value: root.commissioningAudioReceivePortDraft
                                    editable: true
                                    onValueModified: root.commissioningAudioReceivePortDraft = value
                                }
                            }

                            Label {
                                text: audioProbeCard.probeState ? audioProbeCard.probeState.message : "Validate OSC transport settings before the native audio adapter owns live console sync."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Button {
                                text: "Run Audio Probe"
                                enabled: root.commissioningAudioSendHostDraft.trim().length > 0
                                onClicked: engineController.runAudioProbe(
                                               root.commissioningAudioSendHostDraft,
                                               root.commissioningAudioSendPortDraft,
                                               root.commissioningAudioReceivePortDraft
                                           )
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 132

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Sample Planning Data"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.commissioningPlanningProjectCount > 0
                                      ? engineController.commissioningPlanningProjectCount + " projects and "
                                        + engineController.commissioningPlanningTaskCount
                                        + " tasks are already present in native storage."
                                      : "Load the bundled native planning sample to make the dashboard useful immediately after commissioning."
                                color: "#d6dce5"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                            RowLayout {
                                spacing: 8

                                Button {
                                    text: engineController.commissioningPlanningProjectCount > 0 ? "Replace Sample Data" : "Load Sample Data"
                                    onClicked: engineController.seedCommissioningSamplePlanning(
                                                   engineController.commissioningPlanningProjectCount > 0
                                               )
                                }

                                Label {
                                    text: engineController.commissioningDetails
                                    color: "#8ea4c0"
                                    font.pixelSize: 11
                                    wrapMode: Text.WordWrap
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 168

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Companion Export"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.controlSurfaceAvailable ? "Ready" : "Unavailable"
                                color: engineController.controlSurfaceAvailable ? "#6fd3a4" : "#ff9a7d"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.controlSurfaceDetails
                                color: "#d6dce5"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                            Label {
                                text: engineController.controlSurfaceBaseUrl.length > 0
                                      ? "Generic HTTP base URL: " + engineController.controlSurfaceBaseUrl
                                      : "No native control-surface bridge URL is available yet."
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                spacing: 8

                                Button {
                                    text: "Export Companion Profile"
                                    enabled: engineController.controlSurfaceAvailable
                                    onClicked: engineController.exportCompanionConfig()
                                }

                                Button {
                                    text: "Open App Data"
                                    onClicked: engineController.openAppDataDirectory()
                                }
                            }

                            Label {
                                text: engineController.companionExportPath.length > 0
                                      ? "Latest export: " + engineController.companionExportPath
                                      : "No native Companion profile has been exported yet."
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
                                Layout.fillWidth: true
                            }
                        }
                    }
                }
            }
        }
    }

    Component {
        id: dashboardSurfaceComponent

        Item {
            ColumnLayout {
                anchors.fill: parent
                spacing: 12

                DashboardHeaderPanel {
                    rootWindow: root
                    engineController: engineController
                    scaleFactor: root.dashboardUiScale
                    Layout.fillWidth: true
                }

                PlanningWorkspacePanel {
                    id: planningWorkspacePanel
                    rootWindow: root
                    engineController: engineController
                    scaleFactor: root.dashboardUiScale
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Component.onCompleted: root.planningWorkspacePanelRef = planningWorkspacePanel
                    Component.onDestruction: {
                        if (root.planningWorkspacePanelRef === planningWorkspacePanel) {
                            root.planningWorkspacePanelRef = null
                        }
                    }
                }

                LightingWorkspacePanel {
                    rootWindow: root
                    engineController: engineController
                    scaleFactor: root.dashboardUiScale
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                }

                AudioWorkspacePanel {
                    rootWindow: root
                    engineController: engineController
                    scaleFactor: root.dashboardUiScale
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                }

                SetupWorkspacePanel {
                    rootWindow: root
                    engineController: engineController
                    scaleFactor: root.dashboardUiScale
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                }

                Rectangle {
                    visible: !!engineController
                             && engineController.workspaceMode !== "planning"
                             && engineController.workspaceMode !== "lighting"
                             && engineController.workspaceMode !== "audio"
                             && engineController.workspaceMode !== "setup"
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: 14
                    color: "#0c1320"
                    border.color: "#35506b"
                    border.width: 1

                    ScrollView {
                        anchors.fill: parent
                        anchors.margins: 14
                        clip: true
                        contentWidth: availableWidth

                        ColumnLayout {
                            width: parent.width
                            spacing: 10

                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode) + " Workspace"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: root.workspaceSummary(engineController.workspaceMode)
                                color: "#d6dce5"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode !== "planning"
                                columns: root.width >= 1100 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? "Lighting Snapshot"
                                                  : engineController.workspaceMode === "audio"
                                                    ? "Audio Snapshot"
                                                    : "Commissioning Snapshot"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: root.workspaceSummary(engineController.workspaceMode)
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? "Bridge Config"
                                                  : engineController.workspaceMode === "audio"
                                                    ? "Transport Config"
                                                    : "Commissioning State"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? (engineController.lightingSnapshotLoaded
                                                     ? "Bridge "
                                                       + (engineController.lightingBridgeIp.length > 0
                                                          ? engineController.lightingBridgeIp
                                                          : "unconfigured")
                                                       + "\nUniverse "
                                                       + engineController.lightingUniverse
                                                       + "\nAdapter "
                                                       + root.formatEnumLabel(engineController.lightingAdapterMode)
                                                     : "Lighting configuration is waiting for the engine snapshot.")
                                                  : engineController.workspaceMode === "audio"
                                                    ? (engineController.audioSnapshotLoaded
                                                       ? "Send "
                                                         + engineController.audioSendHost
                                                         + ":"
                                                         + engineController.audioSendPort
                                                         + "\nReceive "
                                                         + engineController.audioReceivePort
                                                         + "\nAdapter "
                                                         + root.formatEnumLabel(engineController.audioAdapterMode)
                                                       : "Audio transport settings are waiting for the engine snapshot.")
                                                    : (engineController.commissioningSnapshotLoaded
                                                       ? engineController.commissioningConfigDetails
                                                       : "Commissioning configuration is waiting for the engine snapshot.")
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label {
                                            text: engineController.workspaceMode === "setup" ? "Support Snapshot" : "Readiness"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? (engineController.lightingSnapshotLoaded
                                                     ? "Status "
                                                       + root.formatEnumLabel(engineController.lightingStatus)
                                                       + "\nConnected "
                                                       + (engineController.lightingConnected ? "yes" : "no")
                                                       + " | Reachable "
                                                       + (engineController.lightingReachable ? "yes" : "no")
                                                       + "\nFixtures "
                                                       + engineController.lightingFixtureCount
                                                       + " | Groups "
                                                       + engineController.lightingGroupCount
                                                       + " | Scenes "
                                                       + engineController.lightingSceneCount
                                                     : "Lighting readiness is still synchronizing.")
                                                  : engineController.workspaceMode === "audio"
                                                    ? (engineController.audioSnapshotLoaded
                                                       ? "Status "
                                                         + root.formatEnumLabel(engineController.audioStatus)
                                                         + "\nConnected "
                                                         + (engineController.audioConnected ? "yes" : "no")
                                                         + " | Verified "
                                                         + (engineController.audioVerified ? "yes" : "no")
                                                         + "\nMetering "
                                                         + root.formatEnumLabel(engineController.audioMeteringState)
                                                       + "\nChannels "
                                                       + engineController.audioChannelCount
                                                       + " | Mix Targets "
                                                       + engineController.audioMixTargetCount
                                                       + " | Snapshots "
                                                       + engineController.audioSnapshotCount
                                                       : "Audio readiness is still synchronizing.")
                                                    : (engineController.commissioningSnapshotLoaded
                                                       ? engineController.commissioningReadinessDetails
                                                       : "Commissioning support state is still synchronizing.")
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                visible: engineController.workspaceMode === "planning"
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 88

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 4

                                    Label { text: "View State"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: "Filter " + root.formatEnumLabel(engineController.planningViewFilter) + " | Sort " + root.formatEnumLabel(engineController.planningSortBy) + "\nWorkspace " + root.workspaceLabel(engineController.workspaceMode)
                                        color: "#f5f7fb"
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Connections {
        target: engineController

        function onPlanningSnapshotChanged() {
            root.syncPlanningDrafts()
            if (root.planningProjectDetailVisible && !root.projectById(engineController.planningSelectedProjectId)) {
                root.planningProjectDetailVisible = false
            }
        }

        function onAppSnapshotChanged() {
            if (!engineController || !engineController.appSnapshotLoaded) {
                return
            }

            root.commissioningHardwareProfileDraft = engineController.hardwareProfile
        }

        function onControlSurfaceSnapshotChanged() {
            if (!engineController || !engineController.controlSurfaceSnapshotLoaded) {
                return
            }

            if (!root.selectedControlSurfacePageId.length && engineController.controlSurfacePages.length > 0) {
                root.selectedControlSurfacePageId = engineController.controlSurfacePages[0].id
            }

            const page = root.controlSurfacePageById(root.selectedControlSurfacePageId)
            const controls = OperatorParityHelpers.controlSurfacePageControls(page)
            if ((!root.selectedControlSurfaceControlId.length || !root.controlSurfaceControlById(root.selectedControlSurfacePageId, root.selectedControlSurfaceControlId))
                    && controls.length > 0) {
                root.selectedControlSurfaceControlId = controls[0].id
            }
        }

        function onCommissioningSnapshotChanged() {
            if (!engineController || !engineController.commissioningSnapshotLoaded) {
                return
            }

            root.commissioningLightingBridgeIpDraft = engineController.commissioningLightingBridgeIp
            root.commissioningLightingUniverseDraft = engineController.commissioningLightingUniverse
            root.commissioningAudioSendHostDraft = engineController.commissioningAudioSendHost
            root.commissioningAudioSendPortDraft = engineController.commissioningAudioSendPort
            root.commissioningAudioReceivePortDraft = engineController.commissioningAudioReceivePort
        }

        function onLightingSnapshotChanged() {
            root.syncLightingSettingsDrafts()
        }

        function onAudioSnapshotChanged() {
            root.syncAudioSelection()
            root.syncAudioSettingsDrafts()
        }

        function onSettingsChanged() {
            if (!engineController || shellSmokeTest || windowSettingsApplied || !engineController.windowSettingsLoaded) {
                return
            }

            suppressWindowStateSync = true
            root.width = engineController.windowWidth
            root.height = engineController.windowHeight
            root.visibility = engineController.windowMaximized ? Window.Maximized : Window.Windowed
            windowSettingsApplied = true
            Qt.callLater(function() {
                suppressWindowStateSync = false
            })
        }
    }

    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#15253c" }
            GradientStop { position: 1.0; color: "#0b1018" }
        }
    }

    ScrollView {
        id: runtimeShellScroll
        anchors.fill: parent
        clip: true
        ScrollBar.horizontal.policy: ScrollBar.AlwaysOff

        Item {
            width: runtimeShellScroll.availableWidth
            implicitHeight: shellLayout.implicitHeight + 56

            ColumnLayout {
                id: shellLayout
                anchors.top: parent.top
                anchors.topMargin: 28
                anchors.horizontalCenter: parent.horizontalCenter
                width: Math.min(Math.max(runtimeShellScroll.availableWidth - 48, 320), 960)
                spacing: 18

                Label {
                    text: "Native Runtime Shell"
                    color: "#f5f7fb"
                    font.pixelSize: 32
                    font.weight: Font.DemiBold
                    Layout.alignment: Qt.AlignHCenter
                }

                Label {
                    text: "Qt/QML shell supervising a Rust engine process over local IPC. The operator surface is selected from engine-owned startup state."
                    color: "#b4c0cf"
                    wrapMode: Text.WordWrap
                    horizontalAlignment: Text.AlignHCenter
                    Layout.fillWidth: true
                }

                Rectangle {
                    Layout.fillWidth: true
                    radius: 18
                    color: "#101826"
                    border.color: "#2a3b55"
                    border.width: 1
                    implicitHeight: 170

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 12

                        Label {
                            text: "Engine State"
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: engineController.stateLabel
                            color: "#ffffff"
                            font.pixelSize: 24
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Startup: " + engineController.startupPhaseLabel
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: "Health: " + engineController.healthStatus
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: engineController.message
                            color: "#d6dce5"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    radius: 18
                    color: "#111823"
                    border.color: engineController.stateLabel === "Failed" ? "#b4534b" : "#2a3b55"
                    border.width: 1
                    implicitHeight: 420

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 10

                        Label {
                            text: "Recovery"
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: engineController.healthDetails
                            color: "#e6ebf2"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Diagnostics path: " + engineController.diagnosticsPath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "App data path: " + engineController.appDataPath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Logs path: " + engineController.logsPath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Engine log: " + engineController.engineLogPath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Database path: " + engineController.databasePath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Engine version: " + engineController.engineVersion + " | Protocol: " + engineController.protocolVersion
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            visible: engineController.lastError.length > 0
                            text: "Last error: " + engineController.lastError
                            color: "#f0b3aa"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Storage: " + engineController.storageDetails
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Settings: " + engineController.settingsDetails
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Recent engine log excerpt"
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 120
                            radius: 10
                            color: "#0c1320"
                            border.color: "#2a3b55"
                            border.width: 1

                            ScrollView {
                                anchors.fill: parent
                                anchors.margins: 8
                                clip: true

                                TextEdit {
                                    readOnly: true
                                    text: engineController.recentLogExcerpt
                                    color: "#d6dce5"
                                    wrapMode: TextEdit.Wrap
                                    selectByMouse: true
                                    textFormat: TextEdit.PlainText
                                    width: parent ? parent.width : 0
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 8

                            Button {
                                text: "Retry Startup"
                                enabled: engineController.canRetry
                                onClicked: engineController.retryStart()
                            }

                            Button {
                                text: "Open Diagnostics"
                                onClicked: engineController.openDiagnosticsDirectory()
                            }

                            Button {
                                text: "Open Logs"
                                onClicked: engineController.openLogsDirectory()
                            }

                            Button {
                                text: "Open Engine Log"
                                onClicked: engineController.openEngineLogFile()
                            }

                            Button {
                                text: "Export Shell Diagnostics"
                                onClicked: engineController.exportShellDiagnostics()
                            }
                        }

                        Label {
                            visible: engineController.shellDiagnosticsExportPath.length > 0
                            text: "Last shell diagnostics export: " + engineController.shellDiagnosticsExportPath
                            color: "#8ea4c0"
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }
                    }
                }

                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 10
                    visible: !shellSmokeTest

                    Button {
                        text: "Start Engine"
                        onClicked: engineController.start()
                    }

                    Button {
                        text: "Ping"
                        onClicked: engineController.ping()
                    }

                    Button {
                        text: "Health"
                        onClicked: engineController.requestHealthSnapshot()
                    }

                    Button {
                        text: "App Snapshot"
                        onClicked: engineController.requestSettings()
                    }

                    Button {
                        text: "Stop Engine"
                        onClicked: engineController.stop()
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    radius: 18
                    color: "#101826"
                    border.color: "#2a3b55"
                    border.width: 1
                    implicitHeight: operatorSurfaceTarget === "commissioning"
                                    ? (root.width >= 1250 ? 1260 : root.width >= 1100 ? 1500 : 2280)
                                    : Math.max(root.height - 280, 420)
                    visible: engineController.operatorUiReady

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 14

                        RowLayout {
                            Layout.fillWidth: true

                            Label {
                                text: "Operator Surface"
                                color: "#8ea4c0"
                                font.pixelSize: 13
                            }

                            Item { Layout.fillWidth: true }

                            Rectangle {
                                radius: 999
                                color: operatorSurfaceTarget === "dashboard" ? "#163a2c" : "#3a2616"
                                border.color: operatorSurfaceTarget === "dashboard" ? "#2ba36a" : "#d59354"
                                border.width: 1
                                implicitHeight: 28
                                implicitWidth: badgeLabel.implicitWidth + 20

                                Label {
                                    id: badgeLabel
                                    anchors.centerIn: parent
                                    text: operatorSurfaceTarget.toUpperCase()
                                    color: operatorSurfaceTarget === "dashboard" ? "#d7ffea" : "#ffe6d3"
                                    font.pixelSize: 11
                                    font.weight: Font.DemiBold
                                }
                            }
                        }

                        Label {
                            text: engineController.appSnapshotDetails
                            color: "#d6dce5"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            radius: 14
                            color: "#101826"
                            border.color: "#2a3b55"
                            border.width: 1

                            Loader {
                                anchors.fill: parent
                                anchors.margins: 16
                                sourceComponent: operatorSurfaceTarget === "dashboard"
                                                 ? dashboardSurfaceComponent
                                                 : commissioningSurfaceComponent
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    radius: 18
                    color: "#101826"
                    border.color: "#2a3b55"
                    border.width: 1
                    implicitHeight: 170
                    visible: engineController.operatorUiReady

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 12

                        Label {
                            text: "Restored Shell State"
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: "Persisted workspace: " + root.workspaceLabel(engineController.workspaceMode)
                            color: "#ffffff"
                            font.pixelSize: 18
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Persisted window: " + engineController.windowWidth + " x " + engineController.windowHeight + " (" + (engineController.windowMaximized ? "maximized" : "windowed") + ")"
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        RowLayout {
                            spacing: 8

                            Button {
                                text: "Planning"
                                onClicked: engineController.setWorkspaceMode("planning")
                            }

                            Button {
                                text: "Lighting"
                                onClicked: engineController.setWorkspaceMode("lighting")
                            }

                            Button {
                                text: "Audio"
                                onClicked: engineController.setWorkspaceMode("audio")
                            }

                            Button {
                                text: "Setup"
                                onClicked: engineController.setWorkspaceMode("setup")
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    radius: 18
                    color: "#101826"
                    border.color: "#2a3b55"
                    border.width: 1
                    implicitHeight: 120
                    visible: !engineController.operatorUiReady

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 10

                        Label {
                            text: "Operator Surface Locked"
                            color: "#8ea4c0"
                            font.pixelSize: 13
                        }

                        Label {
                            text: engineController.stateLabel === "Failed"
                                  ? "The engine did not reach a healthy startup state. Retry from the recovery panel."
                                  : "The operator surface will unlock only after the engine reports healthy startup and an engine-owned application snapshot."
                            color: "#ffffff"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "Current startup phase: " + engineController.startupPhaseLabel
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: "App snapshot: " + engineController.appSnapshotDetails
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }
            }
        }
    }

    PlanningProjectDetailDialog {
        rootWindow: root
        engineController: engineController
        open: root.planningProjectDetailVisible
    }

    DashboardAboutDialog {
        rootWindow: root
        engineController: engineController
        open: root.aboutDialogVisible
    }

    OperatorShortcutsDialog {
        rootWindow: root
        engineController: engineController
        open: root.keyboardHelpVisible
    }

    Item {
        id: shortcutFallbackField
        visible: false
        width: 0
        height: 0
    }

    OperatorShortcutLayer {
        rootWindow: root
        engineController: engineController
        newProjectTitleField: root.planningWorkspacePanelRef ? root.planningWorkspacePanelRef.newProjectTitleField : shortcutFallbackField
    }
}
