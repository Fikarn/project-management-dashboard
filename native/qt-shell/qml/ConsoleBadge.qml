import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    property string text: ""
    property color badgeColor: theme.studio600
    property color textColor: theme.studio100
    property bool filled: false
    property bool uppercase: false

    ConsoleTheme {
        id: theme
    }

    radius: theme.radiusPill
    color: filled ? badgeColor : Qt.rgba(badgeColor.r, badgeColor.g, badgeColor.b, 0.12)
    border.width: 1
    border.color: Qt.rgba(badgeColor.r, badgeColor.g, badgeColor.b, filled ? 0.18 : 0.55)
    implicitHeight: 24
    implicitWidth: badgeLabel.implicitWidth + 18

    Label {
        id: badgeLabel
        anchors.centerIn: parent
        text: root.uppercase ? root.text.toUpperCase() : root.text
        color: root.filled ? theme.studio950 : root.textColor
        font.family: theme.uiFontFamily
        font.pixelSize: theme.textXxs
        font.weight: Font.DemiBold
        font.capitalization: root.uppercase ? Font.AllUppercase : Font.MixedCase
        font.letterSpacing: root.uppercase ? 0.8 : 0
    }
}
