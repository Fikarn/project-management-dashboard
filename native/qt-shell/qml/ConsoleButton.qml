import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Button {
    id: root
    property string tone: "secondary"
    property bool active: false
    property bool compact: false
    property string iconText: ""
    property string iconFontFamily: theme.uiFontFamily
    property bool dense: false
    property int iconPixelSize: tone === "icon"
                                 ? (dense ? theme.textXs : theme.textSm)
                                 : (dense ? theme.textXxs : theme.textXs)

    ConsoleTheme {
        id: theme
    }

    implicitHeight: compact || dense ? theme.compactControlHeight : theme.controlHeight
    implicitWidth: Math.max(background ? background.implicitWidth : 0, contentRow.implicitWidth + leftPadding + rightPadding)
    leftPadding: tone === "icon" ? 0 : iconText.length > 0 ? (dense ? 9 : 10) : (dense ? 10 : 12)
    rightPadding: tone === "icon" ? 0 : dense ? 10 : 12
    topPadding: 0
    bottomPadding: 0
    hoverEnabled: true
    focusPolicy: Qt.StrongFocus

    function backgroundColor() {
        if (!enabled) {
            return Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.18)
        }

        if (tone === "icon") {
            if (root.active) {
                return root.down ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.22)
                                 : root.hovered ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.18)
                                                : Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.12)
            }

            return root.down ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.72)
                             : root.hovered ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.5)
                                            : Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.92)
        }

        if (tone === "danger") {
            return root.down ? Qt.darker(theme.accentRed, 1.18)
                             : root.hovered ? Qt.lighter(theme.accentRed, 1.04)
                                            : Qt.rgba(theme.accentRed.r, theme.accentRed.g, theme.accentRed.b, 0.16)
        }

        if (tone === "primary") {
            return root.down ? Qt.darker(theme.accentPrimary, 1.18)
                             : root.hovered ? Qt.lighter(theme.accentPrimary, 1.04)
                                            : theme.accentPrimary
        }

        if (tone === "ghost") {
            return root.down ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.48)
                             : root.hovered ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.32)
                                            : "transparent"
        }

        if (tone === "chip") {
            return active ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.16)
                          : root.down ? theme.studio700
                                      : root.hovered ? theme.studio700 : theme.surfaceSoft
        }

        if (tone === "tab") {
            if (active) {
                return Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.14)
            }

            return root.down ? Qt.rgba(theme.studio750.r, theme.studio750.g, theme.studio750.b, 0.86)
                             : root.hovered ? Qt.rgba(theme.studio750.r, theme.studio750.g, theme.studio750.b, 0.64)
                                            : Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.86)
        }

        return root.down ? theme.studio700 : root.hovered ? theme.studio750 : theme.surfaceSoft
    }

    function borderColor() {
        if (tone === "icon") {
            return root.active ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.34)
                               : root.hovered ? theme.studio600 : theme.surfaceBorder
        }

        if (tone === "danger") {
            return Qt.rgba(theme.accentRed.r, theme.accentRed.g, theme.accentRed.b, 0.44)
        }

        if (tone === "primary") {
            return Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.44)
        }

        if (tone === "ghost") {
            return root.hovered ? theme.studio600 : theme.surfaceBorder
        }

        if (tone === "chip") {
            return active ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.44) : theme.surfaceBorder
        }

        if (tone === "tab") {
            return active ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.38) : theme.surfaceBorder
        }

        return theme.surfaceBorder
    }

    function textColor() {
        if (!enabled) {
            return theme.studio500
        }

        if (tone === "icon") {
            return root.active ? theme.accentPrimary : root.hovered ? theme.studio100 : theme.studio400
        }

        if (tone === "danger") {
            return theme.studio050
        }

        if (tone === "primary") {
            return theme.studio950
        }

        if (tone === "chip" && active) {
            return theme.studio950
        }

        if (tone === "ghost") {
            return root.hovered ? theme.studio100 : theme.studio300
        }

        if (tone === "tab") {
            return active ? theme.studio050 : theme.studio300
        }

        return theme.studio100
    }

    background: Rectangle {
        implicitWidth: root.tone === "icon" ? root.implicitHeight : 124
        radius: root.tone === "chip" ? theme.radiusPill : theme.radiusBadge
        color: root.backgroundColor()
        border.width: root.tone === "ghost" ? (root.hovered || root.activeFocus ? 1 : 0) : 1
        border.color: root.activeFocus ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.72)
                                       : root.borderColor()
    }

    contentItem: Item {
        implicitWidth: contentRow.implicitWidth
        implicitHeight: contentRow.implicitHeight

        RowLayout {
            id: contentRow
            anchors.centerIn: parent
            spacing: iconLabel.visible && textLabel.visible ? 6 : 0

            Label {
                id: iconLabel
                visible: root.iconText.length > 0
                text: root.iconText
                color: root.textColor()
                font.family: root.iconFontFamily
                font.pixelSize: root.iconPixelSize
                font.weight: Font.DemiBold
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }

            Label {
                id: textLabel
                visible: root.text.length > 0
                text: root.text
                color: root.textColor()
                font.family: theme.uiFontFamily
                font.pixelSize: root.compact || root.dense ? theme.textXs : theme.textSm
                font.weight: root.active || root.tone === "primary" ? Font.DemiBold : Font.Medium
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
