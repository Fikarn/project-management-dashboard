import QtQuick
import QtQuick.Layouts
import QtTest
import "../../qml"

TestCase {
    name: "AudioWorkspacePanel"
    when: windowShown
    width: 1920
    height: 1080

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: workspaceHostComponent

        Item {
            id: host
            width: 1920
            height: 1080

            property alias panel: audioPanel
            property alias engine: engineControllerStub
            property real dashboardUiScale: 1.0
            property string selectedAudioChannelId: "audio-input-9"
            property string selectedAudioMixTargetId: "audio-mix-main"
            property bool audioOscEnabledDraft: true
            property string audioSendHostDraft: "127.0.0.1"
            property int audioSendPortDraft: 7001
            property int audioReceivePortDraft: 9001
            property bool audioExpectedPeakDataDraft: true
            property bool audioExpectedSubmixLockDraft: true
            property bool audioExpectedCompatibilityModeDraft: false

            function audioChannelById(channelId) {
                return engineControllerStub.audioChannels.find(function(channel) { return channel.id === channelId }) || null
            }

            function audioMixTargetById(mixTargetId) {
                return engineControllerStub.audioMixTargets.find(function(target) { return target.id === mixTargetId }) || null
            }

            function audioChannelsByRole(role) {
                return engineControllerStub.audioChannels.filter(function(channel) { return channel.role === role })
            }

            function audioInputCount() { return audioChannelsByRole("front-preamp").length + audioChannelsByRole("rear-line").length }
            function audioPlaybackCount() { return audioChannelsByRole("playback-pair").length }
            function audioLiveChannelCount() { return 5 }
            function audioOscStatusLabel() { return "Transport ready, awaiting peak data" }
            function audioOscStatusColor() { return "#f7d47c" }
            function audioOscStatusDetail() { return "Check TotalMix OSC: Send Peak Level Data." }
            function audioConsoleStateLabel() { return "Console state assumed" }
            function audioConsoleStateColor() { return "#f7d47c" }
            function audioConsoleStateDetail() { return "Startup is transport-safe. This surface assumes hardware state until you intentionally sync." }
            function audioSnapshotWarningVisible() { return false }
            function audioMixLabel(target) {
                if (!target) {
                    return "Main Monitors"
                }
                if (target.role === "main-out") {
                    return "Main Monitors"
                }
                if (target.role === "phones-a") {
                    return "Phones 1"
                }
                return "Phones 2"
            }
            function audioRoleLabel(role) {
                if (role === "front-preamp") {
                    return "Front Preamp"
                }
                if (role === "rear-line") {
                    return "Rear Line"
                }
                if (role === "playback-pair") {
                    return "Playback Pair"
                }
                return role
            }
            function audioChannelSendLevel(channel, mixTargetId) {
                const mixLevels = channel.mixLevels || {}
                return mixLevels[mixTargetId] !== undefined ? mixLevels[mixTargetId] : channel.fader
            }
            function audioLevelLabel(value) {
                if (value <= 0) {
                    return "-inf"
                }
                return ((value - 0.75) * 60).toFixed(1) + " dB"
            }
            function audioMeterDb(value) {
                if (!value || value <= 0.0001) {
                    return "-inf"
                }
                return (20 * Math.log(value) / Math.log(10)).toFixed(1) + " dB"
            }
            function audioMeteringLabel() { return "Awaiting peak data" }
            function audioPeakReturnStatus() { return "Check TotalMix" }
            function audioChannelSupportsGain(channel) { return !!channel && channel.role === "front-preamp" }
            function audioChannelSupportsPhantom(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPad(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsInstrument(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsAutoSet(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPhase(channel) { return !!channel && channel.role !== "playback-pair" }
            function audioBusLabel(channel) { return channel.role === "playback-pair" ? "Playback" : "Input" }
            function activeAudioSnapshot() { return engineControllerStub.audioSnapshots[1] }
            function selectAudioMixTarget(mixTargetId) {
                selectedAudioMixTargetId = mixTargetId
                engineControllerStub.updateAudioSettings({ "selectedMixTargetId": mixTargetId })
            }
            function focusAudioChannel(channelId) {
                selectedAudioChannelId = channelId
                engineControllerStub.updateAudioSettings({ "selectedChannelId": channelId })
            }
            function audioSettingsDirty() {
                return audioSendHostDraft !== engineControllerStub.audioSendHost
            }
            function selectedAudioSendMatrix() {
                return engineControllerStub.audioMixTargets.map(function(target) {
                    return {
                        "target": target,
                        "level": 0.72
                    }
                })
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "audio"
                property bool operatorUiReady: true
                property bool audioSnapshotLoaded: true
                property bool audioOscEnabled: true
                property string audioSendHost: "127.0.0.1"
                property int audioSendPort: 7001
                property int audioReceivePort: 9001
                property string audioConsoleStateConfidence: "assumed"
                property string audioLastConsoleSyncReason: "manual-sync"
                property string audioLastActionStatus: "succeeded"
                property string audioLastActionCode: ""
                property string audioLastActionMessage: "Settings saved."
                property bool audioVerified: true
                property bool audioConnected: true
                property string audioMeteringState: "awaiting-peak-data"
                property int audioFadersPerBank: 12
                property int audioMixTargetCount: 3
                property var audioMixTargets: [
                    { "id": "audio-mix-main", "name": "Main Out", "shortName": "MAIN", "role": "main-out", "volume": 0.78, "mute": false, "dim": false, "mono": false, "talkback": false },
                    { "id": "audio-mix-phones-a", "name": "Phones 1", "shortName": "HP 1", "role": "phones-a", "volume": 0.72, "mute": false, "dim": false, "mono": false, "talkback": false },
                    { "id": "audio-mix-phones-b", "name": "Phones 2", "shortName": "HP 2", "role": "phones-b", "volume": 0.68, "mute": false, "dim": false, "mono": false, "talkback": false }
                ]
                property var audioChannels: [
                    { "id": "audio-input-9", "name": "Front 9", "shortName": "IN 9", "role": "front-preamp", "gain": 34, "fader": 0.76, "meterLevel": 0.12, "meterLeft": 0.09, "meterRight": 0.08, "peakHold": 0.14, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.76 } },
                    { "id": "audio-input-10", "name": "Front 10", "shortName": "IN 10", "role": "front-preamp", "gain": 34, "fader": 0.76, "meterLevel": 0.08, "meterLeft": 0.07, "meterRight": 0.07, "peakHold": 0.1, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.76 } },
                    { "id": "audio-input-11", "name": "Front 11", "shortName": "IN 11", "role": "front-preamp", "gain": 32, "fader": 0.74, "meterLevel": 0.06, "meterLeft": 0.06, "meterRight": 0.05, "peakHold": 0.09, "mute": false, "solo": false, "phantom": true, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.74 } },
                    { "id": "audio-input-12", "name": "Front 12", "shortName": "IN 12", "role": "front-preamp", "gain": 32, "fader": 0.74, "meterLevel": 0.05, "meterLeft": 0.04, "meterRight": 0.04, "peakHold": 0.08, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": true, "autoSet": true, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.74 } },
                    { "id": "audio-input-1", "name": "Line 1", "shortName": "L 1", "role": "rear-line", "gain": 0, "fader": 0.68, "meterLevel": 0.02, "meterLeft": 0.02, "meterRight": 0.02, "peakHold": 0.04, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.68 } },
                    { "id": "audio-input-2", "name": "Line 2", "shortName": "L 2", "role": "rear-line", "gain": 0, "fader": 0.68, "meterLevel": 0.02, "meterLeft": 0.02, "meterRight": 0.02, "peakHold": 0.04, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "mixLevels": { "audio-mix-main": 0.68 } },
                    { "id": "audio-playback-1-2", "name": "Playback 1/2", "shortName": "PB 1/2", "role": "playback-pair", "gain": 0, "fader": 0.58, "meterLevel": 0.03, "meterLeft": 0.03, "meterRight": 0.03, "peakHold": 0.05, "mute": false, "solo": false, "phantom": false, "pad": false, "instrument": false, "autoSet": false, "phase": false, "clip": false, "stereo": true, "mixLevels": { "audio-mix-main": 0.58 } }
                ]
                property var audioSnapshots: [
                    { "id": "snapshot-default", "name": "Default", "oscIndex": 0 },
                    { "id": "snapshot-panel", "name": "Panel", "oscIndex": 1 },
                    { "id": "snapshot-broadcast", "name": "Broadcast", "oscIndex": 2 }
                ]
                property var lastAudioSettingsUpdate: null
                property var lastAudioChannelUpdate: null
                property var lastAudioMixTargetUpdate: null

                function updateAudioSettings(changes) { lastAudioSettingsUpdate = changes }
                function updateAudioChannel(channelId, changes) { lastAudioChannelUpdate = { "channelId": channelId, "changes": changes } }
                function updateAudioMixTarget(mixTargetId, changes) { lastAudioMixTargetUpdate = { "mixTargetId": mixTargetId, "changes": changes } }
                function syncAudioConsole() {}
                function recallAudioSnapshot() {}
            }

            AudioWorkspacePanel {
                id: audioPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                scaleFactor: dashboardUiScale
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(workspaceHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        return host
    }

    function findByObjectName(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const childItems = item.children || []
        for (let index = 0; index < childItems.length; index += 1) {
            const match = findByObjectName(childItems[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function test_workspace_composes_audio_panels_and_fits_target_viewport() {
        const host = createHost()

        verify(findByObjectName(host.panel, "audio-toolbar-panel") !== null)
        verify(findByObjectName(host.panel, "audio-mix-targets-panel") !== null)
        verify(findByObjectName(host.panel, "audio-channels-panel") !== null)
        verify(findByObjectName(host.panel, "audio-selected-strip-panel") !== null)
        compare(host.panel.contentFitsViewport(), true)
    }
}
