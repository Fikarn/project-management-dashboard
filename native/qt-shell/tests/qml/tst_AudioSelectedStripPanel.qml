import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "AudioSelectedStripPanel"
    when: windowShown
    width: 720
    height: 900

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
            height: 900

            property alias panel: audioSelectedStripPanel
            property alias engine: engineControllerStub
            property string selectedAudioChannelId: "audio-input-9"
            property string selectedAudioMixTargetId: "audio-mix-main"

            function audioChannelById(channelId) {
                return engineControllerStub.audioChannels.find(function(channel) { return channel.id === channelId }) || null
            }

            function audioMixTargetById(mixTargetId) {
                return engineControllerStub.audioMixTargets.find(function(target) { return target.id === mixTargetId }) || null
            }

            function audioMixLabel(target) {
                if (!target) {
                    return "Main Monitors"
                }
                return target.role === "main-out" ? "Main Monitors" : "Phones 1"
            }

            function audioRoleLabel(role) {
                if (role === "front-preamp") {
                    return "Front Preamp"
                }
                if (role === "rear-line") {
                    return "Rear Line"
                }
                return "Playback Pair"
            }

            function audioBusLabel(channel) {
                return channel.role === "playback-pair" ? "Playback" : "Input"
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

            function audioMeteringLabel() {
                return "Awaiting peak data"
            }

            function audioChannelSupportsGain(channel) { return !!channel && channel.role === "front-preamp" }
            function audioChannelSupportsPhantom(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPad(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsInstrument(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsAutoSet(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPhase(channel) { return !!channel && channel.role !== "playback-pair" }

            function selectedAudioSendMatrix() {
                return engineControllerStub.audioMixTargets.map(function(target) {
                    return {
                        "target": target,
                        "level": target.id === selectedAudioMixTargetId ? 0.76 : 0.61
                    }
                })
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "audio"
                property bool operatorUiReady: true
                property string audioMeteringState: "awaiting-peak-data"
                property var audioMixTargets: [
                    { "id": "audio-mix-main", "name": "Main Out", "shortName": "MAIN", "role": "main-out" },
                    { "id": "audio-mix-phones-a", "name": "Phones 1", "shortName": "HP 1", "role": "phones-a" }
                ]
                property var audioChannels: [
                    {
                        "id": "audio-input-9",
                        "name": "Front 9",
                        "shortName": "IN 9",
                        "role": "front-preamp",
                        "gain": 34,
                        "fader": 0.76,
                        "meterLevel": 0.12,
                        "meterLeft": 0.09,
                        "meterRight": 0.08,
                        "peakHold": 0.14,
                        "mute": false,
                        "solo": false,
                        "phantom": false,
                        "pad": false,
                        "instrument": false,
                        "autoSet": false,
                        "phase": false,
                        "clip": false
                    }
                ]
                property var lastAudioChannelUpdate: null

                function updateAudioChannel(channelId, changes) {
                    lastAudioChannelUpdate = {
                        "channelId": channelId,
                        "changes": changes
                    }
                }
            }

            AudioSelectedStripPanel {
                id: audioSelectedStripPanel
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

    function test_selected_strip_restores_summary_capabilities_and_send_matrix() {
        const host = createHost()
        const title = findByObjectName(host.panel, "audio-selected-strip-title")
        const sendMain = findByObjectName(host.panel, "audio-selected-send-audio-mix-main")
        const capabilities = findByObjectName(host.panel, "audio-selected-capabilities")

        verify(title !== null)
        verify(sendMain !== null)
        verify(capabilities !== null)
        compare(title.text, "Front 9")
        compare(sendMain.implicitHeight > 0, true)
    }

    function test_selected_strip_preserves_hold_and_action_updates() {
        const host = createHost()
        const phantomButton = findByObjectName(host.panel, "audio-selected-phantom")
        const muteButton = findByObjectName(host.panel, "audio-selected-mute")

        verify(phantomButton !== null)
        verify(muteButton !== null)
        compare(phantomButton.delay, 900)

        pressButton(muteButton)
        compare(host.engine.lastAudioChannelUpdate.channelId, "audio-input-9")
        compare(host.engine.lastAudioChannelUpdate.changes.mute, true)
    }
}
