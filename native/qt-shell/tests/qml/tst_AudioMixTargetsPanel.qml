import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "AudioMixTargetsPanel"
    when: windowShown
    width: 720
    height: 640

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: panelHostComponent

        Item {
            id: host
            width: 720
            height: 640

            property alias panel: mixTargetsPanel
            property alias engine: engineControllerStub
            property string selectedAudioMixTargetId: "audio-mix-main"
            property string lastSelectedMixTargetId: ""

            function audioMixLabel(target) {
                if (target.role === "main-out") {
                    return "Main Monitors"
                }
                if (target.role === "phones-a") {
                    return "Phones 1"
                }
                return "Phones 2"
            }

            function audioLevelLabel(value) {
                if (value <= 0) {
                    return "-inf"
                }
                return ((value - 0.75) * 60).toFixed(1) + " dB"
            }

            function audioRoleLabel(role) {
                return role === "main-out" ? "Main Out" : (role === "phones-a" ? "Phones 1" : "Phones 2")
            }

            function selectAudioMixTarget(mixTargetId) {
                selectedAudioMixTargetId = mixTargetId
                lastSelectedMixTargetId = mixTargetId
                engineControllerStub.updateAudioSettings({ "selectedMixTargetId": mixTargetId })
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "audio"
                property bool operatorUiReady: true
                property int audioMixTargetCount: 3
                property var audioMixTargets: [
                    { "id": "audio-mix-main", "name": "Main Out", "shortName": "MAIN", "role": "main-out", "volume": 0.78, "mute": false, "dim": false, "mono": false, "talkback": false },
                    { "id": "audio-mix-phones-a", "name": "Phones 1", "shortName": "HP 1", "role": "phones-a", "volume": 0.72, "mute": false, "dim": false, "mono": false, "talkback": false },
                    { "id": "audio-mix-phones-b", "name": "Phones 2", "shortName": "HP 2", "role": "phones-b", "volume": 0.68, "mute": false, "dim": false, "mono": false, "talkback": false }
                ]
                property var lastAudioSettingsUpdate: null
                property var lastMixTargetUpdate: null

                function updateAudioSettings(changes) {
                    lastAudioSettingsUpdate = changes
                }

                function updateAudioMixTarget(mixTargetId, changes) {
                    lastMixTargetUpdate = {
                        "mixTargetId": mixTargetId,
                        "changes": changes
                    }
                }
            }

            AudioMixTargetsPanel {
                id: mixTargetsPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(panelHostComponent, container)
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

    function pressButton(button) {
        verify(button !== null)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_mix_targets_drive_selection_and_direct_actions() {
        const host = createHost()
        const phonesASelect = findByObjectName(host.panel, "audio-mix-select-audio-mix-phones-a")
        const talkback = findByObjectName(host.panel, "audio-mix-talk-audio-mix-main")

        pressButton(phonesASelect)
        compare(host.lastSelectedMixTargetId, "audio-mix-phones-a")
        compare(host.engine.lastAudioSettingsUpdate.selectedMixTargetId, "audio-mix-phones-a")

        pressButton(talkback)
        compare(host.engine.lastMixTargetUpdate.mixTargetId, "audio-mix-main")
        compare(host.engine.lastMixTargetUpdate.changes.talkback, true)
    }
}
