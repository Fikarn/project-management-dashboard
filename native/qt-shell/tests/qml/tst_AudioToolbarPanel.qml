import QtQuick
import QtQuick.Controls
import QtTest
import "../../qml"

TestCase {
    name: "AudioToolbarPanel"
    when: windowShown
    width: 1400
    height: 520

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: toolbarHostComponent

        Item {
            id: host
            width: 1400
            height: 520

            property alias panel: audioToolbar
            property alias engine: engineControllerStub
            property string selectedAudioChannelId: "audio-input-10"
            property string selectedAudioMixTargetId: "audio-mix-main"

            function audioChannelById(channelId) {
                for (let index = 0; index < engineControllerStub.audioChannels.length; index += 1) {
                    if (engineControllerStub.audioChannels[index].id === channelId) {
                        return engineControllerStub.audioChannels[index]
                    }
                }
                return null
            }

            function audioMixTargetById(mixTargetId) {
                for (let index = 0; index < engineControllerStub.audioMixTargets.length; index += 1) {
                    if (engineControllerStub.audioMixTargets[index].id === mixTargetId) {
                        return engineControllerStub.audioMixTargets[index]
                    }
                }
                return null
            }

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

            function activeAudioSnapshot() {
                return engineControllerStub.audioSnapshots[1]
            }

            function audioSnapshotWarningVisible() { return true }

            function audioInputCount() { return 12 }
            function audioPlaybackCount() { return 6 }
            function audioLiveChannelCount() { return 4 }
            function audioOscStatusLabel() { return "Transport ready, awaiting peak data" }
            function audioOscStatusColor() { return "#f7d47c" }
            function audioOscStatusDetail() { return "Check TotalMix OSC: Send Peak Level Data." }
            function audioConsoleStateLabel() { return "Snapshot changed hardware" }
            function audioConsoleStateColor() { return "#f7d47c" }
            function audioConsoleStateDetail() { return "A snapshot was recalled. Sync Console to reassert the stored mix." }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "audio"
                property bool audioOscEnabled: true
                property string audioSendHost: "127.0.0.1"
                property int audioSendPort: 7001
                property int audioReceivePort: 9001
                property string audioConsoleStateConfidence: "assumed"
                property string audioLastConsoleSyncReason: "snapshot"
                property string audioLastRecalledSnapshotId: "snapshot-panel"
                property var audioChannels: [
                    { "id": "audio-input-10", "name": "Front 10", "role": "front-preamp" }
                ]
                property var audioMixTargets: [
                    { "id": "audio-mix-main", "name": "Main Out", "role": "main-out" }
                ]
                property var audioSnapshots: [
                    { "id": "snapshot-default", "name": "Default", "oscIndex": 0 },
                    { "id": "snapshot-panel", "name": "Panel", "oscIndex": 1 },
                    { "id": "snapshot-broadcast", "name": "Broadcast", "oscIndex": 2 }
                ]
                property int syncCalls: 0
                property string lastRecalledSnapshotIdRequested: ""

                function syncAudioConsole() {
                    syncCalls += 1
                }

                function recallAudioSnapshot(snapshotId) {
                    lastRecalledSnapshotIdRequested = snapshotId
                }
            }

            AudioToolbarPanel {
                id: audioToolbar
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(toolbarHostComponent, container)
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

    function test_toolbar_preserves_hold_contract_and_warning_surface() {
        const host = createHost()
        const syncButton = findByObjectName(host.panel, "audio-sync-console-button")
        const recallButton = findByObjectName(host.panel, "audio-snapshot-recall-snapshot-panel")
        const warning = findByObjectName(host.panel, "audio-snapshot-warning")

        verify(syncButton !== null)
        verify(recallButton !== null)
        verify(warning !== null)

        compare(syncButton.delay, 1200)
        compare(recallButton.delay, 1200)
        compare(host.panel.snapshotWarningVisible, true)
    }
}
