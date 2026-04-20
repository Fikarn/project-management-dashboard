import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-toolbar-panel"
    required property var rootWindow
    required property var engineController
    property bool wideLayout: width >= 1040
    property var activeSnapshot: rootWindow.activeAudioSnapshot()
    property bool snapshotWarningVisible: engineController.audioLastConsoleSyncReason === "snapshot"
                                          || (engineController.audioLastRecalledSnapshotId !== undefined
                                              && engineController.audioLastRecalledSnapshotId.length > 0)

    ConsoleTheme {
        id: theme
    }

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 10
    color: Qt.rgba(theme.surfaceDefault.r, theme.surfaceDefault.g, theme.surfaceDefault.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: toolbarLayout.implicitHeight + 18

    RowLayout {
        id: toolbarLayout
        anchors.fill: parent
        anchors.margins: 8
        spacing: 8

        Rectangle {
            radius: 9
            color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
            border.color: theme.surfaceBorder
            border.width: 1
            Layout.fillWidth: true
            Layout.preferredWidth: root.wideLayout ? 860 : 720
            implicitHeight: statusLayout.implicitHeight + 16

            ColumnLayout {
                id: statusLayout
                anchors.fill: parent
                anchors.margins: 7
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1

                        Label {
                            text: "OSC Link"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: rootWindow.audioOscStatusLabel()
                            color: rootWindow.audioOscStatusColor()
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: rootWindow.audioOscStatusDetail()
                            color: "#b4c0cf"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }

                    ColumnLayout {
                        spacing: 2

                        Label {
                            text: engineController.audioSendHost
                            color: "#d7e2f0"
                            font.pixelSize: 9
                            font.family: theme.monoFontFamily
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        Label {
                            text: "TX " + engineController.audioSendPort + " / RX " + engineController.audioReceivePort
                            color: "#8ea4c0"
                            font.pixelSize: 9
                            font.family: theme.monoFontFamily
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        SafetyHoldButton {
                            objectName: "audio-sync-console-button"
                            text: engineController.audioOscEnabled ? "Sync Console" : "Settings"
                            delay: 1200
                            dense: true
                            enabled: engineController.audioOscEnabled
                            Layout.alignment: Qt.AlignRight
                            onActivated: engineController.syncAudioConsole()
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: 3
                    columnSpacing: 6
                    rowSpacing: 6

                    Repeater {
                        model: [
                            { "label": "Inputs", "value": rootWindow.audioInputCount() },
                            { "label": "Playback", "value": rootWindow.audioPlaybackCount() },
                            { "label": "Live", "value": rootWindow.audioLiveChannelCount() }
                        ]

                        Rectangle {
                            required property var modelData
                            radius: 7
                            color: "#101826"
                            border.color: "#24344a"
                            border.width: 1
                            Layout.fillWidth: true
                            implicitHeight: 54

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 6
                                spacing: 1

                                Label {
                                    text: modelData.label
                                    color: "#8ea4c0"
                                    font.pixelSize: 9
                                }

                                Label {
                                    text: modelData.value
                                    color: "#f5f7fb"
                                    font.pixelSize: 12
                                    font.weight: Font.DemiBold
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    objectName: "audio-toolbar-selected"
                    radius: 8
                    color: "#101826"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 60

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 7
                        spacing: 1

                        Label {
                            text: "Focus"
                            color: "#8ea4c0"
                            font.pixelSize: 9
                        }

                        Label {
                            text: rootWindow.audioChannelById(rootWindow.selectedAudioChannelId)
                                  ? rootWindow.audioChannelById(rootWindow.selectedAudioChannelId).name
                                  : "No strip selected"
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: (rootWindow.audioMixTargetById(rootWindow.selectedAudioMixTargetId)
                                   ? rootWindow.audioMixLabel(
                                         rootWindow.audioMixTargetById(rootWindow.selectedAudioMixTargetId)
                                     )
                                   : "Main Monitors") + " mix is active"
                            color: "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Rectangle {
                        radius: 8
                        color: "#10231e"
                        border.color: "#2d5b4d"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 68

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 7
                            spacing: 2

                            Label {
                                text: "Safe Startup"
                                color: "#9ee1c7"
                                font.pixelSize: 9
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Startup initializes transport only. Stored strip state is never pushed on load."
                                color: "#d7efe5"
                                font.pixelSize: 10
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }

                    Rectangle {
                        objectName: "audio-console-state"
                        radius: 8
                        color: "#101826"
                        border.color: "#24344a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 68

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 7
                            spacing: 2

                            Label {
                                text: "Console State"
                                color: "#8ea4c0"
                                font.pixelSize: 9
                            }

                            Label {
                                text: rootWindow.audioConsoleStateLabel(
                                          engineController.audioConsoleStateConfidence,
                                          engineController.audioLastConsoleSyncReason
                                      )
                                color: rootWindow.audioConsoleStateColor()
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: rootWindow.audioConsoleStateDetail()
                                color: "#b4c0cf"
                                font.pixelSize: 10
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }
                }
            }
        }

        Rectangle {
            radius: 9
            color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
            border.color: theme.surfaceBorder
            border.width: 1
            Layout.fillWidth: true
            Layout.preferredWidth: root.wideLayout ? 680 : 560
            implicitHeight: snapshotLayout.implicitHeight + 16

            ColumnLayout {
                id: snapshotLayout
                anchors.fill: parent
                anchors.margins: 7
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1

                        Label {
                            text: "Snapshots"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Hold to recall approved TotalMix setups."
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Label {
                            text: root.activeSnapshot
                                  ? "Active: "
                                    + (root.activeSnapshot.oscIndex !== undefined
                                       ? "Slot " + (root.activeSnapshot.oscIndex + 1) + " | "
                                       : "")
                                    + root.activeSnapshot.name
                                  : "No snapshot recalled this session"
                            color: root.activeSnapshot ? "#d7e2f0" : "#8ea4c0"
                            font.pixelSize: 9
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }

                    ColumnLayout {
                        spacing: 1

                        Label {
                            text: engineController.audioSendHost
                            color: "#d7e2f0"
                            font.pixelSize: 9
                            font.family: theme.monoFontFamily
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        Label {
                            text: "TX " + engineController.audioSendPort + " / RX " + engineController.audioReceivePort
                            color: "#8ea4c0"
                            font.pixelSize: 9
                            font.family: theme.monoFontFamily
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }
                    }
                }

                Rectangle {
                    objectName: "audio-snapshot-warning"
                    visible: root.snapshotWarningVisible
                    radius: 8
                    color: "#2a2112"
                    border.color: "#7a5a1e"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 52

                    Label {
                        anchors.fill: parent
                        anchors.margins: 7
                        text: "Snapshot recall changes hardware outside this surface. Hold Sync Console to reassert the stored mix."
                        color: "#f7d47c"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: engineController.audioSnapshotCount > 1 ? 2 : 1
                    columnSpacing: 6
                    rowSpacing: 6

                    Repeater {
                        model: engineController.audioSnapshots

                        SafetyHoldButton {
                            required property var modelData
                            objectName: "audio-snapshot-recall-" + modelData.id
                            text: "Slot " + (modelData.oscIndex + 1) + " " + modelData.name
                            delay: 1200
                            dense: true
                            enabled: engineController.audioOscEnabled
                            Layout.fillWidth: true
                            onActivated: engineController.recallAudioSnapshot(modelData.id)
                        }
                    }
                }
            }
        }
    }
}
