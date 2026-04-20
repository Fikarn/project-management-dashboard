import QtQuick
import QtQuick.Controls

TextField {
    id: root
    property bool dense: false
    property string tone: "default"

    ConsoleTheme {
        id: theme
    }

    implicitHeight: tone === "inline" ? 22 : dense ? theme.compactControlHeight : theme.controlHeight
    color: enabled ? tone === "inline" ? theme.studio300 : theme.studio050 : theme.studio500
    placeholderTextColor: tone === "inline" ? theme.studio600 : theme.studio500
    font.family: theme.uiFontFamily
    font.pixelSize: tone === "inline" ? theme.textXs : theme.textSm
    leftPadding: tone === "inline" ? 0 : 12
    rightPadding: tone === "inline" ? 0 : 12
    topPadding: 0
    bottomPadding: 0
    verticalAlignment: TextInput.AlignVCenter
    selectedTextColor: theme.studio950
    selectionColor: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.55)

    background: Rectangle {
        radius: theme.radiusBadge
        color: root.tone === "inline"
               ? "transparent"
               : root.enabled
                 ? Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
                 : Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.16)
        border.width: root.tone === "inline" ? 0 : 1
        border.color: root.activeFocus ? theme.accentPrimary
                                       : root.hovered ? theme.studio600 : theme.surfaceBorder
    }
}
