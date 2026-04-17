import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "operator-shortcuts-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open

    anchors.fill: parent
    visible: open
    z: 46

    Rectangle {
        anchors.fill: parent
        color: "#050913"
        opacity: 0.78

        TapHandler {
            onTapped: rootWindow.keyboardHelpVisible = false
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 56, 520)
        height: Math.min(parent.height - 72, 620)
        radius: 18
        color: "#101826"
        border.color: "#35506b"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 14

            RowLayout {
                Layout.fillWidth: true

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Label {
                        text: "Operator Help"
                        color: "#9bc4ff"
                        font.pixelSize: 11
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: "Keyboard shortcuts"
                        color: "#f5f7fb"
                        font.pixelSize: 22
                        font.weight: Font.DemiBold
                    }
                }

                Button {
                    objectName: "operator-shortcuts-close"
                    text: "Close"
                    onClicked: rootWindow.keyboardHelpVisible = false
                }
            }

            Repeater {
                model: [
                    { "key": "L", "description": "Open lighting workspace" },
                    { "key": "A", "description": "Open audio workspace" },
                    { "key": "K", "description": "Open planning board" },
                    { "key": "N", "description": "Focus the new project field" },
                    { "key": "S / /", "description": "Focus planning search" },
                    { "key": "1-4 / 0", "description": "Filter planning columns" },
                    { "key": "R", "description": "Open time report" },
                    { "key": "E", "description": "Export a backup" },
                    { "key": "Esc", "description": "Close the current dialog or panel" },
                    { "key": "?", "description": "Toggle this help" }
                ]

                Rectangle {
                    required property var modelData
                    radius: 12
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 48

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 10

                        Label {
                            text: modelData.description
                            color: "#d6dce5"
                            font.pixelSize: 12
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                        }

                        Rectangle {
                            radius: 8
                            color: "#101826"
                            border.color: "#35506b"
                            border.width: 1
                            implicitHeight: 28
                            implicitWidth: shortcutLabel.implicitWidth + 18

                            Label {
                                id: shortcutLabel
                                anchors.centerIn: parent
                                text: modelData.key
                                color: "#9bb0c9"
                                font.pixelSize: 11
                                font.family: "monospace"
                            }
                        }
                    }
                }
            }

            Rectangle {
                radius: 12
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: 96

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    Label {
                        text: "Data Safety"
                        color: "#f5f7fb"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: "Every operator change is stored locally. Export a backup before major edits, and restore from a backup or legacy db.json only during a safe workstation window."
                        color: "#b4c0cf"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    objectName: "operator-shortcuts-setup"
                    text: "Control Surface Setup"
                    onClicked: {
                        engineController.setWorkspaceMode("setup")
                        rootWindow.keyboardHelpVisible = false
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "Close"
                    onClicked: rootWindow.keyboardHelpVisible = false
                }
            }
        }
    }
}
