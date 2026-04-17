import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "setup-connection-probe-panel"
    required property var rootWindow
    required property var engineController
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
        if (engineController.controlSurfaceBaseUrl.length > 0) {
            return "Checks the local Companion action endpoint at " + engineController.controlSurfaceBaseUrl + "."
        }
        return "Checks the local Companion action endpoint once the bridge is ready."
    }

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true

    ColumnLayout {
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
                    color: "#8ea4c0"
                    font.pixelSize: 11
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
                    color: "#b4c0cf"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Button {
                objectName: "setup-run-probe"
                text: "Run Probe"
                enabled: engineController.operatorUiReady
                onClicked: engineController.runControlSurfaceProbe()
            }
        }
    }
}
