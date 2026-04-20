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

    ConsoleTheme {
        id: theme
    }

    function selectedStripSubtitle() {
        if (!selectedChannel) {
            return "Choose a strip to inspect its live controls."
        }

        return rootWindow.audioRoleLabel(selectedChannel.role) + " on " + rootWindow.audioBusLabel(selectedChannel)
    }

    function mixOutputLabel(target) {
        if (rootWindow && typeof rootWindow.audioMixOutputLabel === "function") {
            return rootWindow.audioMixOutputLabel(target)
        }

        if (!target) {
            return "Output 1/2"
        }

        switch (target.role) {
        case "main-out":
            return "Output 1/2"
        case "phones-a":
            return "Output 9/10"
        case "phones-b":
            return "Output 11/12"
        default:
            return "Output"
        }
    }

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 10
    color: Qt.rgba(theme.surfaceDefault.r, theme.surfaceDefault.g, theme.surfaceDefault.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillHeight: true
    implicitHeight: 560

    ScrollView {
        id: stripScroll
        anchors.fill: parent
        anchors.margins: 10
        clip: true
        contentWidth: availableWidth

        Item {
            width: stripScroll.availableWidth
            implicitHeight: stripLayout.implicitHeight

            ColumnLayout {
                id: stripLayout
                width: parent.width
                spacing: 8

                Rectangle {
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: summaryLayout.implicitHeight + 16

                    ColumnLayout {
                        id: summaryLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        Label {
                            text: "Selected Strip"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            objectName: "audio-selected-strip-title"
                            text: root.selectedChannel ? root.selectedChannel.name : "No strip selected"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: root.selectedStripSubtitle()
                            color: root.selectedChannel ? "#b4c0cf" : "#8ea4c0"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: mixSummaryLayout.implicitHeight + 16

                    ColumnLayout {
                        id: mixSummaryLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        Label {
                            text: "Current Mix"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Label {
                            text: root.selectedMixLabel
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Strip sends are stored per output mix. Switching the active destination swaps the stored send layer."
                            color: "#8ea4c0"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: sendMatrixLayout.implicitHeight + 16

                    ColumnLayout {
                        id: sendMatrixLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        Label {
                            text: "Send Matrix"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Repeater {
                            model: root.selectedChannel ? root.rootWindow.selectedAudioSendMatrix() : []

                            Rectangle {
                                required property var modelData
                                objectName: "audio-selected-send-" + modelData.target.id
                                radius: 7
                                color: modelData.target.id === root.rootWindow.selectedAudioMixTargetId ? "#14233a" : "#101826"
                                border.color: modelData.target.id === root.rootWindow.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 40

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 7
                                    spacing: 6

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 0

                                        Label {
                                            text: root.rootWindow.audioMixLabel(modelData.target)
                                            color: "#f5f7fb"
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                        }

                                        Label {
                                            text: root.mixOutputLabel(modelData.target)
                                            color: "#8ea4c0"
                                            font.pixelSize: 9
                                        }
                                    }

                                    Label {
                                        text: root.rootWindow.audioLevelLabel(modelData.level)
                                        color: "#d7e2f0"
                                        font.pixelSize: 9
                                        font.family: theme.monoFontFamily
                                    }
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: meterLayout.implicitHeight + 16

                    ColumnLayout {
                        id: meterLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 5

                        Label {
                            text: "Live Meter"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Label {
                            text: root.rootWindow.audioMeteringLabel(engineController.audioMeteringState)
                            color: "#b4c0cf"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: !engineController.audioOscEnabled
                                  ? "L 0.0 / R 0.0"
                                  : (root.selectedChannel
                                     ? "L " + root.rootWindow.audioMeterDb(root.selectedChannel.meterLeft)
                                       + " / R " + root.rootWindow.audioMeterDb(root.selectedChannel.meterRight)
                                     : "")
                            color: "#f5f7fb"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: !engineController.audioOscEnabled
                                  ? "Peak Hold off"
                                  : (root.selectedChannel
                                     ? "Peak Hold " + root.rootWindow.audioMeterDb(root.selectedChannel.peakHold)
                                       + (root.selectedChannel.clip ? " | OVR" : "")
                                     : "")
                            color: root.selectedChannel && root.selectedChannel.clip ? "#f7b4bc" : "#b4c0cf"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    visible: !!root.selectedChannel
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: capabilitiesLayout.implicitHeight + 16

                    ColumnLayout {
                        id: capabilitiesLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        Label {
                            text: "Capabilities"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Flow {
                            objectName: "audio-selected-capabilities"
                            Layout.fillWidth: true
                            spacing: 4

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
                                    implicitHeight: 20

                                    Label {
                                        id: capabilityLabel
                                        anchors.centerIn: parent
                                        text: modelData.label
                                        color: modelData.textColor
                                        font.pixelSize: 9
                                        font.weight: Font.DemiBold
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
