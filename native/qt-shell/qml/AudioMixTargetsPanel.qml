import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-mix-targets-panel"
    required property var rootWindow
    required property var engineController
    property bool wideLayout: width >= 760

    ConsoleTheme {
        id: theme
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
    Layout.fillWidth: true
    implicitHeight: mixTargetLayout.implicitHeight + 16

    ColumnLayout {
        id: mixTargetLayout
        anchors.fill: parent
        anchors.margins: 8
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 1

                Label {
                    text: "Control Room"
                    color: "#8ea4c0"
                    font.pixelSize: 10
                }

                Label {
                    text: "Select the destination mix before touching strip sends."
                    color: "#f5f7fb"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Changing the active mix swaps the send layer shown on every source strip."
                    color: "#8ea4c0"
                    font.pixelSize: 9
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }
        }

        Label {
            visible: engineController.audioMixTargetCount === 0
            text: "No output mixes are available on this console profile."
            color: "#b4c0cf"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        GridLayout {
            Layout.fillWidth: true
            columns: root.wideLayout ? 3 : 1
            columnSpacing: 8
            rowSpacing: 8

            Repeater {
                model: engineController.audioMixTargets

                Rectangle {
                    required property var modelData
                    objectName: "audio-mix-target-" + modelData.id
                    radius: 8
                    color: modelData.id === rootWindow.selectedAudioMixTargetId ? "#14233a" : "#0c1320"
                    border.color: modelData.id === rootWindow.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: mixCardLayout.implicitHeight + 14

                    ColumnLayout {
                        id: mixCardLayout
                        anchors.fill: parent
                        anchors.margins: 7
                        spacing: 5

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            ConsoleButton {
                                objectName: "audio-mix-select-" + modelData.id
                                Layout.fillWidth: true
                                text: rootWindow.audioRoleLabel(modelData.role)
                                tone: "tab"
                                active: modelData.id === rootWindow.selectedAudioMixTargetId
                                dense: true
                                onClicked: rootWindow.selectAudioMixTarget(modelData.id)
                            }

                            Rectangle {
                                radius: 999
                                color: "#152236"
                                border.color: "#2a3b55"
                                border.width: 1
                                implicitWidth: mixShortNameLabel.implicitWidth + 16
                                implicitHeight: 20

                                Label {
                                    id: mixShortNameLabel
                                    anchors.centerIn: parent
                                    text: modelData.shortName
                                    color: "#d7e2f0"
                                    font.pixelSize: 9
                                    font.weight: Font.DemiBold
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label {
                                Layout.fillWidth: true
                                text: root.mixOutputLabel(modelData)
                                color: "#8ea4c0"
                                font.pixelSize: 9
                            }

                            Rectangle {
                                visible: modelData.id === rootWindow.selectedAudioMixTargetId
                                radius: 999
                                color: "#163a2c"
                                border.color: "#2ba36a"
                                border.width: 1
                                implicitWidth: activeLabel.implicitWidth + 14
                                implicitHeight: 18

                                Label {
                                    id: activeLabel
                                    anchors.centerIn: parent
                                    text: "Active Mix"
                                    color: "#d7ffea"
                                    font.pixelSize: 8
                                    font.weight: Font.DemiBold
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label {
                                text: "Level"
                                color: "#8ea4c0"
                                font.pixelSize: 9
                            }

                            Item {
                                Layout.fillWidth: true
                            }

                            Label {
                                text: rootWindow.audioLevelLabel(modelData.volume)
                                color: "#d7e2f0"
                                font.pixelSize: 9
                                font.weight: Font.DemiBold
                                font.family: theme.monoFontFamily
                            }
                        }

                        ConsoleSlider {
                            Layout.fillWidth: true
                            dense: true
                            from: 0
                            to: 1
                            stepSize: 0.01
                            enabled: engineController.operatorUiReady
                            value: modelData.volume
                            onPressedChanged: {
                                if (!pressed) {
                                    rootWindow.selectAudioMixTarget(modelData.id)
                                    engineController.updateAudioMixTarget(modelData.id, { "volume": value })
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            ConsoleButton {
                                objectName: "audio-mix-mute-" + modelData.id
                                text: modelData.mute ? "Muted" : "Mute"
                                tone: modelData.mute ? "danger" : "secondary"
                                dense: true
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioMixTarget(
                                               modelData.id,
                                               { "mute": !modelData.mute }
                                           )
                            }

                            ConsoleButton {
                                objectName: "audio-mix-dim-" + modelData.id
                                visible: modelData.role === "main-out"
                                text: modelData.dim ? "Dim On" : "Dim"
                                tone: modelData.dim ? "chip" : "secondary"
                                active: modelData.dim
                                dense: true
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioMixTarget(
                                               modelData.id,
                                               { "dim": !modelData.dim }
                                           )
                            }

                            ConsoleButton {
                                objectName: "audio-mix-mono-" + modelData.id
                                visible: modelData.role === "main-out"
                                text: modelData.mono ? "Mono On" : "Mono"
                                tone: modelData.mono ? "chip" : "secondary"
                                active: modelData.mono
                                dense: true
                                Layout.fillWidth: true
                                onClicked: engineController.updateAudioMixTarget(
                                               modelData.id,
                                               { "mono": !modelData.mono }
                                           )
                            }

                            ConsoleButton {
                                objectName: "audio-mix-talk-" + modelData.id
                                visible: modelData.role === "main-out"
                                text: modelData.talkback ? "Talk On" : "Talk"
                                tone: modelData.talkback ? "chip" : "secondary"
                                active: modelData.talkback
                                dense: true
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
