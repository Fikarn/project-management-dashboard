import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-toolbar-panel"
    required property var rootWindow
    required property var engineController
    property bool wideLayout: width >= 1240
    property var activeSnapshot: rootWindow.activeAudioSnapshot()
    property bool snapshotWarningVisible: engineController.audioLastConsoleSyncReason === "snapshot"
                                          || (engineController.audioLastRecalledSnapshotId !== undefined
                                              && engineController.audioLastRecalledSnapshotId.length > 0)

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: toolbarLayout.implicitHeight + 24

    GridLayout {
        id: toolbarLayout
        anchors.fill: parent
        anchors.margins: 12
        columns: root.wideLayout ? 2 : 1
        columnSpacing: 12
        rowSpacing: 12

        Rectangle {
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: statusLayout.implicitHeight + 20

            ColumnLayout {
                id: statusLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2

                        Label {
                            text: "OSC Link"
                            color: "#8ea4c0"
                            font.pixelSize: 11
                        }

                        Label {
                            text: rootWindow.audioOscStatusLabel()
                            color: rootWindow.audioOscStatusColor()
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: rootWindow.audioOscStatusDetail()
                            color: "#b4c0cf"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }

                    ColumnLayout {
                        spacing: 4

                        Label {
                            text: engineController.audioSendHost
                            color: "#d7e2f0"
                            font.pixelSize: 10
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        Label {
                            text: "TX " + engineController.audioSendPort + " / RX " + engineController.audioReceivePort
                            color: "#8ea4c0"
                            font.pixelSize: 10
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        SafetyHoldButton {
                            id: syncButton
                            objectName: "audio-sync-console-button"
                            text: "Sync Console"
                            delay: 1200
                            enabled: engineController.audioOscEnabled
                            Layout.alignment: Qt.AlignRight
                            onActivated: engineController.syncAudioConsole()
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: 3
                    columnSpacing: 8
                    rowSpacing: 8

                    Repeater {
                        model: [
                            { "label": "Inputs", "value": rootWindow.audioInputCount() },
                            { "label": "Playback", "value": rootWindow.audioPlaybackCount() },
                            { "label": "Live", "value": rootWindow.audioLiveChannelCount() }
                        ]

                        Rectangle {
                            required property var modelData
                            radius: 8
                            color: "#101826"
                            border.color: "#24344a"
                            border.width: 1
                            Layout.fillWidth: true
                            implicitHeight: 56

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 2

                                Label {
                                    text: modelData.label
                                    color: "#8ea4c0"
                                    font.pixelSize: 10
                                }

                                Label {
                                    text: modelData.value
                                    color: "#f5f7fb"
                                    font.pixelSize: 13
                                    font.weight: Font.DemiBold
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    objectName: "audio-toolbar-selected"
                    radius: 10
                    color: "#101826"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 82

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 4

                        Label {
                            text: "Focus"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: rootWindow.audioChannelById(rootWindow.selectedAudioChannelId)
                                  ? rootWindow.audioChannelById(rootWindow.selectedAudioChannelId).name
                                  : "No strip selected"
                            color: "#f5f7fb"
                            font.pixelSize: 13
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

                Rectangle {
                    radius: 10
                    color: "#10231e"
                    border.color: "#2d5b4d"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 74

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 4

                        Label {
                            text: "Safe Startup"
                            color: "#9ee1c7"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Opening audio initializes transport only. Stored fader and preamp state are never pushed on load."
                            color: "#d7efe5"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                }

                Rectangle {
                    objectName: "audio-console-state"
                    radius: 10
                    color: "#101826"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 104

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 4

                        Label {
                            text: "Console State"
                            color: "#8ea4c0"
                            font.pixelSize: 10
                        }

                        Label {
                            text: rootWindow.audioConsoleStateLabel(
                                      engineController.audioConsoleStateConfidence,
                                      engineController.audioLastConsoleSyncReason
                                  )
                            color: rootWindow.audioConsoleStateColor()
                            font.pixelSize: 13
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

        Rectangle {
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: snapshotLayout.implicitHeight + 20

            ColumnLayout {
                id: snapshotLayout
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2

                        Label {
                            text: "Snapshots"
                            color: "#8ea4c0"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }

                        Label {
                            text: "Hold to recall approved console setups."
                            color: "#f5f7fb"
                            font.pixelSize: 12
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
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }

                    ColumnLayout {
                        spacing: 2

                        Label {
                            text: engineController.audioSendHost
                            color: "#d7e2f0"
                            font.pixelSize: 10
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }

                        Label {
                            text: "TX " + engineController.audioSendPort + " / RX " + engineController.audioReceivePort
                            color: "#8ea4c0"
                            font.pixelSize: 10
                            font.family: "monospace"
                            horizontalAlignment: Text.AlignRight
                            Layout.alignment: Qt.AlignRight
                        }
                    }
                }

                Rectangle {
                    objectName: "audio-snapshot-warning"
                    visible: root.snapshotWarningVisible
                    radius: 10
                    color: "#2a2112"
                    border.color: "#7a5a1e"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 60

                    Label {
                        anchors.fill: parent
                        anchors.margins: 10
                        text: "Snapshot recall changes hardware outside this surface. Hold Sync Console after recall if you want the stored mix reasserted."
                        color: "#f7d47c"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.wideLayout ? 3 : 1
                    columnSpacing: 8
                    rowSpacing: 8

                    Repeater {
                        model: engineController.audioSnapshots

                        SafetyHoldButton {
                            required property var modelData
                            objectName: "audio-snapshot-recall-" + modelData.id
                            text: "Slot " + (modelData.oscIndex + 1) + " " + modelData.name
                            delay: 1200
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
