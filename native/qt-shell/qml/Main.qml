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
    property bool planningProjectDetailVisible: false
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
            return "Native audio snapshot is still loading from the engine."
        }

        if (!engineController.audioOscEnabled) {
            return "OSC transport is disabled in native audio settings."
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
            return "Native console state is waiting for the engine snapshot."
        }

        if (engineController.audioConsoleStateConfidence === "aligned") {
            return engineController.audioLastConsoleSyncAt.length > 0
                   ? "Last full push " + root.formatTimestamp(engineController.audioLastConsoleSyncAt)
                   : "Native console state is aligned with the stored mix."
        }

        if (engineController.audioLastConsoleSyncReason === "snapshot") {
            return engineController.audioLastSnapshotRecallAt.length > 0
                   ? "A snapshot was recalled " + root.formatTimestamp(engineController.audioLastSnapshotRecallAt)
                     + ". Sync Console to reassert the stored mix."
                   : "A snapshot changed hardware outside this surface. Sync Console before trusting stored strip values."
        }

        return "Startup is transport-safe. The native surface assumes hardware state until you intentionally sync."
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
        if (planningToolbarPanel) {
            planningToolbarPanel.focusSearch()
        }
    }

    function closeTransientPanels() {
        root.keyboardHelpVisible = false
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

                Label {
                    text: "Dashboard Surface"
                    color: "#ffffff"
                    font.pixelSize: 22
                    font.weight: Font.DemiBold
                }

                Label {
                    text: engineController.workspaceMode === "planning"
                          ? (engineController.planningSnapshotLoaded
                             ? "The dashboard is rendering native planning state directly from the Rust engine."
                             : "The dashboard is waiting for the native planning snapshot from the Rust engine.")
                          : engineController.workspaceMode === "setup"
                            ? "The dashboard is rendering engine-owned commissioning state directly from the Rust engine."
                            : "The dashboard is rendering engine-owned readiness state for this workspace while deeper adapter behavior stays behind the engine boundary."
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: ["planning", "lighting", "audio", "setup"]

                        Rectangle {
                            required property string modelData
                            radius: 999
                            color: engineController.workspaceMode === modelData ? "#143152" : "#0c1320"
                            border.color: engineController.workspaceMode === modelData ? "#4da0ff" : "#35506b"
                            border.width: 1
                            implicitHeight: 34
                            implicitWidth: label.implicitWidth + 24

                            TapHandler {
                                onTapped: engineController.setWorkspaceMode(parent.modelData)
                            }

                            Label {
                                id: label
                                anchors.centerIn: parent
                                text: root.workspaceLabel(modelData)
                                color: engineController.workspaceMode === modelData ? "#e8f2ff" : "#9bb0c9"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                            }
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1280 ? 5 : root.width >= 980 ? 3 : 1
                    columnSpacing: 10
                    rowSpacing: 10

                    Rectangle {
                        radius: 12
                        color: "#101826"
                        border.color: "#2a3b55"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Engine"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.formatEnumLabel(engineController.healthStatus)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: "Protocol " + engineController.protocolVersion + " | " + engineController.engineVersion
                                color: "#8ea4c0"
                                font.pixelSize: 11
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Workspace"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: "Target " + root.formatEnumLabel(operatorSurfaceTarget)
                                color: "#8ea4c0"
                                font.pixelSize: 11
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Commissioning"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.formatEnumLabel(engineController.commissioningStage)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.hardwareProfile
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Support"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.supportBackupCount + " backups"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.supportLatestBackupPath.length > 0
                                      ? engineController.supportLatestBackupPath
                                      : "No native backup archive yet"
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Current Domain"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.workspaceMode === "planning"
                                      ? engineController.planningTaskCount + " tasks"
                                      : engineController.workspaceMode === "lighting"
                                        ? root.formatEnumLabel(engineController.lightingStatus)
                                        : engineController.workspaceMode === "audio"
                                          ? root.formatEnumLabel(engineController.audioStatus)
                                          : engineController.commissioningChecks.length + " probes"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.workspaceMode === "planning"
                                      ? engineController.planningRunningTaskCount + " running | "
                                        + engineController.planningCompletedTaskCount + " completed"
                                      : engineController.workspaceMode === "lighting"
                                        ? engineController.lightingFixtureCount + " fixtures | "
                                          + engineController.lightingSceneCount + " scenes"
                                        : engineController.workspaceMode === "audio"
                                          ? engineController.audioChannelCount + " channels | "
                                            + engineController.audioSnapshotCount + " snapshots"
                                          : engineController.commissioningPlanningProjectCount + " projects | "
                                            + engineController.commissioningPlanningTaskCount + " tasks"
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }
                }

                Rectangle {
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

                            PlanningSummaryGrid {
                                rootWindow: root
                                engineController: engineController
                            }

                            PlanningToolbarPanel {
                                id: planningToolbarPanel
                                rootWindow: root
                                engineController: engineController
                            }

                            PlanningBoardPanel {
                                rootWindow: root
                                engineController: engineController
                                onOpenProjectDetail: function(projectId) {
                                    root.openPlanningProjectDetail(projectId)
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1320 ? 4 : root.width >= 980 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 142

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Quick Actions"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Create projects and tasks directly from the dashboard."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                id: newProjectTitleField
                                                Layout.fillWidth: true
                                                placeholderText: "New project title"
                                                onAccepted: {
                                                    const title = text.trim()
                                                    if (title.length === 0) {
                                                        return
                                                    }

                                                    engineController.createPlanningProject(title)
                                                    text = ""
                                                }
                                            }

                                            Button {
                                                text: "Add Project"
                                                enabled: newProjectTitleField.text.trim().length > 0
                                                onClicked: {
                                                    const title = newProjectTitleField.text.trim()
                                                    engineController.createPlanningProject(title)
                                                    newProjectTitleField.text = ""
                                                }
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                id: newTaskTitleField
                                                Layout.fillWidth: true
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                placeholderText: engineController.planningSelectedProjectId.length > 0
                                                                 ? "New task for " + root.projectTitle(engineController.planningSelectedProjectId)
                                                                 : "Select a project to add a task"
                                                onAccepted: {
                                                    const title = text.trim()
                                                    if (title.length === 0 || engineController.planningSelectedProjectId.length === 0) {
                                                        return
                                                    }

                                                    engineController.createPlanningTask(engineController.planningSelectedProjectId, title)
                                                    text = ""
                                                }
                                            }

                                            Button {
                                                text: "Add Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && newTaskTitleField.text.trim().length > 0
                                                onClicked: {
                                                    const title = newTaskTitleField.text.trim()
                                                    engineController.createPlanningTask(engineController.planningSelectedProjectId, title)
                                                    newTaskTitleField.text = ""
                                                }
                                            }
                                        }

                                        Rectangle {
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: 240

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 8

                                                Label {
                                                    text: "DMX Monitor"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                }

                                                Label {
                                                    text: engineController.lightingDmxMonitorLoaded
                                                          ? "Live channel map for the current lighting snapshot."
                                                          : "DMX monitor is loading."
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                ScrollView {
                                                    Layout.fillWidth: true
                                                    Layout.fillHeight: true
                                                    clip: true

                                                    ColumnLayout {
                                                        width: parent.width
                                                        spacing: 6

                                                        Repeater {
                                                            model: engineController.lightingDmxChannels.slice(0, 16)

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Label {
                                                                    text: "Ch " + modelData.channel
                                                                    color: "#f5f7fb"
                                                                    font.family: "monospace"
                                                                    Layout.preferredWidth: 72
                                                                }

                                                                Label {
                                                                    text: modelData.lightName + "  " + modelData.label
                                                                    color: "#d6dce5"
                                                                    Layout.fillWidth: true
                                                                    wrapMode: Text.WordWrap
                                                                }

                                                                Label {
                                                                    text: modelData.value
                                                                    color: "#8ea4c0"
                                                                    font.family: "monospace"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 142

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selection"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Project " + (engineController.planningSelectedProjectId.length > 0
                                                                ? root.projectTitle(engineController.planningSelectedProjectId)
                                                                : "None")
                                                  + "\nTask "
                                                  + (engineController.planningSelectedTaskId.length > 0
                                                     ? root.taskTitle(engineController.planningSelectedTaskId)
                                                     : "None")
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Prev Project"
                                                enabled: engineController.planningProjectCount > 0
                                                onClicked: engineController.cyclePlanningProject("prev")
                                            }

                                            Button {
                                                text: "Next Project"
                                                enabled: engineController.planningProjectCount > 0
                                                onClicked: engineController.cyclePlanningProject("next")
                                            }

                                            Button {
                                                text: "Prev Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && engineController.planningTaskCount > 0
                                                onClicked: engineController.cyclePlanningTask("prev")
                                            }

                                            Button {
                                                text: "Next Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && engineController.planningTaskCount > 0
                                                onClicked: engineController.cyclePlanningTask("next")
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    id: projectControls
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 338

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Project Controls"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectControls.selectedProject
                                                  ? root.formatEnumLabel(projectControls.selectedProject.status) + " | " + projectControls.selectedProject.priority.toUpperCase()
                                                  : "Select a project to edit its details, move it, or change status."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        TextField {
                                            Layout.fillWidth: true
                                            enabled: !!projectControls.selectedProject
                                            text: root.selectedProjectTitleDraft
                                            placeholderText: "Selected project title"
                                            onTextChanged: root.selectedProjectTitleDraft = text
                                            onAccepted: {
                                                if (!projectControls.selectedProject || text.trim().length === 0) {
                                                    return
                                                }

                                                engineController.updatePlanningProject(
                                                            projectControls.selectedProject.id,
                                                            root.selectedProjectTitleDraft.trim(),
                                                            root.selectedProjectDescriptionDraft,
                                                            root.selectedProjectPriorityDraft)
                                            }
                                        }

                                        TextArea {
                                            Layout.fillWidth: true
                                            Layout.preferredHeight: 72
                                            enabled: !!projectControls.selectedProject
                                            text: root.selectedProjectDescriptionDraft
                                            placeholderText: "Project description"
                                            wrapMode: TextEdit.Wrap
                                            onTextChanged: root.selectedProjectDescriptionDraft = text
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Priority"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["p0", "p1", "p2", "p3"]

                                                Button {
                                                    required property string modelData
                                                    text: modelData.toUpperCase()
                                                    enabled: !!projectControls.selectedProject
                                                    highlighted: root.selectedProjectPriorityDraft === modelData
                                                    onClicked: root.selectedProjectPriorityDraft = modelData
                                                }
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Save"
                                                enabled: !!projectControls.selectedProject
                                                         && root.selectedProjectTitleDraft.trim().length > 0
                                                         && (root.selectedProjectTitleDraft.trim() !== projectControls.selectedProject.title
                                                             || root.selectedProjectDescriptionDraft !== projectControls.selectedProject.description
                                                             || root.selectedProjectPriorityDraft !== projectControls.selectedProject.priority)
                                                onClicked: engineController.updatePlanningProject(
                                                               projectControls.selectedProject.id,
                                                               root.selectedProjectTitleDraft.trim(),
                                                               root.selectedProjectDescriptionDraft,
                                                               root.selectedProjectPriorityDraft)
                                            }

                                            Button {
                                                text: "Delete"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.deletePlanningProject(projectControls.selectedProject.id)
                                            }

                                            Button {
                                                text: "Move Up"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.movePlanningProject(projectControls.selectedProject.id, "prev")
                                            }

                                            Button {
                                                text: "Move Down"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.movePlanningProject(projectControls.selectedProject.id, "next")
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Status"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["todo", "in-progress", "blocked", "done"]

                                                Button {
                                                    required property string modelData
                                                    text: root.formatEnumLabel(modelData)
                                                    enabled: !!projectControls.selectedProject
                                                             && projectControls.selectedProject.status !== modelData
                                                    onClicked: engineController.setPlanningProjectStatus(
                                                                   projectControls.selectedProject.id,
                                                                   modelData)
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    id: taskControls
                                    property var selectedTask: root.taskById(engineController.planningSelectedTaskId)
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 474

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Task Controls"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: taskControls.selectedTask
                                                  ? root.projectTitle(taskControls.selectedTask.projectId) + " | " + root.taskStateLabel(taskControls.selectedTask)
                                                  : "Select a task to edit details, checklist items, time, or ordering."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        TextField {
                                            Layout.fillWidth: true
                                            enabled: !!taskControls.selectedTask
                                            text: root.selectedTaskTitleDraft
                                            placeholderText: "Selected task title"
                                            onTextChanged: root.selectedTaskTitleDraft = text
                                            onAccepted: {
                                                if (!taskControls.selectedTask || text.trim().length === 0) {
                                                    return
                                                }

                                                engineController.updatePlanningTask(
                                                            taskControls.selectedTask.id,
                                                            root.selectedTaskTitleDraft.trim(),
                                                            root.selectedTaskDescriptionDraft,
                                                            root.selectedTaskPriorityDraft,
                                                            root.selectedTaskDueDateDraft,
                                                            root.selectedTaskLabelsDraft)
                                            }
                                        }

                                        TextArea {
                                            Layout.fillWidth: true
                                            Layout.preferredHeight: 72
                                            enabled: !!taskControls.selectedTask
                                            text: root.selectedTaskDescriptionDraft
                                            placeholderText: "Task description"
                                            wrapMode: TextEdit.Wrap
                                            onTextChanged: root.selectedTaskDescriptionDraft = text
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Priority"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["p0", "p1", "p2", "p3"]

                                                Button {
                                                    required property string modelData
                                                    text: modelData.toUpperCase()
                                                    enabled: !!taskControls.selectedTask
                                                    highlighted: root.selectedTaskPriorityDraft === modelData
                                                    onClicked: root.selectedTaskPriorityDraft = modelData
                                                }
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                Layout.fillWidth: true
                                                enabled: !!taskControls.selectedTask
                                                text: root.selectedTaskDueDateDraft
                                                placeholderText: "Due date YYYY-MM-DD"
                                                onTextChanged: root.selectedTaskDueDateDraft = text
                                            }

                                            TextField {
                                                Layout.fillWidth: true
                                                enabled: !!taskControls.selectedTask
                                                text: root.selectedTaskLabelsDraft
                                                placeholderText: "Labels: frontend, urgent"
                                                onTextChanged: root.selectedTaskLabelsDraft = text
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Save"
                                                enabled: !!taskControls.selectedTask
                                                         && root.selectedTaskTitleDraft.trim().length > 0
                                                         && (root.selectedTaskTitleDraft.trim() !== taskControls.selectedTask.title
                                                             || root.selectedTaskDescriptionDraft !== taskControls.selectedTask.description
                                                             || root.selectedTaskPriorityDraft !== taskControls.selectedTask.priority
                                                             || root.selectedTaskDueDateDraft !== (taskControls.selectedTask.dueDate ? taskControls.selectedTask.dueDate : "")
                                                             || root.selectedTaskLabelsDraft !== root.labelsToCsv(taskControls.selectedTask.labels))
                                                onClicked: engineController.updatePlanningTask(
                                                               taskControls.selectedTask.id,
                                                               root.selectedTaskTitleDraft.trim(),
                                                               root.selectedTaskDescriptionDraft,
                                                               root.selectedTaskPriorityDraft,
                                                               root.selectedTaskDueDateDraft,
                                                               root.selectedTaskLabelsDraft)
                                            }

                                            Button {
                                                text: "Delete"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.deletePlanningTask(taskControls.selectedTask.id)
                                            }

                                            Button {
                                                text: "Move Up"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.movePlanningTask(taskControls.selectedTask.id, "prev")
                                            }

                                            Button {
                                                text: "Move Down"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.movePlanningTask(taskControls.selectedTask.id, "next")
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Toggle Timer"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.togglePlanningTaskTimer(taskControls.selectedTask.id)
                                            }

                                            Button {
                                                text: "Toggle Complete"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.togglePlanningTaskComplete(taskControls.selectedTask.id)
                                            }

                                            Label {
                                                text: taskControls.selectedTask
                                                      ? root.checklistProgress(taskControls.selectedTask.checklist) + " | " + root.formatSeconds(taskControls.selectedTask.totalSeconds)
                                                      : ""
                                                color: "#b4c0cf"
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }
                                        }

                                        Label {
                                            visible: !!taskControls.selectedTask
                                            text: "Checklist"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }

                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            visible: !!taskControls.selectedTask
                                            spacing: 6

                                            Repeater {
                                                model: taskControls.selectedTask ? taskControls.selectedTask.checklist : []

                                                RowLayout {
                                                    required property var modelData
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        text: modelData.done ? "Done" : "Open"
                                                        highlighted: modelData.done
                                                        onClicked: engineController.setPlanningChecklistItemDone(
                                                                       taskControls.selectedTask.id,
                                                                       modelData.id,
                                                                       !modelData.done)
                                                    }

                                                    Label {
                                                        text: modelData.text
                                                        color: modelData.done ? "#8ea4c0" : "#f5f7fb"
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Button {
                                                        text: "Remove"
                                                        onClicked: engineController.deletePlanningChecklistItem(
                                                                       taskControls.selectedTask.id,
                                                                       modelData.id)
                                                    }
                                                }
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                TextField {
                                                    Layout.fillWidth: true
                                                    enabled: !!taskControls.selectedTask
                                                    text: root.selectedChecklistItemDraft
                                                    placeholderText: "+ Add checklist item"
                                                    onTextChanged: root.selectedChecklistItemDraft = text
                                                    onAccepted: {
                                                        if (!taskControls.selectedTask || text.trim().length === 0) {
                                                            return
                                                        }

                                                        engineController.addPlanningChecklistItem(
                                                                    taskControls.selectedTask.id,
                                                                    text.trim())
                                                    }
                                                }

                                                Button {
                                                    text: "Add"
                                                    enabled: !!taskControls.selectedTask
                                                             && root.selectedChecklistItemDraft.trim().length > 0
                                                    onClicked: engineController.addPlanningChecklistItem(
                                                                   taskControls.selectedTask.id,
                                                                   root.selectedChecklistItemDraft.trim())
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1180 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    id: projectOverview
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    property var selectedProjectTasks: projectOverview.selectedProject ? root.tasksForProject(projectOverview.selectedProject.id) : []
                                    property var checklistTotals: projectOverview.selectedProject ? root.checklistTotalsForProject(projectOverview.selectedProject.id) : ({ done: 0, total: 0 })
                                    property int completedTaskCount: projectOverview.selectedProject ? root.completedTaskCountForProject(projectOverview.selectedProject.id) : 0
                                    property int totalProjectSeconds: projectOverview.selectedProject ? root.totalSecondsForProject(projectOverview.selectedProject.id) : 0
                                    property real progressValue: projectOverview.selectedProject ? root.progressForProject(projectOverview.selectedProject.id) : 0
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 344

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selected Project Overview"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectOverview.selectedProject
                                                  ? projectOverview.selectedProject.title + " | " + root.formatEnumLabel(projectOverview.selectedProject.status) + " | " + projectOverview.selectedProject.priority.toUpperCase()
                                                  : "Select a project to inspect its task list, progress, and detail context."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProject.description.length > 0
                                            text: projectOverview.selectedProject ? projectOverview.selectedProject.description : ""
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8
                                            visible: !!projectOverview.selectedProject

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: tasksBadge.implicitWidth + 18

                                                Label {
                                                    id: tasksBadge
                                                    anchors.centerIn: parent
                                                    text: projectOverview.completedTaskCount + "/" + projectOverview.selectedProjectTasks.length + " tasks"
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: timeBadge.implicitWidth + 18

                                                Label {
                                                    id: timeBadge
                                                    anchors.centerIn: parent
                                                    text: "Time " + root.formatSeconds(projectOverview.totalProjectSeconds)
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: checklistBadge.implicitWidth + 18

                                                Label {
                                                    id: checklistBadge
                                                    anchors.centerIn: parent
                                                    text: projectOverview.checklistTotals.total > 0
                                                          ? projectOverview.checklistTotals.done + "/" + projectOverview.checklistTotals.total + " checklist"
                                                          : "No checklist"
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }
                                        }

                                        Rectangle {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length > 0
                                            Layout.fillWidth: true
                                            implicitHeight: 8
                                            radius: 999
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1

                                            Rectangle {
                                                width: parent.width * projectOverview.progressValue
                                                height: parent.height
                                                radius: 999
                                                color: "#2ba36a"
                                            }
                                        }

                                        Label {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length === 0
                                            text: "No tasks exist for the selected project yet."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length > 0

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 6

                                                Repeater {
                                                    model: projectOverview.selectedProjectTasks

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: root.isSelectedTask(modelData.id) ? "#143152" : "#0c1320"
                                                        border.color: root.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 86

                                                        TapHandler {
                                                            onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                                        }

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 4

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Label {
                                                                    text: modelData.title
                                                                    color: "#f5f7fb"
                                                                    font.pixelSize: 13
                                                                    font.weight: Font.DemiBold
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }

                                                                Button {
                                                                    text: modelData.completed ? "Reopen" : "Complete"
                                                                    onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                                }
                                                            }

                                                            Label {
                                                                text: root.taskStateLabel(modelData)
                                                                      + " | " + modelData.priority.toUpperCase()
                                                                      + (modelData.dueDate ? " | " + root.formatDueDate(modelData.dueDate) : "")
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                text: root.checklistProgress(modelData.checklist) + " | " + root.formatSeconds(modelData.totalSeconds)
                                                                color: "#b4c0cf"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                visible: modelData.labels && modelData.labels.length > 0
                                                                text: root.labelsToCsv(modelData.labels)
                                                                color: "#9bb0c9"
                                                                font.pixelSize: 11
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

                                Rectangle {
                                    id: projectActivity
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    property var activityItems: projectActivity.selectedProject ? root.activityForProject(projectActivity.selectedProject.id) : []
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 344

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selected Project Activity"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectActivity.selectedProject
                                                  ? "Recent project and task events scoped to " + projectActivity.selectedProject.title + "."
                                                  : "Select a project to review its recent activity trail."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: !!projectActivity.selectedProject && projectActivity.activityItems.length === 0
                                            text: "No matching activity entries found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true
                                            visible: !!projectActivity.selectedProject && projectActivity.activityItems.length > 0

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 6

                                                Repeater {
                                                    model: projectActivity.activityItems.slice(0, 8)

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: "#0c1320"
                                                        border.color: "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 74

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 4

                                                            Label {
                                                                text: root.activitySummary(modelData)
                                                                color: "#f5f7fb"
                                                                font.pixelSize: 13
                                                                font.weight: Font.DemiBold
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                text: modelData.detail
                                                                color: "#b4c0cf"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                text: root.formatTimestamp(modelData.timestamp)
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
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

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1180 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Projects"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Project order and status in the current planning view."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningProjectCount === 0
                                            text: "No imported projects found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(root.filteredPlanningProjects().length, 4)

                                            Rectangle {
                                                property var project: root.filteredPlanningProjects()[index]
                                                radius: 10
                                                color: root.isSelectedProject(project.id) ? "#143152" : "#0c1320"
                                                border.color: root.isSelectedProject(project.id) ? "#4da0ff" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 66

                                                TapHandler {
                                                    onTapped: engineController.selectPlanningProject(parent.project.id)
                                                }

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: project.title
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatEnumLabel(project.status) + " | " + project.priority.toUpperCase()
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Tasks"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Task timers, checklist progress, and project ownership now come from the engine snapshot."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningTaskCount === 0
                                            text: "No imported tasks found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.planningTasks.length, 4)

                                            Rectangle {
                                                property var task: engineController.planningTasks[index]
                                                radius: 10
                                                color: root.isSelectedTask(task.id) ? "#143152" : "#0c1320"
                                                border.color: root.isSelectedTask(task.id) ? "#4da0ff" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 76

                                                TapHandler {
                                                    onTapped: engineController.selectPlanningTask(parent.task.id)
                                                }

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: task.title
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.projectTitle(task.projectId) + " | " + root.taskStateLabel(task)
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.checklistProgress(task.checklist) + " | " + root.formatSeconds(task.totalSeconds)
                                                        color: "#b4c0cf"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Recent Activity"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Latest engine-owned task and project events."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningActivityLog.length === 0
                                            text: "No recent activity entries found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.planningActivityLog.length, 5)

                                            Rectangle {
                                                property var entry: engineController.planningActivityLog[index]
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 74

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: root.activitySummary(entry)
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: entry.detail
                                                        color: "#b4c0cf"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatTimestamp(entry.timestamp)
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
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

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "lighting"
                                columns: root.width >= 1600 ? 4 : root.width >= 1050 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 760

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label { text: "Fixtures"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Item { Layout.fillWidth: true }

                                            Button {
                                                text: "All On"
                                                enabled: engineController.lightingFixtureCount > 0
                                                onClicked: engineController.setLightingAllPower(true)
                                            }

                                            SafetyHoldButton {
                                                text: "All Off"
                                                delay: 2000
                                                enabled: engineController.lightingFixtureCount > 0
                                                onActivated: engineController.setLightingAllPower(false)
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                Layout.fillWidth: true
                                                placeholderText: "New fixture name"
                                                text: root.lightingNewFixtureNameDraft
                                                onTextChanged: root.lightingNewFixtureNameDraft = text
                                            }

                                            ComboBox {
                                                id: lightingNewFixtureTypeCombo
                                                Layout.preferredWidth: 210
                                                model: root.lightingFixtureTypeOptions()
                                                textRole: "name"
                                                currentIndex: root.lightingFixtureTypeIndex(root.lightingNewFixtureTypeDraft, model)
                                                onActivated: {
                                                    root.lightingNewFixtureTypeDraft = model[currentIndex].id
                                                    root.lightingNewFixtureDmxDraft = Math.min(
                                                        root.lightingNewFixtureDmxDraft,
                                                        root.lightingFixtureMaxStartAddress(root.lightingNewFixtureTypeDraft)
                                                    )
                                                }
                                            }

                                            SpinBox {
                                                Layout.preferredWidth: 104
                                                from: 1
                                                to: root.lightingFixtureMaxStartAddress(root.lightingNewFixtureTypeDraft)
                                                value: root.lightingNewFixtureDmxDraft
                                                editable: true
                                                onValueModified: root.lightingNewFixtureDmxDraft = value
                                            }

                                            ComboBox {
                                                id: lightingNewFixtureGroupCombo
                                                Layout.preferredWidth: 160
                                                model: root.lightingGroupOptions()
                                                textRole: "name"
                                                currentIndex: root.lightingGroupIndex(root.lightingNewFixtureGroupDraft, model)
                                                onActivated: root.lightingNewFixtureGroupDraft = model[currentIndex].id
                                            }

                                            Button {
                                                text: "Add"
                                                enabled: root.lightingNewFixtureNameDraft.trim().length > 0
                                                onClicked: {
                                                    engineController.createLightingFixture(
                                                        {
                                                            "name": root.lightingNewFixtureNameDraft.trim(),
                                                            "type": root.lightingNewFixtureTypeDraft,
                                                            "dmxStartAddress": root.lightingNewFixtureDmxDraft,
                                                            "groupId": root.lightingNewFixtureGroupDraft.length > 0
                                                                       ? root.lightingNewFixtureGroupDraft
                                                                       : null
                                                        }
                                                    )
                                                    root.lightingNewFixtureNameDraft = ""
                                                }
                                            }
                                        }

                                        Label {
                                            visible: engineController.lightingFixtureCount === 0
                                            text: "No fixtures are exposed by the native editor state."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingFixtures

                                            Rectangle {
                                                id: fixtureCard
                                                required property var modelData
                                                property var groupOptions: root.lightingGroupOptions()
                                                property var typeOptions: root.lightingFixtureTypeOptions()
                                                property bool spatialSelected: engineController.lightingSelectedFixtureId === modelData.id
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: spatialSelected ? "#6aa9ff" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: modelData.effect ? 352 : 318

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 6

                                                    Label {
                                                        text: modelData.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: root.lightingFixtureTypeName(modelData.type)
                                                              + " | DMX "
                                                              + modelData.dmxStartAddress
                                                              + " | "
                                                              + root.lightingGroupName(modelData.groupId)
                                                              + " | "
                                                              + root.lightingEffectName(modelData.effect)
                                                              + " | " + modelData.id
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        TextField {
                                                            id: fixtureNameField
                                                            Layout.fillWidth: true
                                                            text: modelData.name
                                                        }

                                                        ComboBox {
                                                            id: fixtureTypeCombo
                                                            Layout.preferredWidth: 190
                                                            model: fixtureCard.typeOptions
                                                            textRole: "name"
                                                            currentIndex: root.lightingFixtureTypeIndex(modelData.type, model)
                                                        }

                                                        SpinBox {
                                                            id: fixtureDmxSpin
                                                            Layout.preferredWidth: 100
                                                            from: 1
                                                            to: root.lightingFixtureMaxStartAddress(
                                                                    fixtureCard.typeOptions[fixtureTypeCombo.currentIndex].id
                                                                )
                                                            value: modelData.dmxStartAddress
                                                            editable: true
                                                        }

                                                        ComboBox {
                                                            id: fixtureGroupCombo
                                                            Layout.preferredWidth: 150
                                                            model: fixtureCard.groupOptions
                                                            textRole: "name"
                                                            currentIndex: root.lightingGroupIndex(modelData.groupId, model)
                                                        }

                                                        Button {
                                                            text: "Save"
                                                            enabled: fixtureNameField.text.trim().length > 0
                                                            onClicked: {
                                                                const selectedType = fixtureCard.typeOptions[fixtureTypeCombo.currentIndex]
                                                                const selectedGroup = fixtureCard.groupOptions[fixtureGroupCombo.currentIndex]
                                                                engineController.updateLightingFixture(
                                                                    modelData.id,
                                                                    {
                                                                        "name": fixtureNameField.text.trim(),
                                                                        "type": selectedType.id,
                                                                        "dmxStartAddress": fixtureDmxSpin.value,
                                                                        "groupId": selectedGroup.id.length > 0 ? selectedGroup.id : null
                                                                    }
                                                                )
                                                            }
                                                        }

                                                        Button {
                                                            text: "Delete"
                                                            onClicked: engineController.deleteLightingFixture(modelData.id)
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Label {
                                                            text: "State "
                                                                  + (modelData.on ? "On" : "Off")
                                                                  + " | Intensity "
                                                                  + modelData.intensity
                                                                  + "% | CCT "
                                                                  + modelData.cct
                                                                  + "K"
                                                            color: modelData.on ? "#6fd3a8" : "#b4c0cf"
                                                            font.pixelSize: 11
                                                            Layout.fillWidth: true
                                                        }

                                                        Button {
                                                            text: modelData.on ? "Turn Off" : "Turn On"
                                                            onClicked: engineController.updateLightingFixture(
                                                                           modelData.id,
                                                                           { "on": !modelData.on }
                                                                       )
                                                        }

                                                        Button {
                                                            text: spatialSelected ? "Spatial Selected" : "Edit Spatial"
                                                            enabled: !spatialSelected
                                                            onClicked: engineController.updateLightingSettings(
                                                                           { "selectedFixtureId": modelData.id }
                                                                       )
                                                        }
                                                    }

                                                    Label {
                                                        text: "Intensity"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                    }

                                                    Slider {
                                                        Layout.fillWidth: true
                                                        from: 0
                                                        to: 100
                                                        stepSize: 1
                                                        value: modelData.intensity
                                                        onPressedChanged: {
                                                            if (!pressed) {
                                                                engineController.updateLightingFixture(
                                                                    modelData.id,
                                                                    { "intensity": Math.round(value) }
                                                                )
                                                            }
                                                        }
                                                    }

                                                    Label {
                                                        text: "CCT"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                    }

                                                    Slider {
                                                        Layout.fillWidth: true
                                                        from: root.lightingFixtureMinCct(modelData.type)
                                                        to: root.lightingFixtureMaxCct(modelData.type)
                                                        stepSize: 100
                                                        value: modelData.cct
                                                        onPressedChanged: {
                                                            if (!pressed) {
                                                                engineController.updateLightingFixture(
                                                                    modelData.id,
                                                                    {
                                                                        "cct": Math.round(value / 100) * 100
                                                                    }
                                                                )
                                                            }
                                                        }
                                                    }

                                                    Label {
                                                        text: root.lightingFixtureTypeChannels(modelData.type) + " channels"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                    }

                                                    ColumnLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 4

                                                        Label {
                                                            text: "Effects"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 10
                                                        }

                                                        RowLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 6

                                                            Repeater {
                                                                model: root.lightingEffectOptions()

                                                                Button {
                                                                    required property var modelData
                                                                    text: modelData.name
                                                                    highlighted: !!fixtureCard.modelData.effect
                                                                                 && fixtureCard.modelData.effect.type === modelData.id
                                                                    onClicked: {
                                                                        const currentEffect = fixtureCard.modelData.effect
                                                                        const isActive = currentEffect && currentEffect.type === modelData.id
                                                                        engineController.updateLightingFixture(
                                                                            fixtureCard.modelData.id,
                                                                            {
                                                                                "effect": isActive
                                                                                          ? null
                                                                                          : {
                                                                                                "type": modelData.id,
                                                                                                "speed": currentEffect ? currentEffect.speed : 5
                                                                                            }
                                                                            }
                                                                        )
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        RowLayout {
                                                            Layout.fillWidth: true
                                                            visible: !!fixtureCard.modelData.effect
                                                            spacing: 8

                                                            Label {
                                                                text: "Speed"
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 10
                                                            }

                                                            Slider {
                                                                Layout.fillWidth: true
                                                                from: 1
                                                                to: 10
                                                                stepSize: 1
                                                                value: fixtureCard.modelData.effect ? fixtureCard.modelData.effect.speed : 5
                                                                onPressedChanged: {
                                                                    if (!pressed && fixtureCard.modelData.effect) {
                                                                        engineController.updateLightingFixture(
                                                                            fixtureCard.modelData.id,
                                                                            {
                                                                                "effect": {
                                                                                    "type": fixtureCard.modelData.effect.type,
                                                                                    "speed": Math.round(value)
                                                                                }
                                                                            }
                                                                        )
                                                                    }
                                                                }
                                                            }

                                                            Label {
                                                                text: fixtureCard.modelData.effect
                                                                      ? fixtureCard.modelData.effect.speed
                                                                      : "5"
                                                                color: "#b4c0cf"
                                                                font.pixelSize: 10
                                                            }
                                                        }
                                                    }

                                                    Label {
                                                        text: "Spatial "
                                                              + ((modelData.spatialX === undefined || modelData.spatialX === null
                                                                   || modelData.spatialY === undefined || modelData.spatialY === null)
                                                                  ? "auto"
                                                                  : Math.round(modelData.spatialX * 100)
                                                                    + "% / "
                                                                    + Math.round(modelData.spatialY * 100)
                                                                    + "%")
                                                              + " | Rot "
                                                              + Math.round(modelData.spatialRotation || 0)
                                                              + "deg"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 620

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Spatial Layout"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            ComboBox {
                                                id: lightingSpatialFixtureCombo
                                                Layout.fillWidth: true
                                                model: root.lightingFixtureOptions()
                                                textRole: "name"
                                                currentIndex: root.lightingFixtureIndex(
                                                                  engineController.lightingSelectedFixtureId,
                                                                  model
                                                              )
                                                onActivated: {
                                                    const selectedFixture = model[currentIndex]
                                                    engineController.updateLightingSettings(
                                                        {
                                                            "selectedFixtureId": selectedFixture.id.length > 0
                                                                                 ? selectedFixture.id
                                                                                 : null
                                                        }
                                                    )
                                                }
                                            }

                                            Button {
                                                text: "Select First Unplaced"
                                                enabled: root.lightingFirstUnplacedFixtureId().length > 0
                                                onClicked: engineController.updateLightingSettings(
                                                               {
                                                                   "selectedFixtureId": root.lightingFirstUnplacedFixtureId()
                                                               }
                                                           )
                                            }
                                        }

                                        Rectangle {
                                            property var selectedFixture: root.lightingFixtureById(engineController.lightingSelectedFixtureId)
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: 236

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 6

                                                Label {
                                                    text: parent.parent.selectedFixture
                                                          ? parent.parent.selectedFixture.name
                                                          : "No fixture selected"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                }

                                                Label {
                                                    text: parent.parent.selectedFixture
                                                          ? parent.parent.selectedFixture.id
                                                            + " | "
                                                            + root.formatEnumLabel(parent.parent.selectedFixture.kind)
                                                          : "Choose a fixture to edit layout state."
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WrapAnywhere
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    visible: !!parent.parent.selectedFixture
                                                    text: (parent.parent.selectedFixture
                                                           && parent.parent.selectedFixture.spatialX !== undefined
                                                           && parent.parent.selectedFixture.spatialX !== null
                                                           && parent.parent.selectedFixture.spatialY !== undefined
                                                           && parent.parent.selectedFixture.spatialY !== null)
                                                          ? "Manual layout active"
                                                          : "Auto layout active until a position is saved"
                                                    color: parent.parent.selectedFixture ? "#6fd3a8" : "#b4c0cf"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    text: "X"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                }

                                                Slider {
                                                    Layout.fillWidth: true
                                                    enabled: !!parent.parent.selectedFixture
                                                    from: 0
                                                    to: 100
                                                    stepSize: 1
                                                    value: root.lightingSpatialPercent(
                                                               parent.parent.selectedFixture
                                                               ? parent.parent.selectedFixture.spatialX
                                                               : null,
                                                               50
                                                           )
                                                    onPressedChanged: {
                                                        if (!pressed && parent.parent.selectedFixture) {
                                                            engineController.updateLightingFixture(
                                                                parent.parent.selectedFixture.id,
                                                                { "spatialX": value / 100 }
                                                            )
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: "Y"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                }

                                                Slider {
                                                    Layout.fillWidth: true
                                                    enabled: !!parent.parent.selectedFixture
                                                    from: 0
                                                    to: 100
                                                    stepSize: 1
                                                    value: root.lightingSpatialPercent(
                                                               parent.parent.selectedFixture
                                                               ? parent.parent.selectedFixture.spatialY
                                                               : null,
                                                               50
                                                           )
                                                    onPressedChanged: {
                                                        if (!pressed && parent.parent.selectedFixture) {
                                                            engineController.updateLightingFixture(
                                                                parent.parent.selectedFixture.id,
                                                                { "spatialY": value / 100 }
                                                            )
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: "Rotation"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                }

                                                Slider {
                                                    Layout.fillWidth: true
                                                    enabled: !!parent.parent.selectedFixture
                                                    from: 0
                                                    to: 359
                                                    stepSize: 1
                                                    value: root.lightingSpatialRotation(
                                                               parent.parent.selectedFixture
                                                               ? parent.parent.selectedFixture.spatialRotation
                                                               : 0
                                                           )
                                                    onPressedChanged: {
                                                        if (!pressed && parent.parent.selectedFixture) {
                                                            engineController.updateLightingFixture(
                                                                parent.parent.selectedFixture.id,
                                                                { "spatialRotation": Math.round(value) }
                                                            )
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        text: "Center"
                                                        enabled: !!parent.parent.selectedFixture
                                                        onClicked: engineController.updateLightingFixture(
                                                                       parent.parent.selectedFixture.id,
                                                                       {
                                                                           "spatialX": 0.5,
                                                                           "spatialY": 0.5
                                                                       }
                                                                   )
                                                    }

                                                    Button {
                                                        text: "Reset Auto"
                                                        enabled: !!parent.parent.selectedFixture
                                                        onClicked: engineController.updateLightingFixture(
                                                                       parent.parent.selectedFixture.id,
                                                                       {
                                                                           "spatialX": null,
                                                                           "spatialY": null,
                                                                           "spatialRotation": 0
                                                                       }
                                                                   )
                                                    }
                                                }
                                            }
                                        }

                                        Rectangle {
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: 312

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 8

                                                Label {
                                                    text: "Markers"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                }

                                                Repeater {
                                                    model: [
                                                        {
                                                            "label": "Camera",
                                                            "key": "cameraMarker",
                                                            "marker": engineController.lightingCameraMarker,
                                                            "defaultX": 0.5,
                                                            "defaultY": 0.84
                                                        },
                                                        {
                                                            "label": "Subject",
                                                            "key": "subjectMarker",
                                                            "marker": engineController.lightingSubjectMarker,
                                                            "defaultX": 0.5,
                                                            "defaultY": 0.46
                                                        }
                                                    ]

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 8
                                                        color: "#111a28"
                                                        border.color: "#203247"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: root.lightingHasMarker(modelData.marker) ? 138 : 44

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 8
                                                            spacing: 6

                                                            RowLayout {
                                                                Layout.fillWidth: true

                                                                Label {
                                                                    text: modelData.label
                                                                          + (root.lightingHasMarker(modelData.marker)
                                                                             ? " marker active"
                                                                             : " marker hidden")
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 11
                                                                    Layout.fillWidth: true
                                                                }

                                                                Button {
                                                                    text: root.lightingHasMarker(modelData.marker)
                                                                          ? "Hide"
                                                                          : "Show"
                                                                    onClicked: {
                                                                        if (root.lightingHasMarker(modelData.marker)) {
                                                                            engineController.updateLightingSettings(
                                                                                root.lightingMarkerPayload(modelData.key, null)
                                                                            )
                                                                        } else {
                                                                            engineController.updateLightingSettings(
                                                                                root.lightingMarkerPayload(
                                                                                    modelData.key,
                                                                                    {
                                                                                        "x": modelData.defaultX,
                                                                                        "y": modelData.defaultY,
                                                                                        "rotation": 0
                                                                                    }
                                                                                )
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            ColumnLayout {
                                                                visible: root.lightingHasMarker(modelData.marker)
                                                                spacing: 4
                                                                Layout.fillWidth: true

                                                                Label { text: "X"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Slider {
                                                                    Layout.fillWidth: true
                                                                    from: 0
                                                                    to: 100
                                                                    stepSize: 1
                                                                    value: root.lightingMarkerPercent(modelData.marker, "x", modelData.defaultX * 100)
                                                                    onPressedChanged: {
                                                                        if (!pressed && root.lightingHasMarker(modelData.marker)) {
                                                                            engineController.updateLightingSettings(
                                                                                root.lightingMarkerPayload(
                                                                                    modelData.key,
                                                                                    {
                                                                                        "x": value / 100,
                                                                                        "y": modelData.marker.y,
                                                                                        "rotation": modelData.marker.rotation
                                                                                    }
                                                                                )
                                                                            )
                                                                        }
                                                                    }
                                                                }

                                                                Label { text: "Y"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Slider {
                                                                    Layout.fillWidth: true
                                                                    from: 0
                                                                    to: 100
                                                                    stepSize: 1
                                                                    value: root.lightingMarkerPercent(modelData.marker, "y", modelData.defaultY * 100)
                                                                    onPressedChanged: {
                                                                        if (!pressed && root.lightingHasMarker(modelData.marker)) {
                                                                            engineController.updateLightingSettings(
                                                                                root.lightingMarkerPayload(
                                                                                    modelData.key,
                                                                                    {
                                                                                        "x": modelData.marker.x,
                                                                                        "y": value / 100,
                                                                                        "rotation": modelData.marker.rotation
                                                                                    }
                                                                                )
                                                                            )
                                                                        }
                                                                    }
                                                                }

                                                                Label { text: "Rotation"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Slider {
                                                                    Layout.fillWidth: true
                                                                    from: 0
                                                                    to: 359
                                                                    stepSize: 1
                                                                    value: root.lightingMarkerRotation(modelData.marker)
                                                                    onPressedChanged: {
                                                                        if (!pressed && root.lightingHasMarker(modelData.marker)) {
                                                                            engineController.updateLightingSettings(
                                                                                root.lightingMarkerPayload(
                                                                                    modelData.key,
                                                                                    {
                                                                                        "x": modelData.marker.x,
                                                                                        "y": modelData.marker.y,
                                                                                        "rotation": Math.round(value)
                                                                                    }
                                                                                )
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 560

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Groups"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                Layout.fillWidth: true
                                                placeholderText: "New group name"
                                                text: root.lightingNewGroupNameDraft
                                                onTextChanged: root.lightingNewGroupNameDraft = text
                                            }

                                            Button {
                                                text: "Add"
                                                enabled: root.lightingNewGroupNameDraft.trim().length > 0
                                                onClicked: {
                                                    engineController.createLightingGroup(root.lightingNewGroupNameDraft.trim())
                                                    root.lightingNewGroupNameDraft = ""
                                                }
                                            }
                                        }

                                        Label {
                                            visible: engineController.lightingGroupCount === 0
                                            text: "No lighting groups are exposed by the native editor state."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingGroups

                                            Rectangle {
                                                required property var modelData
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 136

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 6

                                                    Label {
                                                        text: modelData.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: modelData.id + " | " + modelData.fixtureCount + " fixtures"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        TextField {
                                                            id: groupNameField
                                                            Layout.fillWidth: true
                                                            placeholderText: "Rename " + modelData.name
                                                        }

                                                        Button {
                                                            text: "Rename"
                                                            enabled: groupNameField.text.trim().length > 0
                                                            onClicked: {
                                                                engineController.updateLightingGroup(
                                                                    modelData.id,
                                                                    { "name": groupNameField.text.trim() }
                                                                )
                                                                groupNameField.text = ""
                                                            }
                                                        }

                                                        Button {
                                                            text: "Delete"
                                                            onClicked: engineController.deleteLightingGroup(modelData.id)
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Button {
                                                            text: "All On"
                                                            onClicked: engineController.setLightingGroupPower(modelData.id, true)
                                                        }

                                                        Button {
                                                            text: "All Off"
                                                            onClicked: engineController.setLightingGroupPower(modelData.id, false)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 224

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label {
                                                text: "Scenes"
                                                color: "#8ea4c0"
                                                font.pixelSize: 12
                                            }

                                            Item { Layout.fillWidth: true }

                                            Button {
                                                text: "Refresh"
                                                onClicked: engineController.requestLightingSnapshot()
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                Layout.fillWidth: true
                                                placeholderText: "New scene name"
                                                text: root.lightingNewSceneNameDraft
                                                onTextChanged: root.lightingNewSceneNameDraft = text
                                            }

                                            Button {
                                                text: "Save"
                                                enabled: root.lightingNewSceneNameDraft.trim().length > 0
                                                onClicked: {
                                                    engineController.createLightingScene(root.lightingNewSceneNameDraft.trim())
                                                    root.lightingNewSceneNameDraft = ""
                                                }
                                            }
                                        }

                                        Label {
                                            visible: engineController.lightingSceneCount === 0
                                            text: "No lighting scenes are exposed by the native editor state."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingScenes

                                            Rectangle {
                                                required property var modelData
                                                property bool sceneSelected: engineController.lightingSelectedSceneId === modelData.id
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: sceneSelected ? "#4b7bc0" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 168

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 6

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        ColumnLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 2

                                                            Label {
                                                                text: modelData.name
                                                                color: "#f5f7fb"
                                                                font.pixelSize: 12
                                                                font.weight: Font.DemiBold
                                                            }

                                                            Label {
                                                                text: modelData.id
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WrapAnywhere
                                                                Layout.fillWidth: true
                                                            }
                                                        }

                                                        Button {
                                                            text: sceneSelected ? "Selected" : "Select"
                                                            enabled: !sceneSelected
                                                            onClicked: engineController.updateLightingSettings(
                                                                           { "selectedSceneId": modelData.id }
                                                                       )
                                                        }

                                                        Button {
                                                            text: "Recall"
                                                            onClicked: engineController.recallLightingScene(modelData.id)
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        TextField {
                                                            id: sceneNameField
                                                            Layout.fillWidth: true
                                                            placeholderText: "Rename " + modelData.name
                                                        }

                                                        Button {
                                                            text: "Rename"
                                                            enabled: sceneNameField.text.trim().length > 0
                                                            onClicked: {
                                                                engineController.updateLightingScene(
                                                                    modelData.id,
                                                                    { "name": sceneNameField.text.trim() }
                                                                )
                                                                sceneNameField.text = ""
                                                            }
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Button {
                                                            text: "Capture"
                                                            onClicked: engineController.updateLightingScene(
                                                                           modelData.id,
                                                                           { "captureCurrentState": true }
                                                                       )
                                                        }

                                                        Button {
                                                            text: "Delete"
                                                            onClicked: engineController.deleteLightingScene(modelData.id)
                                                        }
                                                    }

                                                    Label {
                                                        visible: !!modelData.lastRecalled
                                                        text: modelData.lastRecalledAt
                                                              ? "Last recalled " + root.formatTimestamp(modelData.lastRecalledAt)
                                                              : "Last recalled by the native engine"
                                                        color: "#6fd3a8"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "audio"
                                columns: root.width >= 1320 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.columnSpan: root.width >= 1320 ? 3 : 1
                                    implicitHeight: controlSurfaceSetupLayout.implicitHeight + 24

                                    ColumnLayout {
                                        id: controlSurfaceSetupLayout
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 10

                                        RowLayout {
                                            Layout.fillWidth: true

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 2

                                                Label {
                                                    text: "Control Surface Setup"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 14
                                                    font.weight: Font.DemiBold
                                                }

                                                Label {
                                                    text: engineController.controlSurfaceSnapshotLoaded
                                                          ? "Companion pages, controls, and test targets are driven from the engine snapshot."
                                                          : "Control-surface snapshot is loading."
                                                    color: "#8ea4c0"
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }

                                            Button {
                                                text: "Refresh"
                                                onClicked: engineController.requestControlSurfaceSnapshot()
                                            }
                                        }

                                        Label {
                                            text: engineController.controlSurfaceBaseUrl.length > 0
                                                  ? "Base URL: " + engineController.controlSurfaceBaseUrl
                                                  : "Control-surface bridge URL unavailable."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Repeater {
                                                model: engineController.controlSurfacePages

                                                Button {
                                                    required property var modelData
                                                    text: modelData.label
                                                    highlighted: root.selectedControlSurfacePageId === modelData.id
                                                    onClicked: {
                                                        root.selectedControlSurfacePageId = modelData.id
                                                        const page = root.controlSurfacePageById(modelData.id)
                                                        const controls = OperatorParityHelpers.controlSurfacePageControls(page)
                                                        root.selectedControlSurfaceControlId = controls.length > 0 ? controls[0].id : ""
                                                    }
                                                }
                                            }
                                        }

                                        GridLayout {
                                            Layout.fillWidth: true
                                            columns: root.width >= 1320 ? 2 : 1
                                            columnSpacing: 12
                                            rowSpacing: 12

                                            Rectangle {
                                                id: controlSurfacePageCard
                                                property var currentPage: root.controlSurfacePageById(root.selectedControlSurfacePageId)
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 260

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 8

                                                    Label {
                                                        text: controlSurfacePageCard.currentPage
                                                              ? controlSurfacePageCard.currentPage.label + " Page"
                                                              : "No page selected"
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    GridLayout {
                                                        Layout.fillWidth: true
                                                        columns: 4
                                                        columnSpacing: 8
                                                        rowSpacing: 8

                                                        Repeater {
                                                            model: controlSurfacePageCard.currentPage ? controlSurfacePageCard.currentPage.buttons : []

                                                            Button {
                                                                required property var modelData
                                                                text: modelData.label
                                                                highlighted: root.selectedControlSurfaceControlId === modelData.id
                                                                onClicked: root.selectedControlSurfaceControlId = modelData.id
                                                            }
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Repeater {
                                                            model: controlSurfacePageCard.currentPage
                                                                   ? controlSurfacePageCard.currentPage.dials.filter(function(control) { return control.type === "dial-press" })
                                                                   : []

                                                            Button {
                                                                required property var modelData
                                                                Layout.fillWidth: true
                                                                text: modelData.label
                                                                highlighted: root.selectedControlSurfaceControlId === modelData.id
                                                                onClicked: root.selectedControlSurfaceControlId = modelData.id
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            Rectangle {
                                                id: controlSurfaceControlCard
                                                property var selectedControl: root.controlSurfaceControlById(
                                                                 root.selectedControlSurfacePageId,
                                                                 root.selectedControlSurfaceControlId
                                                             )
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 260

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 8

                                                    Label {
                                                        text: controlSurfaceControlCard.selectedControl
                                                              ? controlSurfaceControlCard.selectedControl.label
                                                              : "Select a control"
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: controlSurfaceControlCard.selectedControl
                                                              ? controlSurfaceControlCard.selectedControl.description
                                                              : "Choose a button or dial to inspect its action."
                                                        color: "#d6dce5"
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: controlSurfaceControlCard.selectedControl && controlSurfaceControlCard.selectedControl.url
                                                              ? controlSurfaceControlCard.selectedControl.method + " " + controlSurfaceControlCard.selectedControl.url
                                                              : (controlSurfaceControlCard.selectedControl && controlSurfaceControlCard.selectedControl.pageNavTarget
                                                                 ? "Navigate to " + controlSurfaceControlCard.selectedControl.pageNavTarget
                                                                 : "No HTTP action")
                                                        color: "#8ea4c0"
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                        font.family: "monospace"
                                                    }

                                                    Label {
                                                        visible: controlSurfaceControlCard.selectedControl && controlSurfaceControlCard.selectedControl.lcdKey
                                                        text: controlSurfaceControlCard.selectedControl && controlSurfaceControlCard.selectedControl.lcdKey
                                                              ? "LCD key: " + controlSurfaceControlCard.selectedControl.lcdKey
                                                              : ""
                                                        color: "#8ea4c0"
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        visible: controlSurfaceControlCard.selectedControl
                                                                 && controlSurfaceControlCard.selectedControl.lcdRefreshKeys
                                                                 && controlSurfaceControlCard.selectedControl.lcdRefreshKeys.length > 0
                                                        text: controlSurfaceControlCard.selectedControl
                                                              && controlSurfaceControlCard.selectedControl.lcdRefreshKeys
                                                              && controlSurfaceControlCard.selectedControl.lcdRefreshKeys.length > 0
                                                              ? "Refresh keys: " + controlSurfaceControlCard.selectedControl.lcdRefreshKeys.join(", ")
                                                              : ""
                                                        color: "#8ea4c0"
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 520

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label { text: "Channels"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Item { Layout.fillWidth: true }

                                            ComboBox {
                                                Layout.preferredWidth: 180
                                                model: engineController.audioMixTargets
                                                textRole: "name"
                                                enabled: engineController.audioMixTargetCount > 0
                                                currentIndex: {
                                                    for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
                                                        if (engineController.audioMixTargets[index].id === root.selectedAudioMixTargetId) {
                                                            return index
                                                        }
                                                    }
                                                    return 0
                                                }
                                                onActivated: function(index) {
                                                    if (index >= 0 && index < engineController.audioMixTargets.length) {
                                                        root.selectedAudioMixTargetId = engineController.audioMixTargets[index].id
                                                        engineController.updateAudioSettings({
                                                                                             "selectedMixTargetId": root.selectedAudioMixTargetId
                                                                                         })
                                                    }
                                                }
                                            }
                                        }

                                        Label {
                                            visible: engineController.audioChannelCount === 0
                                            text: "No channels are exposed by the current audio backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Rectangle {
                                            id: selectedAudioChannelCard
                                            property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                            visible: selectedAudioChannelCard.selectedChannel !== null
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#4b7bc0"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel) ? 220 : 182

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 8

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    ColumnLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 2

                                                        Label {
                                                            text: selectedAudioChannelCard.selectedChannel ? selectedAudioChannelCard.selectedChannel.name : ""
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 12
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: selectedAudioChannelCard.selectedChannel
                                                                  ? root.audioRoleLabel(selectedAudioChannelCard.selectedChannel.role)
                                                                    + " | "
                                                                    + (selectedAudioChannelCard.selectedChannel.stereo ? "Stereo pair" : "Mono input")
                                                                    + " | Send "
                                                                    + root.audioLevelLabel(root.audioChannelSendLevel(selectedAudioChannelCard.selectedChannel, root.selectedAudioMixTargetId))
                                                                  : ""
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }

                                                    Rectangle {
                                                        radius: 9
                                                        color: "#152236"
                                                        border.color: "#2a3b55"
                                                        border.width: 1
                                                        implicitWidth: 74
                                                        implicitHeight: 28

                                                        Label {
                                                            anchors.centerIn: parent
                                                            text: "Selected"
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 10
                                                            font.weight: Font.DemiBold
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: selectedAudioChannelCard.selectedChannel
                                                          ? "Current mix: "
                                                            + (root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                               ? root.audioMixTargetById(root.selectedAudioMixTargetId).name
                                                               : "Main Out")
                                                          : ""
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Slider {
                                                    visible: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel)
                                                    Layout.fillWidth: true
                                                    from: 0
                                                    to: 75
                                                    stepSize: 1
                                                    enabled: engineController.operatorUiReady
                                                    value: selectedAudioChannelCard.selectedChannel ? selectedAudioChannelCard.selectedChannel.gain : 0
                                                    onPressedChanged: {
                                                        if (!pressed && selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "gain": Math.round(value) }
                                                            )
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel)
                                                    text: selectedAudioChannelCard.selectedChannel ? "Preamp gain +" + Math.round(selectedAudioChannelCard.selectedChannel.gain) + " dB" : ""
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        visible: selectedAudioChannelCard.selectedChannel !== null
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.mute ? "Muted" : "Mute"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "mute": !selectedAudioChannelCard.selectedChannel.mute }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: selectedAudioChannelCard.selectedChannel !== null
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.solo ? "Soloed" : "Solo"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "solo": !selectedAudioChannelCard.selectedChannel.solo }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsPhase(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.phase ? "Phase On" : "Phase"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "phase": !selectedAudioChannelCard.selectedChannel.phase }
                                                            )
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    visible: root.audioChannelSupportsPhantom(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsPad(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsInstrument(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsAutoSet(selectedAudioChannelCard.selectedChannel)
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    SafetyHoldButton {
                                                        visible: root.audioChannelSupportsPhantom(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.phantom ? "48V On" : "48V"
                                                        delay: 900
                                                        Layout.fillWidth: true
                                                        onActivated: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "phantom": !selectedAudioChannelCard.selectedChannel.phantom }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsPad(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.pad ? "Pad On" : "Pad"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "pad": !selectedAudioChannelCard.selectedChannel.pad }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsInstrument(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.instrument ? "Inst On" : "Inst"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "instrument": !selectedAudioChannelCard.selectedChannel.instrument }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsAutoSet(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.autoSet ? "AutoSet On" : "AutoSet"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "autoSet": !selectedAudioChannelCard.selectedChannel.autoSet }
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 10

                                                Repeater {
                                                    model: [
                                                        { "role": "front-preamp", "title": "Front Preamps 9-12", "note": "Hold the 48V button deliberately when the live input path changes." },
                                                        { "role": "rear-line", "title": "Rear Line Inputs 1-8", "note": "Fixed line path for utility returns and non-preamp sources." },
                                                        { "role": "playback-pair", "title": "Software Playback", "note": "Stereo program returns always feed the currently selected output mix." }
                                                    ]

                                                    Rectangle {
                                                        property var sectionData: modelData
                                                        radius: 10
                                                        color: "#0c1320"
                                                        border.color: "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: sectionLayout.implicitHeight + 20

                                                        ColumnLayout {
                                                            id: sectionLayout
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 8

                                                            Label {
                                                                text: sectionData.title
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                font.weight: Font.DemiBold
                                                            }

                                                            Label {
                                                                text: sectionData.role === "front-preamp"
                                                                      ? "Primary live inputs feeding " + (root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                                                                         ? root.audioMixLabel(root.audioMixTargetById(root.selectedAudioMixTargetId))
                                                                                                         : "Main Monitors")
                                                                      : sectionData.role === "rear-line"
                                                                        ? "Secondary line sources and utility returns."
                                                                        : "DAW returns and program feeds."
                                                                color: "#f5f7fb"
                                                                font.pixelSize: 12
                                                                font.weight: Font.DemiBold
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                text: sectionData.note
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 10
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Repeater {
                                                                model: root.audioChannelsByRole(sectionData.role)

                                                                Rectangle {
                                                                    property var channelData: modelData
                                                                    radius: 10
                                                                    color: channelData.id === root.selectedAudioChannelId ? "#14233a" : "#101826"
                                                                    border.color: channelData.id === root.selectedAudioChannelId ? "#4b7bc0" : "#24344a"
                                                                    border.width: 1
                                                                    Layout.fillWidth: true
                                                                    implicitHeight: 128

                                                                    ColumnLayout {
                                                                        anchors.fill: parent
                                                                        anchors.margins: 10
                                                                        spacing: 8

                                                                        RowLayout {
                                                                            Layout.fillWidth: true
                                                                            spacing: 8

                                                                            ColumnLayout {
                                                                                Layout.fillWidth: true
                                                                                spacing: 2

                                                                                Label {
                                                                                    text: channelData.name
                                                                                    color: "#f5f7fb"
                                                                                    font.pixelSize: 12
                                                                                    font.weight: Font.DemiBold
                                                                                }

                                                                                Label {
                                                                                    text: root.audioRoleLabel(channelData.role)
                                                                                          + " | Send "
                                                                                          + root.audioLevelLabel(root.audioChannelSendLevel(channelData, root.selectedAudioMixTargetId))
                                                                                    color: "#8ea4c0"
                                                                                    font.pixelSize: 11
                                                                                    wrapMode: Text.WordWrap
                                                                                    Layout.fillWidth: true
                                                                                }
                                                                            }

                                                                            ColumnLayout {
                                                                                spacing: 2

                                                                                Label {
                                                                                    visible: channelData.clip
                                                                                    text: "OVR"
                                                                                    color: "#f87171"
                                                                                    font.pixelSize: 10
                                                                                    font.weight: Font.DemiBold
                                                                                }

                                                                                Label {
                                                                                    visible: !channelData.clip && channelData.meterLevel > 0.02
                                                                                    text: "Signal"
                                                                                    color: "#6fd3a8"
                                                                                    font.pixelSize: 10
                                                                                    font.weight: Font.DemiBold
                                                                                }
                                                                            }

                                                                            Rectangle {
                                                                                radius: 9
                                                                                color: "#152236"
                                                                                border.color: "#2a3b55"
                                                                                border.width: 1
                                                                                implicitWidth: 54
                                                                                implicitHeight: 28

                                                                                Label {
                                                                                    anchors.centerIn: parent
                                                                                    text: channelData.shortName
                                                                                    color: "#d7e2f0"
                                                                                    font.pixelSize: 10
                                                                                    font.weight: Font.DemiBold
                                                                                }
                                                                            }

                                                                            Button {
                                                                                text: channelData.id === root.selectedAudioChannelId ? "Selected" : "Focus"
                                                                                onClicked: {
                                                                                    root.selectedAudioChannelId = channelData.id
                                                                                    engineController.updateAudioSettings({
                                                                                                                         "selectedChannelId": channelData.id
                                                                                                                     })
                                                                                }
                                                                            }
                                                                        }

                                                                        Slider {
                                                                            Layout.fillWidth: true
                                                                            from: 0
                                                                            to: 1
                                                                            stepSize: 0.01
                                                                            enabled: engineController.operatorUiReady && root.selectedAudioMixTargetId.length > 0
                                                                            value: root.audioChannelSendLevel(channelData, root.selectedAudioMixTargetId)
                                                                            onPressedChanged: {
                                                                                if (!pressed && root.selectedAudioMixTargetId.length > 0) {
                                                                                    root.selectedAudioChannelId = channelData.id
                                                                                    engineController.updateAudioSettings({
                                                                                                                         "selectedChannelId": channelData.id
                                                                                                                     })
                                                                                    engineController.updateAudioChannel(
                                                                                        channelData.id,
                                                                                        {
                                                                                            "fader": value,
                                                                                            "mixTargetId": root.selectedAudioMixTargetId
                                                                                        }
                                                                                    )
                                                                                }
                                                                            }
                                                                        }

                                                                        RowLayout {
                                                                            Layout.fillWidth: true
                                                                            spacing: 8

                                                                            Button {
                                                                                text: channelData.mute ? "Muted" : "Mute"
                                                                                Layout.fillWidth: true
                                                                                onClicked: {
                                                                                    root.selectedAudioChannelId = channelData.id
                                                                                    engineController.updateAudioSettings({
                                                                                                                         "selectedChannelId": channelData.id
                                                                                                                     })
                                                                                    engineController.updateAudioChannel(
                                                                                        channelData.id,
                                                                                        { "mute": !channelData.mute }
                                                                                    )
                                                                                }
                                                                            }

                                                                            Button {
                                                                                text: channelData.solo ? "Soloed" : "Solo"
                                                                                Layout.fillWidth: true
                                                                                onClicked: {
                                                                                    root.selectedAudioChannelId = channelData.id
                                                                                    engineController.updateAudioSettings({
                                                                                                                         "selectedChannelId": channelData.id
                                                                                                                     })
                                                                                    engineController.updateAudioChannel(
                                                                                        channelData.id,
                                                                                        { "solo": !channelData.solo }
                                                                                    )
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 420

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            spacing: 2

                                            Label { text: "Control Room"; color: "#8ea4c0"; font.pixelSize: 12 }
                                            Label {
                                                text: "Select the destination mix before touching strip sends."
                                                color: "#f5f7fb"
                                                font.pixelSize: 12
                                                font.weight: Font.DemiBold
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }
                                            Label {
                                                text: "Changing the active mix swaps the send layer shown on every source strip."
                                                color: "#8ea4c0"
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }
                                        }

                                        Label {
                                            visible: engineController.audioMixTargetCount === 0
                                            text: "No mix targets are exposed by the current audio backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 8

                                                Repeater {
                                                    model: engineController.audioMixTargets

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: modelData.id === root.selectedAudioMixTargetId ? "#14233a" : "#0c1320"
                                                        border.color: modelData.id === root.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: modelData.role === "main-out" ? 150 : 118

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 8

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    Layout.fillWidth: true
                                                                    text: modelData.name + " | " + root.audioLevelLabel(modelData.volume)
                                                                    onClicked: {
                                                                        root.selectedAudioMixTargetId = modelData.id
                                                                        engineController.updateAudioSettings({
                                                                                                             "selectedMixTargetId": modelData.id
                                                                                                         })
                                                                    }
                                                                }

                                                                Rectangle {
                                                                    radius: 9
                                                                    color: "#152236"
                                                                    border.color: "#2a3b55"
                                                                    border.width: 1
                                                                    implicitWidth: 54
                                                                    implicitHeight: 28

                                                                    Label {
                                                                        anchors.centerIn: parent
                                                                        text: modelData.shortName
                                                                        color: "#d7e2f0"
                                                                        font.pixelSize: 10
                                                                        font.weight: Font.DemiBold
                                                                    }
                                                                }
                                                            }

                                                            Label {
                                                                text: root.audioRoleLabel(modelData.role)
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Slider {
                                                                Layout.fillWidth: true
                                                                from: 0
                                                                to: 1
                                                                stepSize: 0.01
                                                                enabled: engineController.operatorUiReady
                                                                value: modelData.volume
                                                                onPressedChanged: {
                                                                    if (!pressed) {
                                                                        engineController.updateAudioMixTarget(
                                                                            modelData.id,
                                                                            { "volume": value }
                                                                        )
                                                                    }
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    text: modelData.mute ? "Muted" : "Mute"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "mute": !modelData.mute }
                                                                    )
                                                                }

                                                                Button {
                                                                    visible: modelData.role === "main-out"
                                                                    text: modelData.dim ? "Dim On" : "Dim"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "dim": !modelData.dim }
                                                                    )
                                                                }
                                                            }

                                                            RowLayout {
                                                                visible: modelData.role === "main-out"
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    text: modelData.mono ? "Mono On" : "Mono"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "mono": !modelData.mono }
                                                                    )
                                                                }

                                                                Button {
                                                                    text: modelData.talkback ? "Talk On" : "Talk"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "talkback": !modelData.talkback }
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 520

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 12

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 2

                                                Label {
                                                    text: "OSC Link"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 12
                                                }

                                                Label {
                                                    text: root.audioOscStatusLabel()
                                                    color: root.audioOscStatusColor()
                                                    font.pixelSize: 14
                                                    font.weight: Font.DemiBold
                                                }

                                                Label {
                                                    text: root.audioOscStatusDetail()
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }

                                            ColumnLayout {
                                                spacing: 4

                                                Label {
                                                    text: engineController.audioSendHost
                                                    color: "#d7e2f0"
                                                    font.pixelSize: 11
                                                    font.family: "monospace"
                                                    horizontalAlignment: Text.AlignRight
                                                    Layout.alignment: Qt.AlignRight
                                                }

                                                Label {
                                                    text: "TX " + engineController.audioSendPort + " / RX " + engineController.audioReceivePort
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                    font.family: "monospace"
                                                    horizontalAlignment: Text.AlignRight
                                                    Layout.alignment: Qt.AlignRight
                                                }

                                                SafetyHoldButton {
                                                    text: "Sync Console"
                                                    delay: 1200
                                                    enabled: engineController.audioOscEnabled
                                                    Layout.alignment: Qt.AlignRight
                                                    onActivated: engineController.syncAudioConsole()
                                                }
                                            }
                                        }

                                        GridLayout {
                                            Layout.fillWidth: true
                                            columns: 3
                                            columnSpacing: 8
                                            rowSpacing: 8

                                            Rectangle {
                                                radius: 8
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 60

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 8
                                                    spacing: 2

                                                    Label { text: "Inputs"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                    Label {
                                                        text: root.audioInputCount()
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 14
                                                        font.weight: Font.DemiBold
                                                    }
                                                }
                                            }

                                            Rectangle {
                                                radius: 8
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 60

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 8
                                                    spacing: 2

                                                    Label { text: "Playback"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                    Label {
                                                        text: root.audioPlaybackCount()
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 14
                                                        font.weight: Font.DemiBold
                                                    }
                                                }
                                            }

                                            Rectangle {
                                                radius: 8
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 60

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 8
                                                    spacing: 2

                                                    Label { text: "Live"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                    Label {
                                                        text: root.audioLiveChannelCount()
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 14
                                                        font.weight: Font.DemiBold
                                                    }
                                                }
                                            }
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 8

                                                Rectangle {
                                                    id: audioFocusCard
                                                    property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                                    property var selectedMixTarget: root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                    property var activeSnapshot: root.activeAudioSnapshot()
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 118

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Focus"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: audioFocusCard.selectedChannel ? audioFocusCard.selectedChannel.name : "No strip selected"
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: (audioFocusCard.selectedMixTarget ? root.audioMixLabel(audioFocusCard.selectedMixTarget) : "Main Monitors")
                                                                  + " mix is active"
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: audioFocusCard.activeSnapshot
                                                                  ? "Active snapshot: "
                                                                    + (audioFocusCard.activeSnapshot.oscIndex !== undefined
                                                                       ? "Slot " + (audioFocusCard.activeSnapshot.oscIndex + 1) + " | "
                                                                       : "")
                                                                    + audioFocusCard.activeSnapshot.name
                                                                  : "No snapshot recalled this session"
                                                            color: audioFocusCard.activeSnapshot ? "#6fd3a8" : "#8ea4c0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#10231e"
                                                    border.color: "#2d5b4d"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 86

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Safe Startup"
                                                            color: "#9ee1c7"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: "Opening the native audio workspace initializes transport only. Stored fader and preamp state are never pushed on load."
                                                            color: "#d7efe5"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 132

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Console State"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: root.audioConsoleStateLabel(
                                                                      engineController.audioConsoleStateConfidence,
                                                                      engineController.audioLastConsoleSyncReason
                                                                  )
                                                            color: root.audioConsoleStateColor()
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: root.audioConsoleStateDetail()
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 272

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 8

                                                        Label {
                                                            text: "Audio Settings"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        CheckBox {
                                                            text: "Enable OSC (TotalMix FX)"
                                                            checked: root.audioOscEnabledDraft
                                                            onToggled: root.audioOscEnabledDraft = checked
                                                        }

                                                        TextField {
                                                            Layout.fillWidth: true
                                                            placeholderText: "127.0.0.1"
                                                            text: root.audioSendHostDraft
                                                            onTextChanged: root.audioSendHostDraft = text
                                                        }

                                                        RowLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 8

                                                            SpinBox {
                                                                Layout.fillWidth: true
                                                                from: 1
                                                                to: 65535
                                                                value: root.audioSendPortDraft
                                                                editable: true
                                                                onValueModified: root.audioSendPortDraft = value
                                                            }

                                                            SpinBox {
                                                                Layout.fillWidth: true
                                                                from: 1
                                                                to: 65535
                                                                value: root.audioReceivePortDraft
                                                                editable: true
                                                                onValueModified: root.audioReceivePortDraft = value
                                                            }
                                                        }

                                                        CheckBox {
                                                            text: "Peak data enabled"
                                                            checked: root.audioExpectedPeakDataDraft
                                                            onToggled: root.audioExpectedPeakDataDraft = checked
                                                        }

                                                        CheckBox {
                                                            text: "Remote locked to submix"
                                                            checked: root.audioExpectedSubmixLockDraft
                                                            onToggled: root.audioExpectedSubmixLockDraft = checked
                                                        }

                                                        CheckBox {
                                                            text: "Compatibility mode noted"
                                                            checked: root.audioExpectedCompatibilityModeDraft
                                                            onToggled: root.audioExpectedCompatibilityModeDraft = checked
                                                        }

                                                        Label {
                                                            text: "Current console bank: " + engineController.audioFadersPerBank + " faders"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Button {
                                                            text: "Save Audio Settings"
                                                            enabled: root.audioSettingsDirty()
                                                            onClicked: engineController.updateAudioSettings({
                                                                                                             "oscEnabled": root.audioOscEnabledDraft,
                                                                                                             "sendHost": root.audioSendHostDraft,
                                                                                                             "sendPort": root.audioSendPortDraft,
                                                                                                             "receivePort": root.audioReceivePortDraft,
                                                                                                             "expectedPeakData": root.audioExpectedPeakDataDraft,
                                                                                                             "expectedSubmixLock": root.audioExpectedSubmixLockDraft,
                                                                                                             "expectedCompatibilityMode": root.audioExpectedCompatibilityModeDraft
                                                                                                         })
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    visible: engineController.audioLastActionMessage.length > 0
                                                    radius: 10
                                                    color: engineController.audioLastActionStatus === "failed" ? "#241317" : "#0c1320"
                                                    border.color: engineController.audioLastActionStatus === "failed" ? "#6b2d35" : "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 86

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: engineController.audioLastActionStatus === "failed" ? "Last Action Failed" : "Last Action"
                                                            color: engineController.audioLastActionStatus === "failed" ? "#f7b4bc" : "#8ea4c0"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: engineController.audioLastActionCode.length > 0
                                                                  ? engineController.audioLastActionMessage + " (" + engineController.audioLastActionCode + ")"
                                                                  : engineController.audioLastActionMessage
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    id: audioSelectedStripCard
                                                    property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                                    property var selectedMixTarget: root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                    visible: audioSelectedStripCard.selectedChannel !== null
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: audioSelectedStripLayout.implicitHeight + 20

                                                    ColumnLayout {
                                                        id: audioSelectedStripLayout
                                                        anchors.top: parent.top
                                                        anchors.left: parent.left
                                                        anchors.right: parent.right
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Selected Strip"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: audioSelectedStripCard.selectedChannel ? audioSelectedStripCard.selectedChannel.name : ""
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: audioSelectedStripCard.selectedChannel
                                                                  ? root.audioRoleLabel(audioSelectedStripCard.selectedChannel.role) + " on " + root.audioBusLabel(audioSelectedStripCard.selectedChannel)
                                                                  : ""
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 56

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 4

                                                                Label {
                                                                    text: "Current Mix"
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 10
                                                                }

                                                                Label {
                                                                    text: root.audioMixLabel(audioSelectedStripCard.selectedMixTarget)
                                                                    color: "#f5f7fb"
                                                                    font.pixelSize: 12
                                                                    font.weight: Font.DemiBold
                                                                }

                                                                Label {
                                                                    text: "Strip sends are stored per output mix. Switching the active destination swaps the stored send layer."
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 10
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 88

                                                            ColumnLayout {
                                                                anchors.top: parent.top
                                                                anchors.left: parent.left
                                                                anchors.right: parent.right
                                                                anchors.margins: 8
                                                                spacing: 4

                                                                Label {
                                                                    text: "Live Meter"
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 10
                                                                }

                                                                Label {
                                                                    text: root.audioMeteringLabel(engineController.audioMeteringState)
                                                                    color: "#b4c0cf"
                                                                    font.pixelSize: 11
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }

                                                                Label {
                                                                    text: audioSelectedStripCard.selectedChannel
                                                                          ? "L " + root.audioMeterDb(audioSelectedStripCard.selectedChannel.meterLeft)
                                                                            + " / R " + root.audioMeterDb(audioSelectedStripCard.selectedChannel.meterRight)
                                                                          : ""
                                                                    color: "#f5f7fb"
                                                                    font.pixelSize: 12
                                                                    font.weight: Font.DemiBold
                                                                }

                                                                Label {
                                                                    text: audioSelectedStripCard.selectedChannel
                                                                          ? "Peak Hold " + root.audioMeterDb(audioSelectedStripCard.selectedChannel.peakHold)
                                                                            + (audioSelectedStripCard.selectedChannel.clip ? " | OVR" : "")
                                                                          : ""
                                                                    color: audioSelectedStripCard.selectedChannel && audioSelectedStripCard.selectedChannel.clip ? "#f7b4bc" : "#b4c0cf"
                                                                    font.pixelSize: 11
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }
                                                            }
                                                        }

                                                        Label {
                                                            text: "Capabilities"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 10
                                                        }

                                                        Flow {
                                                            Layout.fillWidth: true
                                                            spacing: 6

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsGain(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#13263c"
                                                                border.color: "#355d93"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesGainLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesGainLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesGainLabel
                                                                    anchors.centerIn: parent
                                                                    text: "Gain"
                                                                    color: "#9bc4ff"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsPhantom(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#16263f"
                                                                border.color: "#3f689d"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesPhantomLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesPhantomLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesPhantomLabel
                                                                    anchors.centerIn: parent
                                                                    text: "48V"
                                                                    color: "#afd4ff"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsPad(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#17202e"
                                                                border.color: "#3c4e65"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesPadLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesPadLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesPadLabel
                                                                    anchors.centerIn: parent
                                                                    text: "Pad"
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsInstrument(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#13263c"
                                                                border.color: "#355d93"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesInstrumentLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesInstrumentLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesInstrumentLabel
                                                                    anchors.centerIn: parent
                                                                    text: "Inst"
                                                                    color: "#9bc4ff"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsAutoSet(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#102a22"
                                                                border.color: "#2e6f5b"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesAutoSetLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesAutoSetLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesAutoSetLabel
                                                                    anchors.centerIn: parent
                                                                    text: "AutoSet"
                                                                    color: "#8fe3bf"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: root.audioChannelSupportsPhase(audioSelectedStripCard.selectedChannel)
                                                                radius: 9
                                                                color: "#2a2112"
                                                                border.color: "#735b2b"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesPhaseLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesPhaseLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesPhaseLabel
                                                                    anchors.centerIn: parent
                                                                    text: "Phase"
                                                                    color: "#f7d47c"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                visible: audioSelectedStripCard.selectedChannel && audioSelectedStripCard.selectedChannel.stereo
                                                                radius: 9
                                                                color: "#17202e"
                                                                border.color: "#3c4e65"
                                                                border.width: 1
                                                                implicitWidth: capabilitiesStereoLabel.implicitWidth + 16
                                                                implicitHeight: capabilitiesStereoLabel.implicitHeight + 10

                                                                Label {
                                                                    id: capabilitiesStereoLabel
                                                                    anchors.centerIn: parent
                                                                    text: "Stereo Pair"
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 10
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Label {
                                                            text: "Send Matrix"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 10
                                                        }

                                                        Repeater {
                                                            model: root.selectedAudioSendMatrix()

                                                            Rectangle {
                                                                required property var modelData
                                                                radius: 8
                                                                color: modelData.target.id === root.selectedAudioMixTargetId ? "#14233a" : "#101826"
                                                                border.color: modelData.target.id === root.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                                                border.width: 1
                                                                Layout.fillWidth: true
                                                                implicitHeight: 48

                                                                RowLayout {
                                                                    anchors.fill: parent
                                                                    anchors.margins: 8
                                                                    spacing: 8

                                                                    ColumnLayout {
                                                                        Layout.fillWidth: true
                                                                        spacing: 2

                                                                        Label {
                                                                            text: root.audioMixLabel(modelData.target)
                                                                            color: "#f5f7fb"
                                                                            font.pixelSize: 11
                                                                            font.weight: Font.DemiBold
                                                                        }

                                                                        Label {
                                                                            text: "Out " + modelData.target.name
                                                                            color: "#8ea4c0"
                                                                            font.pixelSize: 10
                                                                            wrapMode: Text.WordWrap
                                                                            Layout.fillWidth: true
                                                                        }
                                                                    }

                                                                    Label {
                                                                        text: root.audioLevelLabel(modelData.level)
                                                                        color: "#d7e2f0"
                                                                        font.pixelSize: 11
                                                                        font.weight: Font.DemiBold
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: "RME Readiness"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    font.weight: Font.DemiBold
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 146

                                                    GridLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        columns: 2
                                                        columnSpacing: 8
                                                        rowSpacing: 8

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Probe"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioVerified ? "Passed" : "Needs Probe"
                                                                    color: engineController.audioVerified ? "#6fd3a8" : "#f7d47c"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Transport"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioConnected ? "Ready" : "Offline"
                                                                    color: engineController.audioConnected ? "#6fd3a8" : "#f7d47c"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Metering"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: root.audioMeteringLabel(engineController.audioMeteringState)
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Adapter"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: root.formatEnumLabel(engineController.audioAdapterMode)
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 146

                                                    GridLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        columns: 2
                                                        columnSpacing: 8
                                                        rowSpacing: 8

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Peak Return"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: root.audioPeakReturnStatus()
                                                                    color: engineController.audioMeteringState === "live" ? "#6fd3a8" : "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Submix Lock"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioExpectedSubmixLock ? "Expected" : "Review setup"
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Compatibility"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioExpectedCompatibilityMode ? "Enabled" : "Modern OSC"
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Bank Size"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioFadersPerBank + " faders"
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: audioOperatorNotesLayout.implicitHeight + 20

                                                    ColumnLayout {
                                                        id: audioOperatorNotesLayout
                                                        anchors.top: parent.top
                                                        anchors.left: parent.left
                                                        anchors.right: parent.right
                                                        anchors.margins: 10
                                                        spacing: 8

                                                        Label {
                                                            text: "Operator Notes"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: "Front preamps 9-12 stay primary in this surface. Rear inputs 1-8 stay available as line returns without fake preamp controls."
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: "Playback strips represent stereo software returns. Their faders always send into the selected output mix, and each mix keeps its own stored send level."
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: "Main monitors expose Dim, Mono, and Talkback. Phones mixes keep independent level and mute without disturbing the live source layout."
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: "Instrument and AutoSet remain front-preamp only. 48V stays behind a deliberate hold so it cannot be armed accidentally mid-show."
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: "Startup stays transport-safe. If TotalMix changed outside this surface, run Sync Console before trusting the stored native mix state."
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Label {
                                                        text: "Snapshots"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: audioFocusCard.activeSnapshot
                                                              ? "Active: "
                                                                + (audioFocusCard.activeSnapshot.oscIndex !== undefined
                                                                   ? "Slot " + (audioFocusCard.activeSnapshot.oscIndex + 1) + " | "
                                                                   : "")
                                                                + audioFocusCard.activeSnapshot.name
                                                              : "No snapshot recalled this session"
                                                        color: audioFocusCard.activeSnapshot ? "#d7e2f0" : "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Rectangle {
                                                        visible: root.audioSnapshotWarningVisible()
                                                        radius: 10
                                                        color: "#2a2112"
                                                        border.color: "#7a5a1e"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 72

                                                        Label {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            text: "Snapshot recall changes hardware outside this surface. Use Sync Console after recall if you want the native mix state reasserted."
                                                            color: "#f7d47c"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        TextField {
                                                            Layout.fillWidth: true
                                                            placeholderText: "New snapshot name"
                                                            text: root.audioNewSnapshotNameDraft
                                                            onTextChanged: root.audioNewSnapshotNameDraft = text
                                                        }

                                                        SpinBox {
                                                            id: audioNewSnapshotSlotSpin
                                                            from: 1
                                                            to: 8
                                                            value: root.audioNewSnapshotSlotDraft
                                                            editable: true
                                                            onValueModified: root.audioNewSnapshotSlotDraft = value
                                                        }

                                                        Button {
                                                            text: "Save"
                                                            enabled: root.audioNewSnapshotNameDraft.trim().length > 0
                                                            onClicked: {
                                                                engineController.createAudioSnapshot(
                                                                    root.audioNewSnapshotNameDraft.trim(),
                                                                    audioNewSnapshotSlotSpin.value - 1
                                                                )
                                                                root.audioNewSnapshotNameDraft = ""
                                                                root.audioNewSnapshotSlotDraft = 1
                                                            }
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: engineController.audioSnapshotCount === 0
                                                    text: "No snapshots are exposed by the current audio backend."
                                                    color: "#b4c0cf"
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Repeater {
                                                    model: engineController.audioSnapshots

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#14233a" : "#0c1320"
                                                        border.color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#4b7bc0" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 142

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 6

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                ColumnLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 2

                                                                    Label {
                                                                        text: (modelData.oscIndex !== undefined ? "Slot " + (modelData.oscIndex + 1) + " | " : "") + modelData.name
                                                                        color: "#f5f7fb"
                                                                        font.pixelSize: 12
                                                                        font.weight: Font.DemiBold
                                                                    }

                                                                    Label {
                                                                        text: modelData.id + (modelData.order !== undefined ? " | Order " + (modelData.order + 1) : "")
                                                                        color: "#8ea4c0"
                                                                        font.pixelSize: 11
                                                                        wrapMode: Text.WrapAnywhere
                                                                        Layout.fillWidth: true
                                                                    }
                                                                }

                                                                SafetyHoldButton {
                                                                    text: "Recall"
                                                                    delay: 1200
                                                                    enabled: engineController.audioOscEnabled
                                                                    onActivated: engineController.recallAudioSnapshot(modelData.id)
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                TextField {
                                                                    id: audioSnapshotNameField
                                                                    Layout.fillWidth: true
                                                                    placeholderText: "Rename " + modelData.name
                                                                }

                                                                SpinBox {
                                                                    id: audioSnapshotSlotSpin
                                                                    from: 1
                                                                    to: 8
                                                                    value: modelData.oscIndex !== undefined ? modelData.oscIndex + 1 : 1
                                                                    editable: true
                                                                }

                                                                Button {
                                                                    text: "Update"
                                                                    enabled: audioSnapshotNameField.text.trim().length > 0
                                                                             || audioSnapshotSlotSpin.value - 1 !== modelData.oscIndex
                                                                    onClicked: {
                                                                        const changes = {}
                                                                        if (audioSnapshotNameField.text.trim().length > 0) {
                                                                            changes.name = audioSnapshotNameField.text.trim()
                                                                        }
                                                                        if (audioSnapshotSlotSpin.value - 1 !== modelData.oscIndex) {
                                                                            changes.oscIndex = audioSnapshotSlotSpin.value - 1
                                                                        }
                                                                        engineController.updateAudioSnapshot(modelData.id, changes)
                                                                        audioSnapshotNameField.text = ""
                                                                    }
                                                                }

                                                                Button {
                                                                    text: "Delete"
                                                                    onClicked: engineController.deleteAudioSnapshot(modelData.id)
                                                                }
                                                            }

                                                            Label {
                                                                text: modelData.lastRecalledAt
                                                                      ? "Last recalled " + root.formatTimestamp(modelData.lastRecalledAt)
                                                                      : (modelData.id === engineController.audioLastRecalledSnapshotId
                                                                         ? "Recalled by the native engine"
                                                                         : "Ready to recall")
                                                                color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#6fd3a8" : "#8ea4c0"
                                                                font.pixelSize: 11
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

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "setup"
                                columns: root.width >= 1320 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Backup Archive"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.supportSnapshotLoaded
                                                  ? engineController.supportDetails
                                                  : "Support snapshot is waiting for the engine."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Backup dir: "
                                                  + (engineController.supportBackupDir.length > 0
                                                     ? engineController.supportBackupDir
                                                     : "unavailable")
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: engineController.supportLatestBackupPath.length > 0
                                                  ? "Latest archive: " + engineController.supportLatestBackupPath
                                                  : "No native backup archive has been created yet."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        RowLayout {
                                            spacing: 8

                                            Button {
                                                text: "Export Native Backup"
                                                enabled: engineController.operatorUiReady
                                                onClicked: engineController.exportSupportBackup()
                                            }

                                            Button {
                                                text: "Open Backups"
                                                enabled: engineController.supportBackupDir.length > 0
                                                onClicked: engineController.openSupportBackupDirectory()
                                            }

                                            Button {
                                                text: "Refresh"
                                                enabled: engineController.operatorUiReady
                                                onClicked: engineController.requestSupportSnapshot()
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Available Backups"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        Label {
                                            visible: engineController.supportBackupCount === 0
                                            text: "No JSON backup archives are present in the native backup directory."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.supportBackupFiles.length, 5)

                                            Rectangle {
                                                property var entry: engineController.supportBackupFiles[index]
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 56

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 2

                                                    Label {
                                                        text: entry.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatFileSize(entry.sizeBytes)
                                                              + " | "
                                                              + root.formatUnixTimestamp(entry.modifiedAt)
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Restore And Diagnostics"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.supportSnapshotLoaded
                                                  ? engineController.supportRestoreDetails
                                                  : "Support restore state is waiting for the engine."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        TextField {
                                            Layout.fillWidth: true
                                            text: root.supportRestorePathDraft
                                            placeholderText: "Path to backup JSON"
                                            onTextChanged: root.supportRestorePathDraft = text
                                        }
                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Restore Backup"
                                                enabled: root.supportRestorePathDraft.trim().length > 0
                                                         && engineController.operatorUiReady
                                                onClicked: engineController.restoreSupportBackup(root.supportRestorePathDraft)
                                            }

                                            Button {
                                                text: "Export Shell Diagnostics"
                                                onClicked: engineController.exportShellDiagnostics()
                                            }

                                            Button {
                                                text: "Open Shell Diagnostics"
                                                enabled: engineController.shellDiagnosticsExportPath.length > 0
                                                onClicked: engineController.openShellDiagnosticsFile()
                                            }
                                        }
                                        Label {
                                            text: engineController.shellDiagnosticsExportPath.length > 0
                                                  ? "Shell diagnostics: " + engineController.shellDiagnosticsExportPath
                                                  : "No shell diagnostics bundle exported yet."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
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
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Install And Update"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Native rollout stays deliberate. Use offline installers or the maintenance-tool update repository instead of background auto-update behavior."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Preferred installer for " + root.hostPlatformLabel() + ": " + root.hostInstallerArtifact()
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Update repository archive: " + root.hostUpdateArtifact()
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Before update: export a native support backup, confirm the current version in Recovery, and apply updates during a safe workstation window."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Rollback: keep the app-data directory, reinstall the last known-good native build, then restore from the newest valid backup only if the data itself is affected."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Current engine version: " + engineController.engineVersion + " | Protocol: " + engineController.protocolVersion
                                            color: "#8ea4c0"
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
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Runtime Paths"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "App data: " + engineController.appDataPath
                                            color: "#f5f7fb"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Database: " + engineController.databasePath
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Logs: " + engineController.logsPath
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
                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Open App Data"
                                                onClicked: engineController.openAppDataDirectory()
                                            }

                                            Button {
                                                text: "Open Logs"
                                                onClicked: engineController.openLogsDirectory()
                                            }

                                            Button {
                                                text: "Open Engine Log"
                                                enabled: engineController.engineLogPath.length > 0
                                                onClicked: engineController.openEngineLogFile()
                                            }
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

    OperatorShortcutLayer {
        rootWindow: root
        engineController: engineController
        newProjectTitleField: newProjectTitleField
    }
}
