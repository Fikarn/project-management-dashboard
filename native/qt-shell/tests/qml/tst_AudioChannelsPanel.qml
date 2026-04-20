import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "AudioChannelsPanel"
    when: windowShown
    width: 1320
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
            width: 1320
            height: 900

            property alias panel: audioChannelsPanel
            property alias engine: engineControllerStub
            property string selectedAudioChannelId: "audio-input-9"
            property string selectedAudioMixTargetId: "audio-mix-main"

            function audioChannelsByRole(role) {
                return engineControllerStub.audioChannels.filter(function(channel) { return channel.role === role })
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

            function audioChannelSendLevel(channel, mixTargetId) {
                const mixLevels = channel.mixLevels || {}
                return mixLevels[mixTargetId] !== undefined ? mixLevels[mixTargetId] : channel.fader
            }

            function audioMeterDb(value) {
                if (!value || value <= 0.0001) {
                    return "-inf"
                }
                return (20 * Math.log(value) / Math.log(10)).toFixed(1) + " dB"
            }

            function audioLevelLabel(value) {
                if (value <= 0) {
                    return "-inf"
                }
                return ((value - 0.75) * 60).toFixed(1) + " dB"
            }

            function audioChannelSupportsGain(channel) { return !!channel && channel.role === "front-preamp" }
            function audioChannelSupportsPhantom(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPad(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsInstrument(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsAutoSet(channel) { return audioChannelSupportsGain(channel) }
            function audioChannelSupportsPhase(channel) { return !!channel && channel.role !== "playback-pair" }

            function focusAudioChannel(channelId) {
                selectedAudioChannelId = channelId
                engineControllerStub.updateAudioSettings({ "selectedChannelId": channelId })
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "audio"
                property bool operatorUiReady: true
                property bool audioOscEnabled: true
                property var audioMixTargets: [
                    { "id": "audio-mix-main", "name": "Main Out", "shortName": "MAIN", "role": "main-out" }
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
                        "mute": false,
                        "solo": false,
                        "phantom": false,
                        "pad": false,
                        "instrument": false,
                        "autoSet": false,
                        "phase": false,
                        "clip": false,
                        "mixLevels": { "audio-mix-main": 0.76 }
                    },
                    {
                        "id": "audio-input-1",
                        "name": "Line 1",
                        "shortName": "L 1",
                        "role": "rear-line",
                        "gain": 0,
                        "fader": 0.68,
                        "meterLevel": 0.02,
                        "mute": false,
                        "solo": false,
                        "phantom": false,
                        "pad": false,
                        "instrument": false,
                        "autoSet": false,
                        "phase": false,
                        "clip": false,
                        "mixLevels": { "audio-mix-main": 0.68 }
                    },
                    {
                        "id": "audio-playback-1-2",
                        "name": "Playback 1/2",
                        "shortName": "PB 1/2",
                        "role": "playback-pair",
                        "gain": 0,
                        "fader": 0.58,
                        "meterLevel": 0.03,
                        "mute": false,
                        "solo": false,
                        "phantom": false,
                        "pad": false,
                        "instrument": false,
                        "autoSet": false,
                        "phase": false,
                        "clip": false,
                        "stereo": true,
                        "mixLevels": { "audio-mix-main": 0.58 }
                    }
                ]
                property var lastAudioSettingsUpdate: null
                property var lastAudioChannelUpdate: null

                function updateAudioSettings(changes) {
                    lastAudioSettingsUpdate = changes
                }

                function updateAudioChannel(channelId, changes) {
                    lastAudioChannelUpdate = {
                        "channelId": channelId,
                        "changes": changes
                    }
                }
            }

            AudioChannelsPanel {
                id: audioChannelsPanel
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

    function test_channel_sections_restore_front_preamp_hold_and_role_gating() {
        const host = createHost()
        const phantomFront = findByObjectName(host.panel, "audio-phantom-audio-input-9")
        const phantomRear = findByObjectName(host.panel, "audio-phantom-audio-input-1")
        const instFront = findByObjectName(host.panel, "audio-inst-audio-input-9")
        const frontSection = findByObjectName(host.panel, "audio-strip-section-front")

        verify(frontSection !== null)
        verify(phantomFront !== null)
        verify(instFront !== null)
        compare(phantomFront.delay, 900)
        compare(phantomRear.visible, false)
    }

    function test_channel_actions_keep_focus_and_engine_updates_aligned() {
        const host = createHost()
        const muteButton = findByObjectName(host.panel, "audio-mute-audio-input-9")

        pressButton(muteButton)
        compare(host.engine.lastAudioSettingsUpdate.selectedChannelId, "audio-input-9")
        compare(host.engine.lastAudioChannelUpdate.channelId, "audio-input-9")
        compare(host.engine.lastAudioChannelUpdate.changes.mute, true)
    }
}
