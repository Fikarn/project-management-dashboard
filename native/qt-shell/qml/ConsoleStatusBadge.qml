import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    property string text: ""
    property color toneColor: theme.studio500
    property bool dimmed: false
    property bool compact: true

    ConsoleTheme {
        id: theme
    }

    radius: theme.radiusPill
    color: dimmed ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.2)
                  : Qt.rgba(toneColor.r, toneColor.g, toneColor.b, 0.1)
    border.width: 1
    border.color: dimmed ? theme.surfaceBorder : Qt.rgba(toneColor.r, toneColor.g, toneColor.b, 0.3)
    implicitHeight: compact ? 24 : 26
    implicitWidth: badgeRow.implicitWidth + (compact ? 16 : 18)

    RowLayout {
        id: badgeRow
        anchors.centerIn: parent
        spacing: compact ? 5 : 6

        Rectangle {
            radius: theme.radiusPill
            color: root.dimmed ? theme.studio500 : root.toneColor
            implicitWidth: compact ? 5 : 6
            implicitHeight: compact ? 5 : 6
        }

        Label {
            text: root.text
            color: root.dimmed ? theme.studio400 : theme.studio100
            font.family: theme.uiFontFamily
            font.pixelSize: compact ? 9 : theme.textXxs
            font.weight: Font.Medium
            font.capitalization: Font.AllUppercase
            font.letterSpacing: compact ? 0.7 : 0.9
        }
    }
}
