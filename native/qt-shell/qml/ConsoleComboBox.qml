import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ComboBox {
    id: root
    property bool dense: false

    ConsoleTheme {
        id: theme
    }

    implicitHeight: dense ? theme.compactControlHeight : theme.controlHeight
    font.family: theme.uiFontFamily
    font.pixelSize: dense ? theme.textXs : theme.textSm

    delegate: ItemDelegate {
        required property var modelData
        required property int index
        width: ListView.view ? ListView.view.width : implicitWidth
        highlighted: root.highlightedIndex === index
        hoverEnabled: true

        background: Rectangle {
            color: parent.highlighted ? theme.studio800 : theme.surfaceRaised
        }

        contentItem: Label {
            text: root.textRole.length > 0 ? parent.modelData[root.textRole] : parent.modelData
            color: theme.studio100
            font.family: theme.uiFontFamily
            font.pixelSize: theme.textSm
            verticalAlignment: Text.AlignVCenter
        }
    }

    indicator: Label {
        x: root.width - width - (root.dense ? 10 : 12)
        y: (root.height - height) / 2
        text: "\u25be"
        color: theme.studio400
        font.family: theme.uiFontFamily
        font.pixelSize: root.dense ? theme.textXs : theme.textSm
    }

    contentItem: Label {
        leftPadding: root.dense ? 10 : 12
        rightPadding: root.dense ? 24 : 28
        text: root.displayText
        color: theme.studio050
        font.family: theme.uiFontFamily
        font.pixelSize: root.dense ? theme.textXs : theme.textSm
        verticalAlignment: Text.AlignVCenter
    }

    background: Rectangle {
        radius: theme.radiusBadge
        color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
        border.width: 1
        border.color: root.activeFocus ? theme.accentPrimary
                                       : root.hovered ? theme.studio600 : theme.surfaceBorder
    }

    popup: Popup {
        y: root.height + 6
        width: root.width
        implicitHeight: contentItem.implicitHeight
        padding: 0

        background: Rectangle {
            radius: theme.radiusCard
            color: Qt.rgba(theme.surfaceRaised.r, theme.surfaceRaised.g, theme.surfaceRaised.b, 0.98)
            border.width: 1
            border.color: theme.surfaceBorder
        }

        contentItem: ListView {
            implicitHeight: contentHeight
            clip: true
            model: root.delegateModel
            currentIndex: root.highlightedIndex
            boundsBehavior: Flickable.StopAtBounds
        }
    }
}
