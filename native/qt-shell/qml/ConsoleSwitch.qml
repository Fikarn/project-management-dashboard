import QtQuick
import QtQuick.Controls

Switch {
    id: root
    property bool dense: false
    property color onColor: theme.accentBlue
    property color offColor: theme.studio650

    ConsoleTheme {
        id: theme
    }

    implicitWidth: dense ? 34 : 38
    implicitHeight: dense ? 18 : 20
    spacing: 0
    padding: 0
    leftPadding: 0
    rightPadding: 0

    indicator: Rectangle {
        implicitWidth: root.dense ? 34 : 38
        implicitHeight: root.dense ? 18 : 20
        radius: implicitHeight / 2
        color: root.checked ? root.onColor : root.offColor
        border.width: 1
        border.color: root.checked
                      ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.34)
                      : theme.surfaceBorder

        Rectangle {
            width: parent.height - 4
            height: parent.height - 4
            radius: width / 2
            x: root.checked ? parent.width - width - 2 : 2
            y: 2
            color: theme.studio050
            border.width: 1
            border.color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.18)
        }
    }

    contentItem: Item {
        implicitWidth: 0
        implicitHeight: 0
    }
}
