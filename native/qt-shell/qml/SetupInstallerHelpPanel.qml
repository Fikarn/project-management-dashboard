import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-installer-help-panel"
    property bool denseMode: false
    property bool expanded: false

    radius: 18
    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: installerHelpLayout.implicitHeight + 24

    ConsoleTheme {
        id: theme
    }

    ColumnLayout {
        id: installerHelpLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Installer Recovery"
                    color: theme.studio500
                    font.pixelSize: 10
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.6
                }

                Label {
                    text: "Gatekeeper / SmartScreen help"
                    color: theme.studio050
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }
            }

            Button {
                objectName: "setup-installer-help-toggle"
                implicitWidth: 18
                implicitHeight: 18
                onClicked: root.expanded = !root.expanded

                background: Item {}

                contentItem: Label {
                    text: root.expanded ? "▼" : "▶"
                    color: theme.studio500
                    font.pixelSize: 10
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        ColumnLayout {
            visible: root.expanded
            Layout.fillWidth: true
            spacing: root.denseMode ? 6 : 8

            Rectangle {
                radius: 14
                color: Qt.rgba(0.04, 0.07, 0.11, 0.45)
                border.color: theme.studio800
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: macHelpLayout.implicitHeight + 20

                ColumnLayout {
                    id: macHelpLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 2

                    Label {
                        text: "macOS"
                        color: theme.studio200
                        font.pixelSize: 14
                        font.weight: Font.Medium
                    }
                    Label {
                        text: "If the app is blocked, right-click the app, choose Open, then confirm once. That clears Gatekeeper for future launches."
                        color: theme.studio400
                        font.pixelSize: 10
                        lineHeight: 1.5
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            Rectangle {
                radius: 14
                color: Qt.rgba(0.04, 0.07, 0.11, 0.45)
                border.color: theme.studio800
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: windowsHelpLayout.implicitHeight + 20

                ColumnLayout {
                    id: windowsHelpLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 2

                    Label {
                        text: "Windows"
                        color: theme.studio200
                        font.pixelSize: 14
                        font.weight: Font.Medium
                    }
                    Label {
                        text: "If SmartScreen intervenes, choose More info, then Run anyway."
                        color: theme.studio400
                        font.pixelSize: 10
                        lineHeight: 1.5
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }
        }
    }
}
