import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-installer-help-panel"
    property bool denseMode: false
    property bool expanded: false

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: installerHelpLayout.implicitHeight + 24

    ColumnLayout {
        id: installerHelpLayout
        anchors.fill: parent
        anchors.margins: root.denseMode ? 10 : 12
        spacing: root.denseMode ? 6 : 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Installer Recovery"
                    color: "#8ea4c0"
                    font.pixelSize: 11
                }

                Label {
                    text: "Gatekeeper / SmartScreen help"
                    color: "#f5f7fb"
                    font.pixelSize: root.denseMode ? 13 : 14
                    font.weight: Font.DemiBold
                }
            }

            ConsoleButton {
                objectName: "setup-installer-help-toggle"
                text: root.expanded ? "▾" : "▸"
                tone: "ghost"
                dense: root.denseMode
                onClicked: root.expanded = !root.expanded
            }
        }

        ColumnLayout {
            visible: root.expanded
            Layout.fillWidth: true
            spacing: root.denseMode ? 6 : 8

            Rectangle {
                radius: 8
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: root.denseMode ? 52 : 58

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: root.denseMode ? 8 : 10
                    spacing: 2

                    Label {
                        text: "macOS"
                        color: "#f5f7fb"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: "If the app is blocked, right-click the app, choose Open, then confirm once. That clears Gatekeeper for future launches."
                        color: "#b4c0cf"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            Rectangle {
                radius: 8
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: root.denseMode ? 52 : 58

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: root.denseMode ? 8 : 10
                    spacing: 2

                    Label {
                        text: "Windows"
                        color: "#f5f7fb"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: "If SmartScreen intervenes, choose More info, then Run anyway."
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
