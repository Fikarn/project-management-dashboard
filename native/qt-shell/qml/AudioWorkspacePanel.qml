import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "audio-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    property bool fullscreenOperatorLayout: width >= 2200
    property bool wideLayout: width >= 1320
    property bool stackedLayout: width < 1180

    function contentFitsViewport() {
        const contentBottom = stackedLayout
                              ? stackedBodyColumn.y + stackedBodyColumn.height
                              : wideBodyRow.y + wideBodyRow.height
        return contentBottom <= contentHost.height + 1 && contentBottom > 0
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
                spacing: 10

                RowLayout {
                    id: topConsoleRow
                    Layout.fillWidth: true
                    spacing: 10

                    AudioToolbarPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                        Layout.preferredWidth: root.stackedLayout ? contentHost.width : (root.fullscreenOperatorLayout ? 1120 : 960)
                    }

                    AudioMixTargetsPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        visible: !root.stackedLayout
                        Layout.fillWidth: true
                        Layout.preferredWidth: root.fullscreenOperatorLayout ? 1360 : 1180
                    }
                }

                ColumnLayout {
                    id: stackedBodyColumn
                    visible: root.stackedLayout
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 12

                    AudioMixTargetsPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                    }

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

                RowLayout {
                    id: wideBodyRow
                    visible: !root.stackedLayout
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 12

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
                        Layout.preferredWidth: root.fullscreenOperatorLayout ? 304 : 292
                        Layout.fillHeight: true
                        Layout.minimumHeight: 0
                    }
                }
            }
        }
    }
}
