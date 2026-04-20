import QtQuick
import QtQuick.Controls

DelayButton {
    id: root
    property string tone: "secondary"
    property bool dense: false

    ConsoleTheme {
        id: theme
    }

    implicitHeight: dense ? theme.compactControlHeight : theme.controlHeight
    leftPadding: dense ? 10 : 12
    rightPadding: dense ? 10 : 12
    topPadding: 0
    bottomPadding: 0
    font.family: theme.uiFontFamily
    font.pixelSize: dense ? theme.textXs : theme.textSm
    font.weight: Font.DemiBold

    background: Rectangle {
        radius: theme.radiusBadge
        color: root.down || root.progress > 0 ? theme.studio700 : theme.studio800
        border.width: 1
        border.color: root.activeFocus ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.7)
                                       : theme.surfaceBorder
    }

    contentItem: Label {
        text: root.text
        color: theme.studio200
        font.family: theme.uiFontFamily
        font.pixelSize: dense ? theme.textXs : theme.textSm
        font.weight: Font.DemiBold
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
}
