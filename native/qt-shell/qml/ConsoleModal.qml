import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    required property bool open
    property string title: ""
    property string subtitle: ""
    property int dialogWidth: 760
    property int dialogHeight: -1
    property string verticalPlacement: "center"
    property int topMargin: 88
    property bool showCloseButton: true
    signal closeRequested()
    default property alias contentData: modalContent.data

    function requestClose() {
        root.closeRequested()
    }

    function resolvedTopMargin() {
        if (!parent) {
            return topMargin
        }

        return Math.max(topMargin, Math.round(parent.height * 0.08))
    }

    ConsoleTheme {
        id: theme
    }

    anchors.fill: parent
    visible: open
    z: 60

    Rectangle {
        anchors.fill: parent
        color: theme.overlayScrim
        opacity: 0.82

        TapHandler {
            onTapped: root.requestClose()
        }
    }

    ConsoleSurface {
        x: Math.round(((parent ? parent.width : width) - width) / 2)
        y: root.verticalPlacement === "top"
           ? root.resolvedTopMargin()
           : Math.round(((parent ? parent.height : height) - height) / 2)
        width: Math.min(root.dialogWidth, parent ? parent.width - 56 : root.dialogWidth)
        height: root.dialogHeight > 0
                ? Math.min(
                      root.dialogHeight,
                      parent
                      ? parent.height - (root.verticalPlacement === "top" ? root.resolvedTopMargin() + 40 : 72)
                      : root.dialogHeight
                  )
                : implicitHeight
        tone: "modal"
        padding: theme.spacing9

        ColumnLayout {
            anchors.fill: parent
            spacing: theme.spacing7

            RowLayout {
                visible: root.title.length > 0 || root.subtitle.length > 0 || root.showCloseButton
                Layout.fillWidth: true
                spacing: theme.spacing6

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Label {
                        visible: root.title.length > 0
                        text: root.title
                        color: theme.studio050
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXl
                        font.weight: Font.DemiBold
                    }

                    Label {
                        visible: root.subtitle.length > 0
                        text: root.subtitle
                        color: theme.studio400
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textSm
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }

                ConsoleButton {
                    visible: root.showCloseButton
                    tone: "ghost"
                    text: "Close"
                    onClicked: root.requestClose()
                }
            }

            ColumnLayout {
                id: modalContent
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: theme.spacing6
            }
        }
    }
}
