import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-connection-probe-panel"
    required property var rootWindow
    required property var engineController
    property bool denseMode: false
    property var probeState: rootWindow.commissioningCheckById("control-surface")

    function probeStatusLabel() {
        if (root.probeState) {
            return rootWindow.commissioningStatusLabel(root.probeState.status)
        }
        return engineController.controlSurfaceAvailable ? "Console reachable" : "Not tested"
    }

    function probeStatusColor() {
        if (root.probeState) {
            return rootWindow.commissioningStatusColor(root.probeState.status)
        }
        return engineController.controlSurfaceAvailable ? "#6fd3a4" : "#9bb0c9"
    }

    function probeMessage() {
        if (root.probeState && root.probeState.message) {
            return root.probeState.message
        }
        return "Checks the local Companion action endpoint at /api/deck/context."
    }

    ConsoleTheme {
        id: theme
    }

    radius: 18
    color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: connectionProbeLayout.implicitHeight + 24

    ColumnLayout {
        id: connectionProbeLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Connection Probe"
                    color: theme.studio500
                    font.pixelSize: 10
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.6
                }

                Label {
                    objectName: "setup-connection-status"
                    text: root.probeStatusLabel()
                    color: root.probeStatusColor()
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    text: root.probeMessage()
                    color: theme.studio500
                    font.pixelSize: 10
                    lineHeight: 1.5
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            ConsoleButton {
                objectName: "setup-run-probe"
                text: "Run Probe"
                tone: "primary"
                dense: true
                enabled: engineController.operatorUiReady
                onClicked: engineController.runControlSurfaceProbe()
            }
        }
    }
}
