import QtQuick
import QtQuick.Controls

Slider {
    id: root
    property color fillColor: theme.accentAmber
    property color trackColor: theme.studio750
    property color handleColor: theme.studio050
    property color borderColor: theme.surfaceBorder
    property bool dense: false
    property int barHeight: dense ? 4 : 5

    ConsoleTheme {
        id: theme
    }

    implicitHeight: dense ? 20 : 24
    padding: 0
    leftPadding: 0
    rightPadding: 0
    topPadding: 0
    bottomPadding: 0

    background: Item {
        x: root.leftPadding
        y: root.topPadding + (root.availableHeight - height) / 2
        width: root.availableWidth
        height: Math.max(root.barHeight, sliderHandle.implicitHeight)

        Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            implicitHeight: root.barHeight
            radius: implicitHeight / 2
            color: root.trackColor
            border.width: 1
            border.color: root.borderColor
        }

        Rectangle {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: root.visualPosition * parent.width
            implicitHeight: root.barHeight
            radius: implicitHeight / 2
            color: root.fillColor
        }
    }

    handle: Rectangle {
        id: sliderHandle
        implicitWidth: root.dense ? 12 : 14
        implicitHeight: implicitWidth
        radius: implicitWidth / 2
        x: root.leftPadding + root.visualPosition * (root.availableWidth - width)
        y: root.topPadding + (root.availableHeight - height) / 2
        color: root.pressed ? Qt.lighter(root.handleColor, 1.04) : root.handleColor
        border.width: 1
        border.color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.28)
    }
}
