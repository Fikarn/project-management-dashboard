import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "operator-shortcuts-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open

    ConsoleTheme {
        id: theme
    }

    readonly property var shortcutsModel: [
        { "key": "l", "description": "Open lighting workspace" },
        { "key": "a", "description": "Open audio workspace" },
        { "key": "k", "description": "Open planning board" },
        { "key": "n", "description": "Create a new project" },
        { "key": "s /", "description": "Focus search" },
        { "key": "1-4", "description": "Filter planning columns" },
        { "key": "0", "description": "Show all columns" },
        { "key": "r", "description": "Open time report" },
        { "key": "e", "description": "Export a backup" },
        { "key": "Esc", "description": "Close the current modal" },
        { "key": "?", "description": "Toggle this help" }
    ]

    function closeDialog() {
        rootWindow.keyboardHelpVisible = false
    }

    function openSetup() {
        engineController.setWorkspaceMode("setup")
        root.closeDialog()
    }

    function returnHome() {
        engineController.setWorkspaceMode("planning")
        root.closeDialog()
    }

    anchors.fill: parent
    visible: open
    z: 60

    Rectangle {
        objectName: "operator-shortcuts-backdrop"
        anchors.fill: parent
        color: theme.overlayScrim
        opacity: 0.82

        MouseArea {
            objectName: "operator-shortcuts-backdrop-hit"
            anchors.fill: parent
            onClicked: root.closeDialog()
        }
    }

    ConsoleSurface {
        objectName: "operator-shortcuts-surface"
        anchors.centerIn: parent
        width: Math.min(436, parent ? parent.width - 56 : 436)
        height: shortcutsColumn.implicitHeight + theme.spacing7 * 2
        tone: "modal"
        padding: theme.spacing7

        ColumnLayout {
            id: shortcutsColumn
            anchors.fill: parent
            spacing: theme.spacing5

            ColumnLayout {
                width: parent.width
                spacing: 4

                Label {
                    text: "Operator Help"
                    color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.82)
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.weight: Font.DemiBold
                    font.letterSpacing: 1.6
                }

                Label {
                    text: "Keyboard shortcuts"
                    color: theme.studio050
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textLg
                    font.weight: Font.DemiBold
                }
            }

            Repeater {
                model: root.shortcutsModel

                Rectangle {
                    required property var modelData

                    Layout.fillWidth: true
                    implicitHeight: 38
                    radius: theme.radiusCard
                    color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.72)
                    border.width: 1
                    border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.92)

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: theme.spacing6
                        anchors.rightMargin: theme.spacing5
                        spacing: theme.spacing5

                        Label {
                            text: modelData.description
                            color: theme.studio400
                            font.family: theme.uiFontFamily
                            font.pixelSize: theme.textXs
                            Layout.fillWidth: true
                            verticalAlignment: Text.AlignVCenter
                        }

                        Rectangle {
                            radius: theme.radiusBadge
                            color: Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.82)
                            border.width: 1
                            border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.9)
                            implicitHeight: 20
                            implicitWidth: shortcutLabel.implicitWidth + 16

                            Label {
                                id: shortcutLabel
                                anchors.centerIn: parent
                                text: modelData.key
                                color: theme.studio300
                                font.family: theme.monoFontFamily
                                font.pixelSize: theme.textXxs
                                font.weight: Font.DemiBold
                            }
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                radius: theme.radiusCard
                color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.48)
                border.width: 1
                border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.82)
                implicitHeight: safetyColumn.implicitHeight + theme.spacing6 * 2

                ColumnLayout {
                    id: safetyColumn
                    anchors.fill: parent
                    anchors.margins: theme.spacing6
                    spacing: theme.spacing4

                    Label {
                        text: "DATA SAFETY"
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        font.weight: Font.DemiBold
                        font.letterSpacing: 1.2
                    }

                    Text {
                        Layout.fillWidth: true
                        textFormat: Text.RichText
                        text: "Every change saves locally. Automatic backups run every 30 minutes, and you can export a snapshot at any time with <font face=\"" + theme.monoFontFamily + "\">E</font>."
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXxs
                        wrapMode: Text.WordWrap
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: theme.spacing6

                Text {
                    objectName: "operator-shortcuts-setup-link"
                    text: "Open control surface setup"
                    color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.88)
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs

                    MouseArea {
                        objectName: "operator-shortcuts-setup-hit"
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.openSetup()
                    }
                }

                Text {
                    objectName: "operator-shortcuts-home-link"
                    text: "Return to console home"
                    color: theme.studio500
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs

                    MouseArea {
                        objectName: "operator-shortcuts-home-hit"
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.returnHome()
                    }
                }

                Item {
                    Layout.fillWidth: true
                }
            }
        }
    }
}
