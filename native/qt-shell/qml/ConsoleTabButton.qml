import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Button {
    id: root
    property string eyebrow: ""
    property string shortcut: ""
    property string iconText: ""
    property bool active: false
    property bool compact: false

    ConsoleTheme {
        id: theme
    }

    implicitHeight: compact ? 54 : 60
    hoverEnabled: true
    leftPadding: compact ? 10 : 12
    rightPadding: compact ? 10 : 12
    topPadding: compact ? 8 : 9
    bottomPadding: compact ? 8 : 9

    background: Rectangle {
        radius: compact ? 13 : 14
        color: root.active ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.1)
                           : root.hovered ? Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.8)
                                          : Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.32)
        border.width: 1
        border.color: root.active ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.35)
                                  : theme.surfaceBorder
    }

    contentItem: RowLayout {
        spacing: compact ? 8 : 10

        Rectangle {
            visible: root.iconText.length > 0
            radius: 14
            color: root.active ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.16)
                               : Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.95)
            border.width: 1
            border.color: root.active ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.24)
                                      : theme.surfaceBorder
            implicitWidth: compact ? 24 : 28
            implicitHeight: compact ? 24 : 28

            Label {
                anchors.centerIn: parent
                text: root.iconText
                color: root.active ? theme.accentBlue : theme.studio500
                font.family: theme.uiFontFamily
                font.pixelSize: compact ? theme.textXxs : theme.textXs
                font.weight: Font.DemiBold
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: compact ? 1 : 2

            RowLayout {
                Layout.fillWidth: true
                spacing: 6

                Label {
                    text: root.text
                    color: root.active ? theme.studio050 : theme.studio200
                    font.family: theme.uiFontFamily
                    font.pixelSize: compact ? theme.textXs : theme.textSm
                    font.weight: Font.DemiBold
                    Layout.fillWidth: true
                }

                ConsoleBadge {
                    visible: root.shortcut.length > 0
                    text: root.shortcut
                    badgeColor: root.active ? theme.accentBlue : theme.studio600
                    textColor: root.active ? theme.studio950 : theme.studio300
                    implicitHeight: 20
                }
            }

            Label {
                visible: root.eyebrow.length > 0
                text: root.eyebrow
                color: root.active ? theme.studio300 : theme.studio500
                font.family: theme.uiFontFamily
                font.pixelSize: compact ? 10 : theme.textXxs
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }
    }
}
