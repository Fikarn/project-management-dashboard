import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "lighting-toolbar-panel"
    required property var rootWindow
    required property var engineController
    property bool dmxHintVisible: false

    ConsoleTheme {
        id: theme
    }

    function dmxStatusLabel() {
        if (!engineController || !engineController.lightingEnabled) {
            return "DMX Off"
        }

        return engineController.lightingReachable ? "Bridge Ready" : "Bridge Down"
    }

    function dmxStatusColor() {
        if (!engineController || !engineController.lightingEnabled) {
            return theme.studio500
        }

        return engineController.lightingReachable ? theme.accentGreen : theme.accentRed
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
    radius: theme.radiusCard
    color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.42)
    border.color: theme.surfaceBorder
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: toolbarRow.implicitHeight + 14

    RowLayout {
        id: toolbarRow
        anchors.fill: parent
        anchors.margins: 7
        spacing: theme.spacing4

        RowLayout {
            spacing: 0

            ConsoleButton {
                objectName: "lighting-all-on-button"
                text: "All On"
                dense: true
                enabled: engineController.lightingFixtureCount > 0
                onClicked: engineController.setLightingAllPower(true)
            }

            SafetyHoldButton {
                objectName: "lighting-all-off-button"
                text: "All Off"
                dense: true
                delay: 2000
                enabled: engineController.lightingFixtureCount > 0
                onActivated: engineController.setLightingAllPower(false)
            }
        }

        Rectangle {
            radius: theme.radiusBadge
            color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.95)
            border.color: theme.surfaceBorder
            border.width: 1
            Layout.fillWidth: true
            implicitHeight: gmLayout.implicitHeight + 10

            RowLayout {
                id: gmLayout
                anchors.fill: parent
                anchors.margins: 7
                spacing: theme.spacing4

                Label {
                    text: "GM"
                    color: theme.studio500
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.weight: Font.DemiBold
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.1
                }

                ConsoleSlider {
                    id: grandMasterSlider
                    objectName: "lighting-grand-master-slider"
                    Layout.fillWidth: true
                    dense: true
                    from: 0
                    to: 100
                    stepSize: 1
                    value: rootWindow.lightingGrandMasterDraft
                    fillColor: theme.accentAmber
                    trackColor: theme.studio750
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
                    color: rootWindow.lightingGrandMasterDraft < 100 ? theme.accentAmber : theme.studio300
                    font.family: theme.monoFontFamily
                    font.pixelSize: theme.textXs
                }
            }
        }

        RowLayout {
            Layout.alignment: Qt.AlignVCenter
            spacing: theme.spacing2

            ConsoleButton {
                objectName: "lighting-refresh-button"
                dense: true
                text: "Refresh"
                onClicked: {
                    engineController.requestLightingSnapshot()
                    engineController.requestLightingDmxMonitorSnapshot()
                }
            }

            ConsoleButton {
                id: dmxStatusButton
                objectName: "lighting-dmx-status-button"
                dense: true
                text: root.dmxStatusLabel()
                onClicked: root.dmxHintVisible = !root.dmxHintVisible

                contentItem: RowLayout {
                    spacing: 6

                    Rectangle {
                        implicitWidth: 6
                        implicitHeight: 6
                        radius: 3
                        color: root.dmxStatusColor()
                    }

                    Label {
                        text: dmxStatusButton.text
                        color: root.dmxStatusColor()
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXs
                        font.weight: Font.DemiBold
                    }
                }
            }
        }
    }
}
