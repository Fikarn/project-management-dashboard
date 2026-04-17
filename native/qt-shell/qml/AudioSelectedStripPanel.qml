import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-selected-strip-panel"
    required property var rootWindow
    required property var engineController
    property var selectedChannel: rootWindow.audioChannelById(rootWindow.selectedAudioChannelId)
    property var selectedMixTarget: rootWindow.audioMixTargetById(rootWindow.selectedAudioMixTargetId)
    property string selectedMixLabel: selectedMixTarget ? rootWindow.audioMixLabel(selectedMixTarget) : "Main Monitors"

    function selectedStripSubtitle() {
        if (!selectedChannel) {
            return "Choose a strip to inspect its live controls, send matrix, and hardware-safe actions."
        }

        return rootWindow.audioRoleLabel(selectedChannel.role) + " on " + rootWindow.audioBusLabel(selectedChannel)
    }

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true
    implicitHeight: 540

    ScrollView {
        id: stripScroll
        anchors.fill: parent
        anchors.margins: 12
        clip: true
        contentWidth: availableWidth

        Item {
            width: stripScroll.availableWidth
            implicitHeight: stripLayout.implicitHeight

            ColumnLayout {
                id: stripLayout
                width: parent.width
                spacing: 10

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: summaryLayout.implicitHeight + 20

                    ColumnLayout {
                        id: summaryLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Selected Strip"
                            color: "#8ea4c0"
                            font.pixelSize: 11
                        }

                        Label {
                            objectName: "audio-selected-strip-title"
                            text: root.selectedChannel ? root.selectedChannel.name : "No strip selected"
                            color: "#f5f7fb"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: root.selectedStripSubtitle()
                            color: root.selectedChannel ? "#b4c0cf" : "#8ea4c0"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: mixSummaryLayout.implicitHeight + 20

                    ColumnLayout {
                        id: mixSummaryLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Current Mix"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: root.selectedMixLabel
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
                    visible: !!root.selectedChannel
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: meterLayout.implicitHeight + 20

                    ColumnLayout {
                        id: meterLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        Label {
                            text: "Live Meter"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: root.rootWindow.audioMeteringLabel(engineController.audioMeteringState)
                            color: "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: root.selectedChannel
                                  ? "L " + root.rootWindow.audioMeterDb(root.selectedChannel.meterLeft)
                                    + " / R " + root.rootWindow.audioMeterDb(root.selectedChannel.meterRight)
                                  : ""
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: root.selectedChannel
                                  ? "Peak Hold " + root.rootWindow.audioMeterDb(root.selectedChannel.peakHold)
                                    + (root.selectedChannel.clip ? " | OVR" : "")
                                  : ""
                            color: root.selectedChannel && root.selectedChannel.clip ? "#f7b4bc" : "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: actionLayout.implicitHeight + 20

                    ColumnLayout {
                        id: actionLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Quick Actions"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        GridLayout {
                            Layout.fillWidth: true
                            columns: 2
                            columnSpacing: 8
                            rowSpacing: 8

                            SafetyHoldButton {
                                objectName: "audio-selected-phantom"
                                visible: root.rootWindow.audioChannelSupportsPhantom(root.selectedChannel)
                                text: root.selectedChannel && root.selectedChannel.phantom ? "48V On" : "48V Hold"
                                delay: 900
                                enabled: engineController.operatorUiReady
                                Layout.fillWidth: true
                                onActivated: {
                                    engineController.updateAudioChannel(
                                        root.selectedChannel.id,
                                        { "phantom": !root.selectedChannel.phantom }
                                    )
                                }
                            }

                            Button {
                                objectName: "audio-selected-inst"
                                visible: root.rootWindow.audioChannelSupportsInstrument(root.selectedChannel)
                                text: root.selectedChannel && root.selectedChannel.instrument ? "Inst On" : "Inst"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "instrument": !root.selectedChannel.instrument }
                                           )
                            }

                            Button {
                                objectName: "audio-selected-autoset"
                                visible: root.rootWindow.audioChannelSupportsAutoSet(root.selectedChannel)
                                text: root.selectedChannel && root.selectedChannel.autoSet ? "AutoSet On" : "AutoSet"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "autoSet": !root.selectedChannel.autoSet }
                                           )
                            }

                            Button {
                                objectName: "audio-selected-solo"
                                visible: !!root.selectedChannel
                                text: root.selectedChannel && root.selectedChannel.solo ? "PFL On" : "PFL"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "solo": !root.selectedChannel.solo }
                                           )
                            }

                            Button {
                                objectName: "audio-selected-mute"
                                visible: !!root.selectedChannel
                                text: root.selectedChannel && root.selectedChannel.mute ? "Muted" : "Mute"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "mute": !root.selectedChannel.mute }
                                           )
                            }

                            Button {
                                objectName: "audio-selected-phase"
                                visible: root.rootWindow.audioChannelSupportsPhase(root.selectedChannel)
                                text: root.selectedChannel && root.selectedChannel.phase ? "Phase On" : "Phase"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "phase": !root.selectedChannel.phase }
                                           )
                            }

                            Button {
                                objectName: "audio-selected-pad"
                                visible: root.rootWindow.audioChannelSupportsPad(root.selectedChannel)
                                text: root.selectedChannel && root.selectedChannel.pad ? "Pad On" : "Pad"
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioChannel(
                                               root.selectedChannel.id,
                                               { "pad": !root.selectedChannel.pad }
                                           )
                            }
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: capabilitiesLayout.implicitHeight + 20

                    ColumnLayout {
                        id: capabilitiesLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Capabilities"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Flow {
                            objectName: "audio-selected-capabilities"
                            Layout.fillWidth: true
                            spacing: 6

                            Repeater {
                                model: [
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsGain(root.selectedChannel),
                                        "label": "Gain",
                                        "fill": "#13263c",
                                        "border": "#355d93",
                                        "textColor": "#9bc4ff"
                                    },
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsPhantom(root.selectedChannel),
                                        "label": "48V",
                                        "fill": "#16263f",
                                        "border": "#3f689d",
                                        "textColor": "#afd4ff"
                                    },
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsPad(root.selectedChannel),
                                        "label": "Pad",
                                        "fill": "#17202e",
                                        "border": "#3c4e65",
                                        "textColor": "#d7e2f0"
                                    },
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsInstrument(root.selectedChannel),
                                        "label": "Inst",
                                        "fill": "#13263c",
                                        "border": "#355d93",
                                        "textColor": "#9bc4ff"
                                    },
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsAutoSet(root.selectedChannel),
                                        "label": "AutoSet",
                                        "fill": "#102a22",
                                        "border": "#2e6f5b",
                                        "textColor": "#8fe3bf"
                                    },
                                    {
                                        "visible": root.rootWindow.audioChannelSupportsPhase(root.selectedChannel),
                                        "label": "Phase",
                                        "fill": "#2a2112",
                                        "border": "#735b2b",
                                        "textColor": "#f7d47c"
                                    },
                                    {
                                        "visible": !!(root.selectedChannel && root.selectedChannel.stereo),
                                        "label": "Stereo Pair",
                                        "fill": "#17202e",
                                        "border": "#3c4e65",
                                        "textColor": "#d7e2f0"
                                    }
                                ]

                                Rectangle {
                                    required property var modelData
                                    visible: modelData.visible
                                    radius: 999
                                    color: modelData.fill
                                    border.color: modelData.border
                                    border.width: 1
                                    implicitWidth: capabilityLabel.implicitWidth + 16
                                    implicitHeight: 24

                                    Label {
                                        id: capabilityLabel
                                        anchors.centerIn: parent
                                        text: modelData.label
                                        color: modelData.textColor
                                        font.pixelSize: 10
                                        font.weight: Font.DemiBold
                                    }
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: sendMatrixLayout.implicitHeight + 20

                    ColumnLayout {
                        id: sendMatrixLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Send Matrix"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Repeater {
                            model: root.selectedChannel ? root.rootWindow.selectedAudioSendMatrix() : []

                            Rectangle {
                                required property var modelData
                                objectName: "audio-selected-send-" + modelData.target.id
                                radius: 8
                                color: modelData.target.id === root.rootWindow.selectedAudioMixTargetId ? "#14233a" : "#101826"
                                border.color: modelData.target.id === root.rootWindow.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 46

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 8

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 1

                                        Label {
                                            text: root.rootWindow.audioMixLabel(modelData.target)
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                        }

                                        Label {
                                            text: "Out " + modelData.target.name
                                            color: "#8ea4c0"
                                            font.pixelSize: 10
                                        }
                                    }

                                    Label {
                                        text: root.rootWindow.audioLevelLabel(modelData.level)
                                        color: "#d7e2f0"
                                        font.pixelSize: 10
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
}
