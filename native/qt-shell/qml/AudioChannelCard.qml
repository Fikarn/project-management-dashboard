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
    property bool signalActive: !!channelData && channelData.meterLevel > 0.02

    function focusChannel() {
        if (channelData) {
            rootWindow.focusAudioChannel(channelData.id)
        }
    }

    visible: !!engineController && !!channelData
    radius: 12
    color: selected ? "#14233a" : "#101826"
    border.color: selected ? "#4b7bc0" : "#24344a"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: cardLayout.implicitHeight + 20

    TapHandler {
        onTapped: root.focusChannel()
    }

    ColumnLayout {
        id: cardLayout
        anchors.fill: parent
        anchors.margins: 10
        spacing: compact ? 6 : 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: channelData.name
                    color: "#f5f7fb"
                    font.pixelSize: compact ? 12 : 13
                    font.weight: Font.DemiBold
                }

                Label {
                    text: rootWindow.audioRoleLabel(channelData.role) + " | " + root.mixLabel
                    color: "#8ea4c0"
                    font.pixelSize: 10
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
                implicitHeight: 24

                Label {
                    id: shortNameLabel
                    anchors.centerIn: parent
                    text: channelData.shortName
                    color: "#d7e2f0"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
            }
        }

        Flow {
            Layout.fillWidth: true
            spacing: 6

            Rectangle {
                visible: root.signalActive
                radius: 999
                color: "#163a2c"
                border.color: "#2ba36a"
                border.width: 1
                implicitWidth: signalLabel.implicitWidth + 16
                implicitHeight: 22

                Label {
                    id: signalLabel
                    anchors.centerIn: parent
                    text: "Signal"
                    color: "#d7ffea"
                    font.pixelSize: 10
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
                implicitHeight: 22

                Label {
                    id: muteLabel
                    anchors.centerIn: parent
                    text: "Muted"
                    color: "#ffd2d7"
                    font.pixelSize: 10
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
                implicitHeight: 22

                Label {
                    id: soloLabel
                    anchors.centerIn: parent
                    text: "PFL"
                    color: "#ffe8b0"
                    font.pixelSize: 10
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
                implicitHeight: 22

                Label {
                    id: phantomLabel
                    anchors.centerIn: parent
                    text: "48V"
                    color: "#afd4ff"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                visible: channelData.clip
                radius: 999
                color: "#3d1c22"
                border.color: "#8d3040"
                border.width: 1
                implicitWidth: clipLabel.implicitWidth + 16
                implicitHeight: 22

                Label {
                    id: clipLabel
                    anchors.centerIn: parent
                    text: "OVR"
                    color: "#ffd2d7"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
            }
        }

        Rectangle {
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: preampLayout.implicitHeight + 16

            ColumnLayout {
                id: preampLayout
                anchors.fill: parent
                anchors.margins: 8
                spacing: 4

                Label {
                    text: rootWindow.audioChannelSupportsGain(channelData) ? "Preamp Gain" : "Source Mode"
                    color: "#8ea4c0"
                    font.pixelSize: 10
                }

                Label {
                    text: rootWindow.audioChannelSupportsGain(channelData)
                          ? "Front preamp trim"
                          : (channelData.role === "rear-line"
                             ? "Rear line inputs stay fixed in hardware."
                             : "Playback returns feed the selected mix directly.")
                    color: "#b4c0cf"
                    font.pixelSize: 10
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Slider {
                    visible: rootWindow.audioChannelSupportsGain(channelData)
                    Layout.fillWidth: true
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
                    visible: rootWindow.audioChannelSupportsGain(channelData)
                    text: "Preamp gain +" + Math.round(channelData.gain) + " dB"
                    color: "#d7e2f0"
                    font.pixelSize: 10
                }
            }
        }

        Rectangle {
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: sendLayout.implicitHeight + 16

            ColumnLayout {
                id: sendLayout
                anchors.fill: parent
                anchors.margins: 8
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1

                        Label {
                            text: "Send"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: root.mixLabel
                            color: "#f5f7fb"
                            font.pixelSize: 11
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
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                        }

                        Label {
                            text: "Peak " + rootWindow.audioMeterDb(channelData.meterLevel)
                            color: "#8ea4c0"
                            font.pixelSize: 9
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                        }
                    }
                }

                Slider {
                    Layout.fillWidth: true
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

        GridLayout {
            Layout.fillWidth: true
            columns: compact ? 2 : 3
            columnSpacing: 6
            rowSpacing: 6

            SafetyHoldButton {
                objectName: "audio-phantom-" + channelData.id
                visible: rootWindow.audioChannelSupportsPhantom(channelData)
                text: channelData.phantom ? "48V On" : "48V Hold"
                delay: 900
                enabled: engineController.operatorUiReady
                Layout.fillWidth: true
                onActivated: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "phantom": !channelData.phantom })
                }
            }

            Button {
                objectName: "audio-inst-" + channelData.id
                visible: rootWindow.audioChannelSupportsInstrument(channelData)
                text: channelData.instrument ? "Inst On" : "Inst"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "instrument": !channelData.instrument })
                }
            }

            Button {
                objectName: "audio-autoset-" + channelData.id
                visible: rootWindow.audioChannelSupportsAutoSet(channelData)
                text: channelData.autoSet ? "AutoSet On" : "AutoSet"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "autoSet": !channelData.autoSet })
                }
            }

            Button {
                objectName: "audio-solo-" + channelData.id
                text: channelData.solo ? "PFL On" : "PFL"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "solo": !channelData.solo })
                }
            }

            Button {
                objectName: "audio-mute-" + channelData.id
                text: channelData.mute ? "Muted" : "Mute"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "mute": !channelData.mute })
                }
            }

            Button {
                objectName: "audio-phase-" + channelData.id
                visible: rootWindow.audioChannelSupportsPhase(channelData)
                text: channelData.phase ? "Phase On" : "Phase"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "phase": !channelData.phase })
                }
            }

            Button {
                objectName: "audio-pad-" + channelData.id
                visible: rootWindow.audioChannelSupportsPad(channelData)
                text: channelData.pad ? "Pad On" : "Pad"
                Layout.fillWidth: true
                onClicked: {
                    root.focusChannel()
                    engineController.updateAudioChannel(channelData.id, { "pad": !channelData.pad })
                }
            }
        }
    }
}
