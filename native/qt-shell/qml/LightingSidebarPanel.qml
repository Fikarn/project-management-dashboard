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
    property bool embeddedChrome: false
    signal viewModeSelected(string nextViewMode)
    signal dmxMonitorToggled()
    property bool showSettings: false
    property bool addLightDialogVisible: false
    property var renamingScene: null
    property string renameSceneDraft: ""
    property var pendingDeleteScene: null
    property var renamingGroup: null
    property string renameGroupDraft: ""
    property var pendingDeleteGroup: null
    property real sceneFadeDuration: 0

    ConsoleTheme {
        id: theme
    }

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

    function lightStateColor(state) {
        if (!state || state.on === false) {
            return theme.studio750
        }

        if (state.colorMode === "rgb" || state.colorMode === "hsi") {
            return Qt.rgba(
                Number(state.red || 0) / 255,
                Number(state.green || 0) / 255,
                Number(state.blue || 0) / 255,
                1
            )
        }

        const cct = Number(state.cct || 5600)
        if (cct <= 3200) {
            return "#ffb35c"
        }
        if (cct <= 4400) {
            return "#ffd38b"
        }
        return "#eaf0ff"
    }

    readonly property var fixtureOptions: rootWindow.lightingFixtureOptions()
    readonly property var groupOptions: rootWindow.lightingGroupOptions()

    function closeTransientDialogs() {
        root.addLightDialogVisible = false
        root.renamingScene = null
        root.renameSceneDraft = ""
        root.pendingDeleteScene = null
        root.renamingGroup = null
        root.renameGroupDraft = ""
        root.pendingDeleteGroup = null
    }

    function openAddFixtureDialogForVerify() {
        root.showSettings = false
        root.addLightDialogVisible = true
        return true
    }

    function openDeleteSceneDialogForVerify() {
        if (!engineController || !engineController.lightingScenes.length) {
            return false
        }

        root.pendingDeleteScene = engineController.lightingScenes[0]
        return true
    }

    function openRenameSceneDialogForVerify() {
        if (!engineController || !engineController.lightingScenes.length) {
            return false
        }

        root.startRenameScene(engineController.lightingScenes[0])
        return true
    }

    function openRenameGroupDialogForVerify() {
        if (!engineController || !engineController.lightingGroups.length) {
            return false
        }

        root.startRenameGroup(engineController.lightingGroups[0])
        return true
    }

    function openDeleteGroupDialogForVerify() {
        if (!engineController || !engineController.lightingGroups.length) {
            return false
        }

        root.pendingDeleteGroup = engineController.lightingGroups[0]
        return true
    }

    function startRenameGroup(group) {
        if (!group) {
            return
        }

        root.renamingGroup = group
        root.renameGroupDraft = group.name ? group.name : ""
        Qt.callLater(function() {
            renameGroupField.forceActiveFocus()
            renameGroupField.selectAll()
        })
    }

    function startRenameScene(scene) {
        if (!scene) {
            return
        }

        root.renamingScene = scene
        root.renameSceneDraft = scene.name ? scene.name : ""
    }

    function commitRenameScene() {
        const trimmedName = root.renameSceneDraft.trim()
        if (!trimmedName.length || !root.renamingScene || !engineController) {
            return
        }

        engineController.updateLightingScene(root.renamingScene.id, { "name": trimmedName })
        root.renamingScene = null
        root.renameSceneDraft = ""
    }

    function commitRenameGroup() {
        const trimmedName = root.renameGroupDraft.trim()
        if (!trimmedName.length || !root.renamingGroup || !engineController) {
            return
        }

        engineController.updateLightingGroup(root.renamingGroup.id, { "name": trimmedName })
        root.renamingGroup = null
        root.renameGroupDraft = ""
    }

    visible: !!engineController && engineController.workspaceMode === "lighting"
    radius: theme.radiusCard
    color: root.embeddedChrome ? "transparent" : Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.36)
    border.color: theme.surfaceBorder
    border.width: root.embeddedChrome ? 0 : 1
    Layout.fillWidth: true
    Layout.fillHeight: true

    Rectangle {
        visible: root.embeddedChrome
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 1
        color: theme.surfaceBorder
    }

    ColumnLayout {
        id: sidebarLayout
        anchors.fill: parent
        anchors.margins: 6
        spacing: theme.spacing3

        ConsoleSurface {
                    tone: "soft"
                    padding: theme.spacing4
                    Layout.fillWidth: true
                    Layout.preferredHeight: controlRailLayout.implicitHeight + theme.spacing4 * 2
                    Layout.minimumHeight: controlRailLayout.implicitHeight + theme.spacing4 * 2

                    ColumnLayout {
                        id: controlRailLayout
                        anchors.fill: parent
                        spacing: 2

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing3

                            Label {
                                text: "Control Rail"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXxs
                                font.weight: Font.Bold
                                font.capitalization: Font.AllUppercase
                                font.letterSpacing: 1.4
                                Layout.fillWidth: true
                            }

                            Label {
                                text: "Status indicator: Green = connected."
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: 10
                            }
                        }

                        GridLayout {
                            Layout.fillWidth: true
                            columns: 2
                            columnSpacing: theme.spacing3
                            rowSpacing: theme.spacing3

                            Repeater {
                                model: [
                                    { "label": "Fixtures", "value": engineController.lightingFixtureCount, "accent": false },
                                    {
                                        "label": "Live",
                                        "value": LightingParityHelpers.liveFixtureCount(engineController.lightingFixtures),
                                        "accent": true
                                    },
                                    { "label": "Scenes", "value": engineController.lightingSceneCount, "accent": false },
                                    {
                                        "label": root.viewMode === "spatial" ? "Selected" : "Groups",
                                        "value": root.viewMode === "spatial"
                                                 ? (engineController.lightingSelectedFixtureId.length ? 1 : 0)
                                                 : engineController.lightingGroupCount,
                                        "accent": false
                                    }
                                ]

                                ConsoleStatCard {
                                    required property var modelData
                                    label: modelData.label
                                    value: String(modelData.value)
                                    accent: modelData.accent
                                    compact: true
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing3

                            Repeater {
                                model: [
                                    { "id": "expanded", "name": "Grid" },
                                    { "id": "compact", "name": "List" },
                                    { "id": "spatial", "name": "Studio" }
                                ]

                                ConsoleButton {
                                    required property var modelData
                                    objectName: modelData.id === "compact"
                                                ? "lighting-view-compact"
                                                : modelData.id === "expanded"
                                                  ? "lighting-view-expanded"
                                                  : modelData.id === "spatial"
                                                    ? "lighting-view-spatial"
                                                    : ""
                                    Layout.fillWidth: true
                                    tone: "tab"
                                    active: root.viewMode === modelData.id
                                    compact: true
                                    dense: true
                                    text: modelData.name
                                    onClicked: root.viewModeSelected(modelData.id)
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing3

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "primary"
                                compact: true
                                dense: true
                                text: "+ Add Light"
                                onClicked: root.addLightDialogVisible = true
                            }

                            ConsoleButton {
                                objectName: "lighting-monitor-toggle"
                                Layout.fillWidth: true
                                tone: "tab"
                                active: root.showDmxMonitor
                                compact: true
                                dense: true
                                text: "DMX Monitor"
                                onClicked: root.dmxMonitorToggled()
                            }

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "secondary"
                                active: root.showSettings
                                compact: true
                                dense: true
                                text: "Settings"
                                onClicked: root.showSettings = !root.showSettings
                            }
                        }

                        Item {
                            visible: root.showSettings
                            Layout.fillWidth: true
                            implicitHeight: settingsLayout.implicitHeight

                            ColumnLayout {
                                id: settingsLayout
                                anchors.fill: parent
                                spacing: theme.spacing3

                                Rectangle {
                                    radius: theme.radiusCard
                                    color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.8)
                                    border.width: 1
                                    border.color: theme.surfaceBorder
                                    Layout.fillWidth: true
                                    implicitHeight: settingsInner.implicitHeight + 16

                                    ColumnLayout {
                                        id: settingsInner
                                        anchors.fill: parent
                                        anchors.margins: 8
                                        spacing: theme.spacing3

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: theme.spacing3

                                            Label {
                                                text: "Bridge Transport"
                                                color: theme.studio100
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: theme.textSm
                                                font.weight: Font.DemiBold
                                                Layout.fillWidth: true
                                            }

                                            ConsoleButton {
                                                dense: true
                                                tone: rootWindow.lightingEnabledDraft ? "primary" : "secondary"
                                                text: rootWindow.lightingEnabledDraft ? "DMX On" : "DMX Off"
                                                onClicked: rootWindow.lightingEnabledDraft = !rootWindow.lightingEnabledDraft
                                            }
                                        }

                                        ConsoleTextField {
                                            Layout.fillWidth: true
                                            dense: true
                                            placeholderText: "Bridge IP"
                                            text: rootWindow.lightingBridgeIpDraft
                                            onTextChanged: rootWindow.lightingBridgeIpDraft = text
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: theme.spacing3

                                            ConsoleTextField {
                                                Layout.preferredWidth: 80
                                                dense: true
                                                placeholderText: "Universe"
                                                text: String(rootWindow.lightingUniverseDraft)
                                                inputMethodHints: Qt.ImhDigitsOnly
                                                onTextChanged: {
                                                    const nextValue = Number(text)
                                                    if (!isNaN(nextValue) && nextValue >= 1) {
                                                        rootWindow.lightingUniverseDraft = Math.round(nextValue)
                                                    }
                                                }
                                            }

                                            ConsoleButton {
                                                Layout.fillWidth: true
                                                dense: true
                                                text: "Probe"
                                                enabled: rootWindow.lightingBridgeIpDraft.trim().length > 0
                                                onClicked: engineController.runLightingProbe(
                                                               rootWindow.lightingBridgeIpDraft.trim(),
                                                               rootWindow.lightingUniverseDraft
                                                           )
                                            }

                                            ConsoleButton {
                                                Layout.fillWidth: true
                                                dense: true
                                                tone: "primary"
                                                text: "Save"
                                                enabled: root.lightingSettingsDirty()
                                                onClicked: root.saveLightingSettings()
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

        ConsoleSurface {
                    tone: "soft"
                    padding: theme.spacing4
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredHeight: Math.max(218, root.height * (root.showDmxMonitor ? 0.28 : 0.34))
                    Layout.minimumHeight: 200

                    ScrollView {
                        anchors.fill: parent
                        clip: true
                        contentWidth: availableWidth

                        Item {
                            width: parent.width
                            implicitHeight: scenesLayout.implicitHeight

                            ColumnLayout {
                                id: scenesLayout
                                width: parent.width
                                spacing: theme.spacing3

                                RowLayout {
                                    Layout.fillWidth: true

                                    Label {
                                        text: "Scenes"
                                        color: theme.studio500
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: theme.textXxs
                                        font.weight: Font.Bold
                                        font.capitalization: Font.AllUppercase
                                        font.letterSpacing: 1.4
                                        Layout.fillWidth: true
                                    }

                                    Rectangle {
                                        radius: theme.radiusPill
                                        color: theme.studio800
                                        border.width: 1
                                        border.color: theme.surfaceBorder
                                        implicitWidth: sceneCountLabel.implicitWidth + 12
                                        implicitHeight: 16

                                        Label {
                                            id: sceneCountLabel
                                            anchors.centerIn: parent
                                            text: String(engineController.lightingSceneCount)
                                            color: theme.studio400
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: theme.spacing3

                                    ConsoleTextField {
                                        Layout.fillWidth: true
                                        dense: true
                                        placeholderText: "Scene name"
                                        text: rootWindow.lightingNewSceneNameDraft
                                        onTextChanged: rootWindow.lightingNewSceneNameDraft = text
                                    }

                                            ConsoleButton {
                                                dense: true
                                                tone: "primary"
                                                compact: true
                                                text: "Save"
                                                enabled: rootWindow.lightingNewSceneNameDraft.trim().length > 0
                                                onClicked: {
                                            engineController.createLightingScene(rootWindow.lightingNewSceneNameDraft.trim())
                                            rootWindow.lightingNewSceneNameDraft = ""
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4

                                    Label {
                                        text: "Recall Fade"
                                        color: theme.studio500
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: theme.textXxs
                                        font.weight: Font.Bold
                                        font.capitalization: Font.AllUppercase
                                        font.letterSpacing: 1.2
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 4

                                        Repeater {
                                            model: [
                                                { "label": "Instant", "value": 0 },
                                                { "label": "1s", "value": 1 },
                                                { "label": "2s", "value": 2 },
                                                { "label": "3s", "value": 3 },
                                                { "label": "5s", "value": 5 }
                                            ]

                                            ConsoleButton {
                                                required property var modelData
                                                Layout.fillWidth: true
                                                dense: true
                                                tone: "tab"
                                                compact: true
                                                active: root.sceneFadeDuration === modelData.value
                                                text: modelData.label
                                                onClicked: root.sceneFadeDuration = modelData.value
                                            }
                                        }
                                    }
                                }

                                Repeater {
                                    model: engineController.lightingScenes

                                    Rectangle {
                                        required property var modelData
                                        readonly property var sceneStates: modelData.fixtureStates ? modelData.fixtureStates
                                                                                     : modelData.lightStates ? modelData.lightStates
                                                                                                             : []

                                        radius: theme.radiusCard
                                        color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.82)
                                        border.width: 1
                                        border.color: engineController.lightingSelectedSceneId === modelData.id
                                                      ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.42)
                                                      : theme.surfaceBorder
                                        Layout.fillWidth: true
                                        implicitHeight: sceneCardLayout.implicitHeight + 10

                                        HoverHandler {
                                            id: sceneHoverHandler
                                        }

                                        ColumnLayout {
                                            id: sceneCardLayout
                                            anchors.fill: parent
                                            anchors.margins: 5
                                            spacing: 1

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: theme.spacing3

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 1

                                                    ConsoleTextField {
                                                        id: sceneRenameField
                                                        objectName: "lighting-scene-rename-" + modelData.id
                                                        visible: root.renamingScene && root.renamingScene.id === modelData.id
                                                        Layout.fillWidth: true
                                                        dense: true
                                                        text: root.renameSceneDraft
                                                        onVisibleChanged: {
                                                            if (visible) {
                                                                forceActiveFocus()
                                                                selectAll()
                                                            }
                                                        }
                                                        onTextChanged: root.renameSceneDraft = text
                                                        onAccepted: root.commitRenameScene()
                                                        onActiveFocusChanged: {
                                                            if (!activeFocus && root.renamingScene && root.renamingScene.id === modelData.id) {
                                                                root.commitRenameScene()
                                                            }
                                                        }
                                                    }

                                                    Label {
                                                        visible: !root.renamingScene || root.renamingScene.id !== modelData.id
                                                        text: modelData.name
                                                        color: theme.studio100
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: theme.textSm
                                                        font.weight: Font.DemiBold
                                                        elide: Text.ElideRight
                                                        Layout.fillWidth: true

                                                        TapHandler {
                                                            onTapped: root.startRenameScene(modelData)
                                                        }
                                                    }

                                                    Label {
                                                        text: String(modelData.fixtureCount || sceneStates.length) + " fixtures"
                                                              + (modelData.lastRecalledAt
                                                                     ? "  •  Last recalled " + rootWindow.formatTimestamp(modelData.lastRecalledAt)
                                                                     : "  •  Hold to recall")
                                                        color: theme.studio400
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: 10
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }

                                                Rectangle {
                                                    visible: engineController.lightingSelectedSceneId === modelData.id
                                                    radius: theme.radiusPill
                                                    color: Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.12)
                                                    border.width: 1
                                                    border.color: Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.22)
                                                    implicitWidth: activeBadgeLabel.implicitWidth + 14
                                                    implicitHeight: 16

                                                    Label {
                                                        id: activeBadgeLabel
                                                        anchors.centerIn: parent
                                                        text: "ACTIVE"
                                                        color: theme.accentGreen
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: 10
                                                        font.weight: Font.DemiBold
                                                    }
                                                }
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 2

                                                Repeater {
                                                    model: sceneStates.slice(0, 12)

                                                    Rectangle {
                                                        required property var modelData
                                                        Layout.fillWidth: true
                                                        implicitHeight: 4
                                                        radius: 2
                                                        color: root.lightStateColor(modelData)
                                                    }
                                                }
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 2

                                                SafetyHoldButton {
                                                    Layout.fillWidth: true
                                                    dense: true
                                                    text: "Recall"
                                                    delay: 1500
                                                    onActivated: engineController.recallLightingScene(modelData.id, root.sceneFadeDuration)
                                                }

                                                ConsoleButton {
                                                    dense: true
                                                    compact: true
                                                    text: "Update"
                                                    onClicked: engineController.updateLightingScene(modelData.id, { "captureCurrentState": true })
                                                }

                                                ConsoleButton {
                                                    objectName: "lighting-scene-delete-" + modelData.id
                                                    tone: "icon"
                                                    dense: true
                                                    iconText: "\u2715"
                                                    opacity: sceneHoverHandler.hovered ? 1 : 0

                                                    Behavior on opacity {
                                                        NumberAnimation {
                                                            duration: 100
                                                        }
                                                    }

                                                    onClicked: root.pendingDeleteScene = modelData
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

        ConsoleSurface {
                    tone: "soft"
                    padding: theme.spacing4
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredHeight: Math.max(188, root.height * (root.showDmxMonitor ? 0.2 : 0.28))
                    Layout.minimumHeight: 170

                    ScrollView {
                        anchors.fill: parent
                        clip: true
                        contentWidth: availableWidth

                        Item {
                            width: parent.width
                            implicitHeight: groupsLayout.implicitHeight

                            ColumnLayout {
                                id: groupsLayout
                                width: parent.width
                                spacing: theme.spacing3

                                RowLayout {
                                    Layout.fillWidth: true

                                    Label {
                                        text: "Groups"
                                        color: theme.studio500
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: theme.textXxs
                                        font.weight: Font.Bold
                                        font.capitalization: Font.AllUppercase
                                        font.letterSpacing: 1.4
                                        Layout.fillWidth: true
                                    }

                                    Rectangle {
                                        radius: theme.radiusPill
                                        color: theme.studio800
                                        border.width: 1
                                        border.color: theme.surfaceBorder
                                        implicitWidth: groupCountLabel.implicitWidth + 12
                                        implicitHeight: 18

                                        Label {
                                            id: groupCountLabel
                                            anchors.centerIn: parent
                                            text: String(engineController.lightingGroupCount)
                                            color: theme.studio400
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                Repeater {
                                    model: engineController.lightingGroups

                                    Rectangle {
                                        required property var modelData
                                        radius: theme.radiusBadge
                                        color: Qt.rgba(theme.studio900.r, theme.studio900.g, theme.studio900.b, 0.75)
                                        border.width: 1
                                        border.color: theme.surfaceBorder
                                        Layout.fillWidth: true
                                        implicitHeight: 30

                                        HoverHandler {
                                            id: groupHoverHandler
                                        }

                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.margins: 6
                                            spacing: 2

                                            Label {
                                                text: modelData.name
                                                color: theme.studio200
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: theme.textXs
                                                font.weight: Font.Medium
                                                Layout.fillWidth: true
                                                elide: Text.ElideRight
                                            }

                                            Rectangle {
                                                radius: theme.radiusPill
                                                color: theme.studio800
                                                border.width: 1
                                                border.color: theme.surfaceBorder
                                                implicitWidth: countLabel.implicitWidth + 10
                                                implicitHeight: 16

                                                Label {
                                                    id: countLabel
                                                    anchors.centerIn: parent
                                                    text: String(LightingParityHelpers.groupFixtureCount(engineController.lightingFixtures, modelData.id))
                                                    color: theme.studio500
                                                    font.family: theme.uiFontFamily
                                                    font.pixelSize: 10
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            RowLayout {
                                                spacing: 1
                                                opacity: groupHoverHandler.hovered ? 1 : 0

                                                Behavior on opacity {
                                                    NumberAnimation {
                                                        duration: 100
                                                    }
                                                }

                                                ConsoleButton {
                                                    objectName: "lighting-group-rename-" + modelData.id
                                                    tone: "icon"
                                                    dense: true
                                                    iconText: "\u270E"
                                                    onClicked: root.startRenameGroup(modelData)
                                                }

                                                ConsoleButton {
                                                    objectName: "lighting-group-delete-" + modelData.id
                                                    tone: "icon"
                                                    dense: true
                                                    iconText: "\u2715"
                                                    onClicked: root.pendingDeleteGroup = modelData
                                                }
                                            }
                                        }
                                    }
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 2

                                    ConsoleTextField {
                                        Layout.fillWidth: true
                                        dense: true
                                        placeholderText: "Group name"
                                        text: rootWindow.lightingNewGroupNameDraft
                                        onTextChanged: rootWindow.lightingNewGroupNameDraft = text
                                    }

                                    ConsoleButton {
                                        dense: true
                                        tone: "primary"
                                        compact: true
                                        text: "Add"
                                        enabled: rootWindow.lightingNewGroupNameDraft.trim().length > 0
                                        onClicked: {
                                            engineController.createLightingGroup(rootWindow.lightingNewGroupNameDraft.trim())
                                            rootWindow.lightingNewGroupNameDraft = ""
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

        LightingDmxMonitorPanel {
                    visible: root.showDmxMonitor
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredHeight: Math.max(180, root.height * 0.2)
                    engineController: root.engineController
        }

        LightingFixtureDialog {
                    open: root.addLightDialogVisible
                    rootWindow: root.rootWindow
                    engineController: root.engineController
                    fixtureData: null
                    onCloseRequested: root.addLightDialogVisible = false
        }

        ConsoleModal {
                    open: root.pendingDeleteScene !== null
                    title: ""
                    subtitle: ""
                    dialogWidth: 408
                    verticalPlacement: "center"
                    showCloseButton: false
                    parent: root.rootWindow && root.rootWindow.contentItem ? root.rootWindow.contentItem : null
                    onCloseRequested: root.pendingDeleteScene = null

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: theme.spacing6

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing5

                            Rectangle {
                                implicitWidth: 36
                                implicitHeight: 36
                                radius: 18
                                color: Qt.rgba(theme.accentRed.r, theme.accentRed.g, theme.accentRed.b, 0.12)

                                Label {
                                    anchors.centerIn: parent
                                    text: "!"
                                    color: theme.accentRed
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textLg
                                    font.weight: Font.Bold
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Label {
                                    text: "Delete Scene"
                                    color: theme.studio100
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textLg
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    Layout.fillWidth: true
                                    text: root.pendingDeleteScene
                                          ? "Delete \"" + root.pendingDeleteScene.name + "\"? This cannot be undone."
                                          : "Delete the selected scene? This cannot be undone."
                                    color: theme.studio400
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textSm
                                    wrapMode: Text.WordWrap
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing4

                            Item { Layout.fillWidth: true }

                            ConsoleButton {
                                tone: "secondary"
                                text: "Cancel"
                                onClicked: root.pendingDeleteScene = null
                            }

                            ConsoleButton {
                                tone: "danger"
                                text: "Delete"
                                enabled: !!root.pendingDeleteScene
                                onClicked: {
                                    if (root.pendingDeleteScene && engineController) {
                                        engineController.deleteLightingScene(root.pendingDeleteScene.id)
                                    }
                                    root.pendingDeleteScene = null
                                }
                            }
                        }
                    }
        }

        ConsoleModal {
                    open: root.renamingGroup !== null
                    title: ""
                    subtitle: ""
                    dialogWidth: 320
                    verticalPlacement: "center"
                    showCloseButton: false
                    parent: root.rootWindow && root.rootWindow.contentItem ? root.rootWindow.contentItem : null
                    onCloseRequested: {
                        root.renamingGroup = null
                        root.renameGroupDraft = ""
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: theme.spacing5

                        Label {
                            text: "Rename Group"
                            color: theme.studio100
                            font.family: theme.uiFontFamily
                            font.pixelSize: theme.textLg
                            font.weight: Font.DemiBold
                        }

                        ConsoleTextField {
                            id: renameGroupField
                            Layout.fillWidth: true
                            placeholderText: "e.g., \"Key Lights\""
                            text: root.renameGroupDraft
                            onTextChanged: root.renameGroupDraft = text
                            onAccepted: root.commitRenameGroup()
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing4

                            Item { Layout.fillWidth: true }

                            ConsoleButton {
                                tone: "secondary"
                                text: "Cancel"
                                onClicked: {
                                    root.renamingGroup = null
                                    root.renameGroupDraft = ""
                                }
                            }

                            ConsoleButton {
                                tone: "primary"
                                text: "Rename"
                                enabled: root.renameGroupDraft.trim().length > 0
                                onClicked: root.commitRenameGroup()
                            }
                        }
                    }
        }

        ConsoleModal {
                    open: root.pendingDeleteGroup !== null
                    title: ""
                    subtitle: ""
                    dialogWidth: 408
                    verticalPlacement: "center"
                    showCloseButton: false
                    parent: root.rootWindow && root.rootWindow.contentItem ? root.rootWindow.contentItem : null
                    onCloseRequested: root.pendingDeleteGroup = null

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: theme.spacing6

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing5

                            Rectangle {
                                implicitWidth: 36
                                implicitHeight: 36
                                radius: 18
                                color: Qt.rgba(theme.accentRed.r, theme.accentRed.g, theme.accentRed.b, 0.12)

                                Label {
                                    anchors.centerIn: parent
                                    text: "!"
                                    color: theme.accentRed
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textLg
                                    font.weight: Font.Bold
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Label {
                                    text: "Delete Group"
                                    color: theme.studio100
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textLg
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    Layout.fillWidth: true
                                    text: root.pendingDeleteGroup
                                          ? "Delete group \"" + root.pendingDeleteGroup.name + "\"? Lights will be moved to ungrouped."
                                          : "Delete the selected group? Lights will be moved to ungrouped."
                                    color: theme.studio400
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textSm
                                    wrapMode: Text.WordWrap
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: theme.spacing4

                            Item { Layout.fillWidth: true }

                            ConsoleButton {
                                tone: "secondary"
                                text: "Cancel"
                                onClicked: root.pendingDeleteGroup = null
                            }

                            ConsoleButton {
                                tone: "danger"
                                text: "Delete"
                                enabled: !!root.pendingDeleteGroup
                                onClicked: {
                                    if (root.pendingDeleteGroup && engineController) {
                                        engineController.deleteLightingGroup(root.pendingDeleteGroup.id)
                                    }
                                    root.pendingDeleteGroup = null
                                }
                            }
                        }
                    }
        }
    }
}
