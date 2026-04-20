import QtQuick
import QtQuick.Controls

TextArea {
    id: root

    ConsoleTheme {
        id: theme
    }

    color: enabled ? theme.studio050 : theme.studio500
    placeholderTextColor: theme.studio500
    font.family: theme.uiFontFamily
    font.pixelSize: theme.textSm
    leftPadding: 12
    rightPadding: 12
    topPadding: 10
    bottomPadding: 10
    selectedTextColor: theme.studio950
    selectionColor: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.55)
    wrapMode: TextEdit.Wrap
    selectByMouse: true

    background: Rectangle {
        radius: theme.radiusBadge
        color: root.enabled
               ? Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
               : Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.16)
        border.width: 1
        border.color: root.activeFocus ? theme.accentPrimary
                                       : root.hovered ? theme.studio600 : theme.surfaceBorder
    }
}
