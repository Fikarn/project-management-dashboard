import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "lighting-toolbar-panel"
    required property var rootWindow
    required property var engineController
    property bool dmxHintVisible: false

    function dmxStatusLabel() {
        if (!engineController || !engineController.lightingEnabled) {
            return "DMX Off"
        }

        return engineController.lightingReachable ? "Bridge Ready" : "Bridge Down"
    }

    function dmxStatusColor() {
        if (!engineController || !engineController.lightingEnabled) {
            return "#8ea4c0"
        }

        return engineController.lightingReachable ? "#6fd3a8" : "#f87171"
    }

    function applyGrandMasterDraft(value) {
        rootWindow.lightingGrandMasterDraft = Math.round(value)
    }

    function commitGrandMaster(value) {
        const rounded = Math.round(value)
        rootWindow.lightingGrandMasterDraft = rounded
        engineController.updateLightingSettings({ "grandMaster": rounded })
    }

    visible: !!engineController && engineController.workspaceMode === "lighting"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: lightingToolbarLayout.implicitHeight + 24

    ColumnLayout {
        id: lightingToolbarLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            RowLayout {
                spacing: 8

                Button {
                    objectName: "lighting-all-on-button"
                    text: "All On"
                    enabled: engineController.lightingFixtureCount > 0
                    onClicked: engineController.setLightingAllPower(true)
                }

                SafetyHoldButton {
                    objectName: "lighting-all-off-button"
                    text: "All Off"
                    delay: 2000
                    enabled: engineController.lightingFixtureCount > 0
                    onActivated: engineController.setLightingAllPower(false)
                }
            }

            Rectangle {
                radius: 10
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: gmLayout.implicitHeight + 18

                RowLayout {
                    id: gmLayout
                    anchors.fill: parent
                    anchors.margins: 9
                    spacing: 8

                    Label {
                        text: "GM"
                        color: "#8ea4c0"
                        font.pixelSize: 11
                        font.weight: Font.DemiBold
                    }

                    Slider {
                        id: grandMasterSlider
                        objectName: "lighting-grand-master-slider"
                        Layout.fillWidth: true
                        from: 0
                        to: 100
                        stepSize: 1
                        value: rootWindow.lightingGrandMasterDraft
                        onValueChanged: {
                            if (pressed) {
                                root.applyGrandMasterDraft(value)
                            }
                        }
                        onPressedChanged: {
                            if (!pressed) {
                                root.commitGrandMaster(value)
                            }
                        }
                    }

                    Label {
                        text: rootWindow.lightingGrandMasterDraft + "%"
                        color: rootWindow.lightingGrandMasterDraft < 100 ? "#f7d47c" : "#d6dce5"
                        font.family: "monospace"
                        font.pixelSize: 11
                    }
                }
            }

            Button {
                objectName: "lighting-refresh-button"
                text: "Refresh"
                onClicked: {
                    engineController.requestLightingSnapshot()
                    engineController.requestLightingDmxMonitorSnapshot()
                }
            }

            Button {
                id: dmxStatusButton
                objectName: "lighting-dmx-status-button"
                text: root.dmxStatusLabel()
                onClicked: root.dmxHintVisible = !root.dmxHintVisible

                contentItem: Label {
                    text: dmxStatusButton.text
                    color: root.dmxStatusColor()
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Rectangle {
            objectName: "lighting-dmx-hint"
            visible: root.dmxHintVisible
            radius: 10
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: dmxHintLabel.implicitHeight + 20

            Label {
                id: dmxHintLabel
                anchors.fill: parent
                anchors.margins: 10
                text: "Status indicator: green means bridge reachable, red means bridge unreachable, gray means output disabled."
                color: "#b9c6d8"
                wrapMode: Text.WordWrap
                font.pixelSize: 11
            }
        }
    }
}
