import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

GridLayout {
    required property var rootWindow
    required property var engineController

    Layout.fillWidth: true
    visible: engineController.workspaceMode === "planning"
    columns: rootWindow.width >= 1180 ? 4 : rootWindow.width >= 900 ? 2 : 1
    columnSpacing: 12
    rowSpacing: 12

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        Layout.preferredHeight: 88

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 4

            Label { text: "Projects"; color: "#8ea4c0"; font.pixelSize: 12 }
            Label {
                text: engineController.planningProjectCount
                color: "#f5f7fb"
                font.pixelSize: 22
                font.weight: Font.DemiBold
            }
        }
    }

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        Layout.preferredHeight: 320

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            Label { text: "Transport"; color: "#8ea4c0"; font.pixelSize: 12 }

            Label {
                text: engineController.lightingSnapshotLoaded
                      ? engineController.lightingDetails
                      : "Lighting transport state is waiting for the engine snapshot."
                color: "#f5f7fb"
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    Layout.fillWidth: true
                    placeholderText: "Apollo Bridge IP"
                    text: rootWindow.lightingBridgeIpDraft
                    onTextChanged: rootWindow.lightingBridgeIpDraft = text
                }

                SpinBox {
                    Layout.preferredWidth: 110
                    from: 1
                    to: 63999
                    value: rootWindow.lightingUniverseDraft
                    editable: true
                    onValueModified: rootWindow.lightingUniverseDraft = value
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                CheckBox {
                    text: "Output enabled"
                    checked: rootWindow.lightingEnabledDraft
                    onToggled: rootWindow.lightingEnabledDraft = checked
                }

                Item { Layout.fillWidth: true }

                Button {
                    text: "Save"
                    enabled: !rootWindow.lightingEnabledDraft
                             || rootWindow.lightingBridgeIpDraft.trim().length > 0
                    onClicked: engineController.updateLightingSettings(
                                   {
                                       "enabled": rootWindow.lightingEnabledDraft,
                                       "bridgeIp": rootWindow.lightingBridgeIpDraft.trim(),
                                       "universe": rootWindow.lightingUniverseDraft
                                   }
                               )
                }

                Button {
                    text: "Probe"
                    enabled: rootWindow.lightingBridgeIpDraft.trim().length > 0
                    onClicked: engineController.runLightingProbe(
                                   rootWindow.lightingBridgeIpDraft.trim(),
                                   rootWindow.lightingUniverseDraft
                               )
                }
            }

            Label {
                text: "Grand Master"
                color: "#8ea4c0"
                font.pixelSize: 10
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Slider {
                    Layout.fillWidth: true
                    from: 0
                    to: 100
                    stepSize: 1
                    value: rootWindow.lightingGrandMasterDraft
                    onMoved: rootWindow.lightingGrandMasterDraft = Math.round(value)
                    onPressedChanged: {
                        if (!pressed) {
                            rootWindow.lightingGrandMasterDraft = Math.round(value)
                            engineController.updateLightingSettings(
                                { "grandMaster": rootWindow.lightingGrandMasterDraft }
                            )
                        }
                    }
                }

                Label {
                    text: rootWindow.lightingGrandMasterDraft + "%"
                    color: "#f5f7fb"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Label {
                    text: "Scene Focus"
                    color: "#8ea4c0"
                    font.pixelSize: 10
                }

                ComboBox {
                    Layout.fillWidth: true
                    model: rootWindow.lightingSceneOptions()
                    textRole: "name"
                    currentIndex: rootWindow.lightingSceneIndex(
                                      engineController.lightingSelectedSceneId,
                                      model
                                  )
                    onActivated: {
                        const selectedScene = model[currentIndex]
                        engineController.updateLightingSettings(
                            {
                                "selectedSceneId": selectedScene.id.length > 0
                                                   ? selectedScene.id
                                                   : null
                            }
                        )
                    }
                }
            }
        }
    }

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        Layout.preferredHeight: 88

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 4

            Label { text: "Tasks"; color: "#8ea4c0"; font.pixelSize: 12 }
            Label {
                text: engineController.planningTaskCount
                color: "#f5f7fb"
                font.pixelSize: 22
                font.weight: Font.DemiBold
            }
        }
    }

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        Layout.preferredHeight: 88

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 4

            Label { text: "Running"; color: "#8ea4c0"; font.pixelSize: 12 }
            Label {
                text: engineController.planningRunningTaskCount
                color: "#f5f7fb"
                font.pixelSize: 22
                font.weight: Font.DemiBold
            }
        }
    }

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        Layout.preferredHeight: 88

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 4

            Label { text: "Completed"; color: "#8ea4c0"; font.pixelSize: 12 }
            Label {
                text: engineController.planningCompletedTaskCount
                color: "#f5f7fb"
                font.pixelSize: 22
                font.weight: Font.DemiBold
            }
        }
    }
}
