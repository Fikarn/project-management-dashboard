import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: channelData ? "audio-strip-" + channelData.id : "audio-strip"
    required property var rootWindow
    required property var engineController
    required property var channelData
    required property string mixTargetId
    property bool compact: false
    property bool selected: !!channelData && channelData.id === rootWindow.selectedAudioChannelId
    property var selectedMixTarget: rootWindow.audioMixTargetById(mixTargetId)
    property string mixLabel: selectedMixTarget ? rootWindow.audioMixLabel(selectedMixTarget) : "Main Monitors"
    property bool gainCapable: rootWindow.audioChannelSupportsGain(channelData)
    property bool signalActive: !!engineController
                                && !!engineController.audioOscEnabled
                                && !!channelData
                                && channelData.meterLevel > 0.02

    function focusChannel() {
        if (channelData) {
            rootWindow.focusAudioChannel(channelData.id)
        }
    }

    function channelSubtitle() {
        if (!channelData) {
            return ""
        }

        switch (channelData.role) {
        case "front-preamp":
            return "Mic / line preamp"
        case "rear-line":
            return "Line input"
        case "playback-pair":
            return "Playback pair"
        default:
            return rootWindow.audioRoleLabel(channelData.role)
        }
    }

    function supportsPhantom() {
        return rootWindow && typeof rootWindow.audioChannelSupportsPhantom === "function"
               ? rootWindow.audioChannelSupportsPhantom(channelData)
               : false
    }

    function supportsPad() {
        return rootWindow && typeof rootWindow.audioChannelSupportsPad === "function"
               ? rootWindow.audioChannelSupportsPad(channelData)
               : false
    }

    function supportsInstrument() {
        return rootWindow && typeof rootWindow.audioChannelSupportsInstrument === "function"
               ? rootWindow.audioChannelSupportsInstrument(channelData)
               : false
    }

    function supportsAutoSet() {
        return rootWindow && typeof rootWindow.audioChannelSupportsAutoSet === "function"
               ? rootWindow.audioChannelSupportsAutoSet(channelData)
               : false
    }

    function supportsPhase() {
        return rootWindow && typeof rootWindow.audioChannelSupportsPhase === "function"
               ? rootWindow.audioChannelSupportsPhase(channelData)
               : false
    }

    function updateChannel(changes) {
        if (!channelData || !engineController) {
            return
        }

        root.focusChannel()
        engineController.updateAudioChannel(channelData.id, changes)
    }

    visible: !!engineController && !!channelData
    radius: 8
    color: selected ? "#14233a" : "#101826"
    border.color: selected ? "#4b7bc0" : "#24344a"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: cardLayout.implicitHeight + 12

    TapHandler {
        onTapped: root.focusChannel()
    }

    ColumnLayout {
        id: cardLayout
        anchors.fill: parent
        anchors.margins: 6
        spacing: compact ? 4 : 5

        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 1

                Label {
                    text: channelData.name
                    color: "#f5f7fb"
                    font.pixelSize: compact ? 10 : 11
                    font.weight: Font.DemiBold
                }

                Label {
                    text: root.channelSubtitle()
                    color: "#8ea4c0"
                    font.pixelSize: 8
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Rectangle {
                radius: 999
                color: "#152236"
                border.color: "#2a3b55"
                border.width: 1
                implicitWidth: shortNameLabel.implicitWidth + 18
                implicitHeight: 20

                Label {
                    id: shortNameLabel
                    anchors.centerIn: parent
                    text: channelData.shortName
                    color: "#d7e2f0"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }
        }

        Flow {
            Layout.fillWidth: true
            spacing: 4

            Rectangle {
                visible: root.signalActive
                radius: 999
                color: "#163a2c"
                border.color: "#2ba36a"
                border.width: 1
                implicitWidth: signalLabel.implicitWidth + 16
                implicitHeight: 18

                Label {
                    id: signalLabel
                    anchors.centerIn: parent
                    text: "Signal"
                    color: "#d7ffea"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                visible: channelData.mute
                radius: 999
                color: "#3d1c22"
                border.color: "#8d3040"
                border.width: 1
                implicitWidth: muteLabel.implicitWidth + 16
                implicitHeight: 18

                Label {
                    id: muteLabel
                    anchors.centerIn: parent
                    text: "Muted"
                    color: "#ffd2d7"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                visible: channelData.solo
                radius: 999
                color: "#423113"
                border.color: "#9f7421"
                border.width: 1
                implicitWidth: soloLabel.implicitWidth + 16
                implicitHeight: 18

                Label {
                    id: soloLabel
                    anchors.centerIn: parent
                    text: "PFL"
                    color: "#ffe8b0"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                visible: channelData.phantom
                radius: 999
                color: "#16263f"
                border.color: "#3f689d"
                border.width: 1
                implicitWidth: phantomLabel.implicitWidth + 16
                implicitHeight: 18

                Label {
                    id: phantomLabel
                    anchors.centerIn: parent
                    text: "48V"
                    color: "#afd4ff"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                visible: !!engineController && !!engineController.audioOscEnabled && !!channelData && !!channelData.clip
                radius: 999
                color: "#3d1c22"
                border.color: "#8d3040"
                border.width: 1
                implicitWidth: clipLabel.implicitWidth + 16
                implicitHeight: 18

                Label {
                    id: clipLabel
                    anchors.centerIn: parent
                    text: "OVR"
                    color: "#ffd2d7"
                    font.pixelSize: 9
                    font.weight: Font.DemiBold
                }
            }
        }

        Item {
            visible: root.gainCapable
            Layout.fillWidth: true
            implicitHeight: root.gainCapable ? preampLayout.implicitHeight : 0

            ColumnLayout {
                id: preampLayout
                anchors.fill: parent
                spacing: 2

                Label {
                    text: "Preamp Gain"
                    color: "#8ea4c0"
                    font.pixelSize: 9
                }

                ConsoleSlider {
                    visible: root.gainCapable
                    Layout.fillWidth: true
                    dense: true
                    from: 0
                    to: 75
                    stepSize: 1
                    enabled: engineController.operatorUiReady
                    value: channelData.gain
                    onPressedChanged: {
                        if (!pressed) {
                            root.focusChannel()
                            engineController.updateAudioChannel(channelData.id, { "gain": Math.round(value) })
                        }
                    }
                }

                Label {
                    visible: root.gainCapable
                    text: "Preamp gain +" + Math.round(channelData.gain) + " dB"
                    color: "#d7e2f0"
                    font.pixelSize: 8
                }
            }
        }

        Rectangle {
            visible: root.gainCapable
            Layout.fillWidth: true
            implicitHeight: root.gainCapable ? 1 : 0
            color: "#24344a"
        }

        Item {
            Layout.fillWidth: true
            implicitHeight: sendLayout.implicitHeight

            ColumnLayout {
                id: sendLayout
                anchors.fill: parent
                spacing: 2

                RowLayout {
                    Layout.fillWidth: true

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1

                        Label {
                            text: "Send"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Label {
                            text: root.mixLabel
                            color: "#f5f7fb"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }

                    ColumnLayout {
                        spacing: 1

                        Label {
                            text: rootWindow.audioLevelLabel(
                                      rootWindow.audioChannelSendLevel(channelData, mixTargetId)
                                  )
                            color: "#d7e2f0"
                            font.pixelSize: 9
                            font.weight: Font.DemiBold
                            font.family: "Menlo"
                            horizontalAlignment: Text.AlignRight
                        }

                        Label {
                            text: "Peak " + rootWindow.audioMeterDb(channelData.meterLevel)
                            color: "#8ea4c0"
                            font.pixelSize: 8
                            font.family: "Menlo"
                            horizontalAlignment: Text.AlignRight
                            visible: !!engineController && !!engineController.audioOscEnabled
                        }
                    }
                }

                ConsoleSlider {
                    Layout.fillWidth: true
                    dense: true
                    from: 0
                    to: 1
                    stepSize: 0.01
                    enabled: engineController.operatorUiReady && mixTargetId.length > 0
                    value: rootWindow.audioChannelSendLevel(channelData, mixTargetId)
                    onPressedChanged: {
                        if (!pressed && mixTargetId.length > 0) {
                            root.focusChannel()
                            engineController.updateAudioChannel(
                                channelData.id,
                                {
                                    "fader": value,
                                    "mixTargetId": mixTargetId
                                }
                            )
                        }
                    }
                }
            }
        }

        Flow {
            Layout.fillWidth: true
            spacing: 4

            SafetyHoldButton {
                objectName: "audio-phantom-" + channelData.id
                visible: root.supportsPhantom()
                text: channelData.phantom ? "48V Hold" : "48V Hold"
                dense: true
                delay: 900
                onActivated: root.updateChannel({ "phantom": !channelData.phantom })
            }

            ConsoleButton {
                objectName: "audio-inst-" + channelData.id
                visible: root.supportsInstrument()
                text: channelData.instrument ? "Inst On" : "Inst"
                tone: channelData.instrument ? "chip" : "secondary"
                active: !!channelData.instrument
                dense: true
                onClicked: root.updateChannel({ "instrument": !channelData.instrument })
            }

            ConsoleButton {
                objectName: "audio-autoset-" + channelData.id
                visible: root.supportsAutoSet()
                text: channelData.autoSet ? "AutoSet On" : "AutoSet"
                tone: channelData.autoSet ? "chip" : "secondary"
                active: !!channelData.autoSet
                dense: true
                onClicked: root.updateChannel({ "autoSet": !channelData.autoSet })
            }

            ConsoleButton {
                objectName: "audio-pfl-" + channelData.id
                text: channelData.solo ? "PFL On" : "PFL"
                tone: channelData.solo ? "chip" : "secondary"
                active: !!channelData.solo
                dense: true
                onClicked: root.updateChannel({ "solo": !channelData.solo })
            }

            ConsoleButton {
                objectName: "audio-mute-" + channelData.id
                text: channelData.mute ? "Muted" : "Mute"
                tone: channelData.mute ? "danger" : "secondary"
                dense: true
                onClicked: root.updateChannel({ "mute": !channelData.mute })
            }

            ConsoleButton {
                objectName: "audio-phase-" + channelData.id
                visible: root.supportsPhase()
                text: channelData.phase ? "Phase On" : "Phase"
                tone: channelData.phase ? "chip" : "secondary"
                active: !!channelData.phase
                dense: true
                onClicked: root.updateChannel({ "phase": !channelData.phase })
            }

            ConsoleButton {
                objectName: "audio-pad-" + channelData.id
                visible: root.supportsPad()
                text: channelData.pad ? "Pad On" : "Pad"
                tone: channelData.pad ? "chip" : "secondary"
                active: !!channelData.pad
                dense: true
                onClicked: root.updateChannel({ "pad": !channelData.pad })
            }
        }

    }
}
