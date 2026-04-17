import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "audio-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    property bool wideLayout: width >= 1640

    function contentFitsViewport() {
        return audioBottomGrid.y + audioBottomGrid.height <= contentHost.height + 1
               && audioBottomGrid.height > 0
    }

    visible: !!engineController && engineController.workspaceMode === "audio"
    Layout.fillWidth: true
    Layout.fillHeight: true

    Item {
        anchors.fill: parent

        Item {
            id: contentHost
            width: parent.width / root.scaleFactor
            height: parent.height / root.scaleFactor
            scale: root.scaleFactor
            transformOrigin: Item.TopLeft

            ColumnLayout {
                id: audioRootLayout
                anchors.fill: parent
                spacing: 12

                GridLayout {
                    id: audioTopGrid
                    Layout.fillWidth: true
                    columns: root.wideLayout ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    AudioToolbarPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                    }

                    AudioMixTargetsPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                    }
                }

                GridLayout {
                    id: audioBottomGrid
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    columns: root.wideLayout ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    AudioChannelsPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        Layout.minimumHeight: 0
                    }

                    AudioSelectedStripPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        Layout.minimumHeight: 0
                    }
                }
            }
        }
    }
}
