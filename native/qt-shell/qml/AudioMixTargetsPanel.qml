import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-mix-targets-panel"
    required property var rootWindow
    required property var engineController

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: mixTargetLayout.implicitHeight + 24

    ColumnLayout {
        id: mixTargetLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2

            Label {
                text: "Control Room"
                color: "#8ea4c0"
                font.pixelSize: 11
            }

            Label {
                text: "Select the destination mix before touching strip sends."
                color: "#f5f7fb"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Label {
                text: "Changing the active mix swaps the send layer shown on every source strip."
                color: "#8ea4c0"
                font.pixelSize: 10
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }

        Label {
            visible: engineController.audioMixTargetCount === 0
            text: "No output mixes are available on this console profile."
            color: "#b4c0cf"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Repeater {
            model: engineController.audioMixTargets

            Rectangle {
                required property var modelData
                objectName: "audio-mix-target-" + modelData.id
                radius: 10
                color: modelData.id === rootWindow.selectedAudioMixTargetId ? "#14233a" : "#0c1320"
                border.color: modelData.id === rootWindow.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: mixCardLayout.implicitHeight + 20

                ColumnLayout {
                    id: mixCardLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            objectName: "audio-mix-select-" + modelData.id
                            Layout.fillWidth: true
                            text: rootWindow.audioMixLabel(modelData) + " | "
                                  + rootWindow.audioLevelLabel(modelData.volume)
                            onClicked: rootWindow.selectAudioMixTarget(modelData.id)
                        }

                        Rectangle {
                            radius: 999
                            color: "#152236"
                            border.color: "#2a3b55"
                            border.width: 1
                            implicitWidth: mixShortNameLabel.implicitWidth + 18
                            implicitHeight: 24

                            Label {
                                id: mixShortNameLabel
                                anchors.centerIn: parent
                                text: modelData.shortName
                                color: "#d7e2f0"
                                font.pixelSize: 10
                                font.weight: Font.DemiBold
                            }
                        }
                    }

                    Label {
                        text: rootWindow.audioRoleLabel(modelData.role)
                        color: "#8ea4c0"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    Slider {
                        Layout.fillWidth: true
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
                        spacing: 8

                        Button {
                            objectName: "audio-mix-mute-" + modelData.id
                            text: modelData.mute ? "Muted" : "Mute"
                            Layout.fillWidth: true
                            onClicked: engineController.updateAudioMixTarget(
                                           modelData.id,
                                           { "mute": !modelData.mute }
                                       )
                        }

                        Button {
                            objectName: "audio-mix-dim-" + modelData.id
                            visible: modelData.role === "main-out"
                            text: modelData.dim ? "Dim On" : "Dim"
                            Layout.fillWidth: true
                            onClicked: engineController.updateAudioMixTarget(
                                           modelData.id,
                                           { "dim": !modelData.dim }
                                       )
                        }
                    }

                    RowLayout {
                        visible: modelData.role === "main-out"
                        Layout.fillWidth: true
                        spacing: 8

                        Button {
                            objectName: "audio-mix-mono-" + modelData.id
                            text: modelData.mono ? "Mono On" : "Mono"
                            Layout.fillWidth: true
                            onClicked: engineController.updateAudioMixTarget(
                                           modelData.id,
                                           { "mono": !modelData.mono }
                                       )
                        }

                        Button {
                            objectName: "audio-mix-talk-" + modelData.id
                            text: modelData.talkback ? "Talk On" : "Talk"
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
