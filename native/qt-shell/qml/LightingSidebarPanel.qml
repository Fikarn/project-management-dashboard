import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "LightingParityHelpers.js" as LightingParityHelpers

Rectangle {
    id: root
    objectName: "lighting-sidebar-panel"
    required property var rootWindow
    required property var engineController
    required property string viewMode
    required property bool showDmxMonitor
    signal viewModeSelected(string nextViewMode)
    signal dmxMonitorToggled()

    function lightingSettingsDirty() {
        if (!engineController || !engineController.lightingSnapshotLoaded) {
            return false
        }

        return rootWindow.lightingEnabledDraft !== engineController.lightingEnabled
               || rootWindow.lightingBridgeIpDraft !== engineController.lightingBridgeIp
               || rootWindow.lightingUniverseDraft !== engineController.lightingUniverse
               || rootWindow.lightingGrandMasterDraft !== engineController.lightingGrandMaster
    }

    function saveLightingSettings() {
        engineController.updateLightingSettings({
            "enabled": rootWindow.lightingEnabledDraft,
            "bridgeIp": rootWindow.lightingBridgeIpDraft.trim(),
            "universe": rootWindow.lightingUniverseDraft,
            "grandMaster": rootWindow.lightingGrandMasterDraft
        })
    }

    readonly property var selectedFixture: rootWindow.lightingFixtureById(
                                             engineController ? engineController.lightingSelectedFixtureId : ""
                                         )
    readonly property var selectedSceneOptions: rootWindow.lightingSceneOptions()
    readonly property var fixtureOptions: rootWindow.lightingFixtureOptions()
    readonly property var groupOptions: rootWindow.lightingGroupOptions()

    visible: !!engineController && engineController.workspaceMode === "lighting"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true

    ScrollView {
        anchors.fill: parent
        anchors.margins: 12
        clip: true
        contentWidth: availableWidth

        Item {
            width: parent.width
            implicitHeight: sidebarLayout.implicitHeight

            ColumnLayout {
                id: sidebarLayout
                width: parent.width
                spacing: 10

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: controlRailLayout.implicitHeight + 20

                    ColumnLayout {
                        id: controlRailLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Control Rail"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        GridLayout {
                            Layout.fillWidth: true
                            columns: 2
                            columnSpacing: 8
                            rowSpacing: 8

                            Repeater {
                                model: [
                                    { "label": "Fixtures", "value": engineController.lightingFixtureCount },
                                    { "label": "Live", "value": LightingParityHelpers.liveFixtureCount(engineController.lightingFixtures) },
                                    { "label": "Scenes", "value": engineController.lightingSceneCount },
                                    {
                                        "label": "Selected",
                                        "value": engineController.lightingSelectedFixtureId.length
                                                 ? "1 / " + engineController.lightingGroupCount
                                                 : "0 / " + engineController.lightingGroupCount
                                    }
                                ]

                                Rectangle {
                                    required property var modelData
                                    radius: 8
                                    color: "#111a28"
                                    border.color: "#24344a"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 56

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 8
                                        spacing: 1

                                        Label {
                                            text: modelData.label
                                            color: "#8ea4c0"
                                            font.pixelSize: 10
                                        }
                                        Label {
                                            text: modelData.value
                                            color: "#f5f7fb"
                                            font.pixelSize: 14
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Repeater {
                                model: [
                                    { "id": "expanded", "name": "Grid" },
                                    { "id": "compact", "name": "List" },
                                    { "id": "spatial", "name": "Studio" }
                                ]

                                Button {
                                    required property var modelData
                                    objectName: "lighting-view-" + modelData.id
                                    text: modelData.name
                                    highlighted: root.viewMode === modelData.id
                                    onClicked: root.viewModeSelected(modelData.id)
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Button {
                                objectName: "lighting-add-fixture-button"
                                text: "Add Light"
                                enabled: rootWindow.lightingNewFixtureNameDraft.trim().length > 0
                                onClicked: {
                                    engineController.createLightingFixture({
                                        "name": rootWindow.lightingNewFixtureNameDraft.trim(),
                                        "type": rootWindow.lightingNewFixtureTypeDraft,
                                        "dmxStartAddress": rootWindow.lightingNewFixtureDmxDraft,
                                        "groupId": rootWindow.lightingNewFixtureGroupDraft.length
                                                   ? rootWindow.lightingNewFixtureGroupDraft
                                                   : null
                                    })
                                    rootWindow.lightingNewFixtureNameDraft = ""
                                }
                            }

                            Button {
                                objectName: "lighting-monitor-toggle"
                                text: root.showDmxMonitor ? "Hide DMX" : "DMX Monitor"
                                onClicked: root.dmxMonitorToggled()
                            }

                            Button {
                                text: "Refresh"
                                onClicked: {
                                    engineController.requestLightingSnapshot()
                                    engineController.requestLightingDmxMonitorSnapshot()
                                }
                            }

                            Button {
                                text: "Select First Unplaced"
                                enabled: LightingParityHelpers.firstUnplacedFixtureId(engineController.lightingFixtures).length > 0
                                onClicked: engineController.updateLightingSettings({
                                    "selectedFixtureId": LightingParityHelpers.firstUnplacedFixtureId(engineController.lightingFixtures)
                                })
                            }
                        }

                        TextField {
                            Layout.fillWidth: true
                            placeholderText: "New fixture name"
                            text: rootWindow.lightingNewFixtureNameDraft
                            onTextChanged: rootWindow.lightingNewFixtureNameDraft = text
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            ComboBox {
                                Layout.fillWidth: true
                                model: rootWindow.lightingFixtureTypeOptions()
                                textRole: "name"
                                currentIndex: rootWindow.lightingFixtureTypeIndex(rootWindow.lightingNewFixtureTypeDraft, model)
                                onActivated: {
                                    rootWindow.lightingNewFixtureTypeDraft = model[currentIndex].id
                                    rootWindow.lightingNewFixtureDmxDraft = Math.min(
                                        rootWindow.lightingNewFixtureDmxDraft,
                                        rootWindow.lightingFixtureMaxStartAddress(rootWindow.lightingNewFixtureTypeDraft)
                                    )
                                }
                            }

                            SpinBox {
                                from: 1
                                to: rootWindow.lightingFixtureMaxStartAddress(rootWindow.lightingNewFixtureTypeDraft)
                                value: rootWindow.lightingNewFixtureDmxDraft
                                editable: true
                                onValueModified: rootWindow.lightingNewFixtureDmxDraft = value
                            }

                            ComboBox {
                                Layout.preferredWidth: 150
                                model: root.groupOptions
                                textRole: "name"
                                currentIndex: rootWindow.lightingGroupIndex(rootWindow.lightingNewFixtureGroupDraft, model)
                                onActivated: rootWindow.lightingNewFixtureGroupDraft = model[currentIndex].id
                            }
                        }
                    }
                }

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: transportLayout.implicitHeight + 20

                    ColumnLayout {
                        id: transportLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Bridge Transport"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        CheckBox {
                            text: "Enable DMX output"
                            checked: rootWindow.lightingEnabledDraft
                            onToggled: rootWindow.lightingEnabledDraft = checked
                        }

                        TextField {
                            Layout.fillWidth: true
                            placeholderText: "Bridge IP"
                            text: rootWindow.lightingBridgeIpDraft
                            onTextChanged: rootWindow.lightingBridgeIpDraft = text
                        }

                        SpinBox {
                            Layout.fillWidth: true
                            from: 1
                            to: 63999
                            value: rootWindow.lightingUniverseDraft
                            editable: true
                            onValueModified: rootWindow.lightingUniverseDraft = value
                        }

                        Label {
                            text: "GM draft " + rootWindow.lightingGrandMasterDraft + "%  |  "
                                  + (engineController.lightingReachable ? "Bridge reachable" : "Bridge pending")
                            color: "#8ea4c0"
                            font.pixelSize: 10
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Button {
                                text: "Save"
                                enabled: root.lightingSettingsDirty()
                                onClicked: root.saveLightingSettings()
                            }
                            Button {
                                text: "Probe"
                                enabled: rootWindow.lightingBridgeIpDraft.trim().length > 0
                                onClicked: engineController.runLightingProbe(
                                               rootWindow.lightingBridgeIpDraft.trim(),
                                               rootWindow.lightingUniverseDraft
                                           )
                            }
                            Button {
                                text: "Refresh"
                                onClicked: engineController.requestLightingSnapshot()
                            }
                        }
                    }
                }

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: selectedFixtureLayout.implicitHeight + 20

                    ColumnLayout {
                        id: selectedFixtureLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Selected Fixture"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        ComboBox {
                            Layout.fillWidth: true
                            model: root.fixtureOptions
                            textRole: "name"
                            currentIndex: rootWindow.lightingFixtureIndex(engineController.lightingSelectedFixtureId, model)
                            onActivated: {
                                const selectedFixture = model[currentIndex]
                                engineController.updateLightingSettings({
                                    "selectedFixtureId": selectedFixture.id.length ? selectedFixture.id : null
                                })
                            }
                        }

                        Label {
                            visible: !root.selectedFixture
                            text: "Choose a fixture to edit intensity, CCT, plot position, and quick actions."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ColumnLayout {
                            visible: !!root.selectedFixture
                            spacing: 6
                            Layout.fillWidth: true

                            Label {
                                text: root.selectedFixture
                                      ? root.selectedFixture.name + "  |  DMX " + root.selectedFixture.dmxStartAddress
                                      : ""
                                color: "#d6dce5"
                                font.pixelSize: 11
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                Button {
                                    text: root.selectedFixture && root.selectedFixture.on ? "Turn Off" : "Turn On"
                                    onClicked: engineController.setLightingFixturePower(root.selectedFixture.id, !root.selectedFixture.on)
                                }
                                Button {
                                    text: "Center"
                                    onClicked: engineController.updateLightingFixture(root.selectedFixture.id, {
                                        "spatialX": 0.5,
                                        "spatialY": 0.5
                                    })
                                }
                                Button {
                                    text: "Reset Auto"
                                    onClicked: engineController.updateLightingFixture(root.selectedFixture.id, {
                                        "spatialX": null,
                                        "spatialY": null,
                                        "spatialRotation": 0
                                    })
                                }
                            }

                            Label { text: "Intensity"; color: "#8ea4c0"; font.pixelSize: 10 }
                            Slider {
                                Layout.fillWidth: true
                                from: 0
                                to: 100
                                stepSize: 1
                                value: root.selectedFixture ? root.selectedFixture.intensity : 0
                                onPressedChanged: {
                                    if (!pressed && root.selectedFixture) {
                                        engineController.updateLightingFixture(root.selectedFixture.id, { "intensity": Math.round(value) })
                                    }
                                }
                            }

                            Label { text: "CCT"; color: "#8ea4c0"; font.pixelSize: 10 }
                            Slider {
                                Layout.fillWidth: true
                                from: root.selectedFixture ? rootWindow.lightingFixtureMinCct(root.selectedFixture.type) : 2000
                                to: root.selectedFixture ? rootWindow.lightingFixtureMaxCct(root.selectedFixture.type) : 10000
                                stepSize: 100
                                value: root.selectedFixture ? root.selectedFixture.cct : 5600
                                onPressedChanged: {
                                    if (!pressed && root.selectedFixture) {
                                        engineController.updateLightingFixture(root.selectedFixture.id, {
                                            "cct": Math.round(value / 100) * 100
                                        })
                                    }
                                }
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: rootWindow.lightingEffectOptions()

                                    Button {
                                        required property var modelData
                                        text: modelData.name
                                        highlighted: !!root.selectedFixture && !!root.selectedFixture.effect && root.selectedFixture.effect.type === modelData.id
                                        onClicked: {
                                            const fixture = root.selectedFixture
                                            const currentEffect = fixture.effect
                                            const isActive = currentEffect && currentEffect.type === modelData.id
                                            engineController.updateLightingFixture(fixture.id, {
                                                "effect": isActive ? null : {
                                                    "type": modelData.id,
                                                    "speed": currentEffect ? currentEffect.speed : 5
                                                }
                                            })
                                        }
                                    }
                                }
                            }

                            Label { text: "X"; color: "#8ea4c0"; font.pixelSize: 10 }
                            Slider {
                                Layout.fillWidth: true
                                from: 0
                                to: 100
                                stepSize: 1
                                value: rootWindow.lightingSpatialPercent(root.selectedFixture ? root.selectedFixture.spatialX : null, 50)
                                onPressedChanged: {
                                    if (!pressed && root.selectedFixture) {
                                        engineController.updateLightingFixture(root.selectedFixture.id, { "spatialX": value / 100 })
                                    }
                                }
                            }

                            Label { text: "Y"; color: "#8ea4c0"; font.pixelSize: 10 }
                            Slider {
                                Layout.fillWidth: true
                                from: 0
                                to: 100
                                stepSize: 1
                                value: rootWindow.lightingSpatialPercent(root.selectedFixture ? root.selectedFixture.spatialY : null, 50)
                                onPressedChanged: {
                                    if (!pressed && root.selectedFixture) {
                                        engineController.updateLightingFixture(root.selectedFixture.id, { "spatialY": value / 100 })
                                    }
                                }
                            }

                            Label { text: "Rotation"; color: "#8ea4c0"; font.pixelSize: 10 }
                            Slider {
                                Layout.fillWidth: true
                                from: 0
                                to: 359
                                stepSize: 1
                                value: rootWindow.lightingSpatialRotation(root.selectedFixture ? root.selectedFixture.spatialRotation : 0)
                                onPressedChanged: {
                                    if (!pressed && root.selectedFixture) {
                                        engineController.updateLightingFixture(root.selectedFixture.id, { "spatialRotation": Math.round(value) })
                                    }
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: scenesLayout.implicitHeight + 20

                    ColumnLayout {
                        id: scenesLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Scenes"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        TextField {
                            Layout.fillWidth: true
                            placeholderText: "New scene name"
                            text: rootWindow.lightingNewSceneNameDraft
                            onTextChanged: rootWindow.lightingNewSceneNameDraft = text
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            ComboBox {
                                Layout.fillWidth: true
                                model: root.selectedSceneOptions
                                textRole: "name"
                                currentIndex: rootWindow.lightingSceneIndex(engineController.lightingSelectedSceneId, model)
                                onActivated: {
                                    const selectedScene = model[currentIndex]
                                    engineController.updateLightingSettings({
                                        "selectedSceneId": selectedScene.id.length ? selectedScene.id : null
                                    })
                                }
                            }

                            Button {
                                text: "Save"
                                enabled: rootWindow.lightingNewSceneNameDraft.trim().length > 0
                                onClicked: {
                                    engineController.createLightingScene(rootWindow.lightingNewSceneNameDraft.trim())
                                    rootWindow.lightingNewSceneNameDraft = ""
                                }
                            }
                        }

                        Repeater {
                            model: engineController.lightingScenes

                            Rectangle {
                                required property var modelData
                                radius: 8
                                color: "#111a28"
                                border.color: engineController.lightingSelectedSceneId === modelData.id ? "#6aa9ff" : "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 120

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true

                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            spacing: 1

                                            Label {
                                                text: modelData.name
                                                color: "#f5f7fb"
                                                font.pixelSize: 11
                                                font.weight: Font.DemiBold
                                            }
                                            Label {
                                                text: modelData.lastRecalledAt
                                                      ? "Last recalled " + rootWindow.formatTimestamp(modelData.lastRecalledAt)
                                                      : "Hold to recall"
                                                color: modelData.lastRecalled ? "#6fd3a8" : "#8ea4c0"
                                                font.pixelSize: 10
                                            }
                                        }

                                        Button {
                                            text: "Select"
                                            enabled: engineController.lightingSelectedSceneId !== modelData.id
                                            onClicked: engineController.updateLightingSettings({ "selectedSceneId": modelData.id })
                                        }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        SafetyHoldButton {
                                            text: "Recall"
                                            delay: 1500
                                            Layout.fillWidth: true
                                            onActivated: engineController.recallLightingScene(modelData.id)
                                        }
                                        Button {
                                            text: "Capture"
                                            onClicked: engineController.updateLightingScene(modelData.id, { "captureCurrentState": true })
                                        }
                                        Button {
                                            text: "Delete"
                                            onClicked: engineController.deleteLightingScene(modelData.id)
                                        }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        TextField {
                                            id: sceneRenameField
                                            Layout.fillWidth: true
                                            placeholderText: "Rename " + modelData.name
                                        }
                                        Button {
                                            text: "Rename"
                                            enabled: sceneRenameField.text.trim().length > 0
                                            onClicked: {
                                                engineController.updateLightingScene(modelData.id, { "name": sceneRenameField.text.trim() })
                                                sceneRenameField.text = ""
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: groupsLayout.implicitHeight + 20

                    ColumnLayout {
                        id: groupsLayout
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        Label {
                            text: "Groups"
                            color: "#f5f7fb"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            TextField {
                                Layout.fillWidth: true
                                placeholderText: "New group name"
                                text: rootWindow.lightingNewGroupNameDraft
                                onTextChanged: rootWindow.lightingNewGroupNameDraft = text
                            }
                            Button {
                                text: "Add"
                                enabled: rootWindow.lightingNewGroupNameDraft.trim().length > 0
                                onClicked: {
                                    engineController.createLightingGroup(rootWindow.lightingNewGroupNameDraft.trim())
                                    rootWindow.lightingNewGroupNameDraft = ""
                                }
                            }
                        }

                        Repeater {
                            model: engineController.lightingGroups

                            Rectangle {
                                required property var modelData
                                radius: 8
                                color: "#111a28"
                                border.color: "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 102

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 6

                                    RowLayout {
                                        Layout.fillWidth: true

                                        Label {
                                            text: modelData.name + "  |  " + modelData.fixtureCount + " fixtures"
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                            Layout.fillWidth: true
                                        }

                                        Button {
                                            text: "All On"
                                            onClicked: engineController.setLightingGroupPower(modelData.id, true)
                                        }
                                        Button {
                                            text: "All Off"
                                            onClicked: engineController.setLightingGroupPower(modelData.id, false)
                                        }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        TextField {
                                            id: groupRenameField
                                            Layout.fillWidth: true
                                            placeholderText: "Rename " + modelData.name
                                        }
                                        Button {
                                            text: "Rename"
                                            enabled: groupRenameField.text.trim().length > 0
                                            onClicked: {
                                                engineController.updateLightingGroup(modelData.id, { "name": groupRenameField.text.trim() })
                                                groupRenameField.text = ""
                                            }
                                        }
                                        Button {
                                            text: "Delete"
                                            onClicked: engineController.deleteLightingGroup(modelData.id)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                LightingDmxMonitorPanel {
                    visible: root.showDmxMonitor
                    engineController: root.engineController
                }
            }
        }
    }
}
