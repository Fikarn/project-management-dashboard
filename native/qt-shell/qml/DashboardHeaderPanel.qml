import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window
import QtQml

ConsoleSurface {
    id: root
    objectName: "dashboard-header-panel"
    required property var rootWindow
    required property QtObject engineController
    property real scaleFactor: 1.0
    readonly property bool controllerReady: !!engineController
    readonly property bool fullscreenConsole: rootWindow && rootWindow.visibility === Window.FullScreen
    readonly property bool splitHeroStatsLayout: fullscreenConsole || width >= 1400
    readonly property bool widescreenConsole: fullscreenConsole || width >= 1450
    readonly property string liveWorkspaceMode: controllerReady ? engineController.workspaceMode : "planning"
    readonly property string liveHealthStatus: controllerReady ? engineController.healthStatus : "starting"
    readonly property string liveStateLabel: controllerReady ? engineController.stateLabel : "Stopped"
    readonly property string liveStartupPhaseLabel: controllerReady ? engineController.startupPhaseLabel : "Idle"
    readonly property bool liveAppSnapshotLoaded: controllerReady && engineController.appSnapshotLoaded
    readonly property bool liveOperatorUiReady: controllerReady && engineController.operatorUiReady
    readonly property bool liveLightingEnabled: controllerReady && engineController.lightingEnabled
    readonly property bool liveLightingReachable: controllerReady && engineController.lightingReachable
    readonly property bool liveAudioOscEnabled: controllerReady && engineController.audioOscEnabled
    readonly property bool liveAudioVerified: controllerReady && engineController.audioVerified
    readonly property bool liveAudioConnected: controllerReady && engineController.audioConnected
    readonly property string operatorHealthLabel: {
        const controllerState = liveStateLabel
        const startupPhase = liveStartupPhaseLabel
        const healthStatus = liveHealthStatus
        const appSnapshotLoaded = liveAppSnapshotLoaded
        const operatorUiReady = liveOperatorUiReady

        if (!controllerReady) {
            return "Starting"
        }

        if (controllerState === "Failed") {
            return "Recovery"
        }

        if (healthStatus === "degraded") {
            return "Review"
        }

        if (healthStatus === "Unavailable" || healthStatus === "Stopped") {
            return "Recovery"
        }

        if (rootWindow && rootWindow.operatorSurfaceTarget === "dashboard") {
            return "Live Sync"
        }

        if (operatorUiReady || (controllerState === "Running" && startupPhase === "Ready" && appSnapshotLoaded)) {
            return "Live Sync"
        }

        if (healthStatus === "healthy") {
            return "Live Sync"
        }

        return "Starting"
    }
    readonly property color operatorHealthTone: {
        const controllerState = liveStateLabel
        const startupPhase = liveStartupPhaseLabel
        const healthStatus = liveHealthStatus
        const appSnapshotLoaded = liveAppSnapshotLoaded
        const operatorUiReady = liveOperatorUiReady

        if (!controllerReady) {
            return theme.accentAmber
        }

        if (controllerState === "Failed") {
            return theme.accentRed
        }

        if (healthStatus === "degraded") {
            return theme.accentAmber
        }

        if (healthStatus === "Unavailable" || healthStatus === "Stopped") {
            return theme.accentRed
        }

        if (rootWindow && rootWindow.operatorSurfaceTarget === "dashboard") {
            return theme.accentGreen
        }

        if (operatorUiReady || (controllerState === "Running" && startupPhase === "Ready" && appSnapshotLoaded)) {
            return theme.accentGreen
        }

        if (healthStatus === "healthy") {
            return theme.accentGreen
        }

        return theme.accentAmber
    }

    tone: "strong"
    padding: 12
    Layout.fillWidth: true
    implicitHeight: headerContent.implicitHeight * scaleFactor + 24

    function operatorCopy() {
        switch (liveWorkspaceMode) {
        case "lighting":
            return {
                "eyebrow": "Studio Control",
                "title": "Lighting control stays front and center.",
                "description": "Keep cue changes, fixture groups, DMX output, and spatial focus points inside one fixed console."
            }
        case "audio":
            return {
                "eyebrow": "Studio Audio",
                "title": "Monitor the mix without leaving the console.",
                "description": "Recall snapshots, adjust channels, and keep OSC connectivity readable during live productions."
            }
        case "setup":
            return {
                "eyebrow": "Control Surface Setup",
                "title": "Commissioning stays one step away from the operator surface.",
                "description": "Reach setup, recovery, backup, and support tools without turning the runtime shell into the primary UI."
            }
        default:
            return {
                "eyebrow": "Production Planning",
                "title": "Planning stays visible without taking over the screen.",
                "description": "Track prep, handoffs, and timing while lighting and audio remain the primary operator surfaces."
            }
        }
    }

    function dmxLabel() {
        if (!liveLightingEnabled) {
            return "DMX Off"
        }

        return liveLightingReachable ? "DMX Ready" : "DMX Down"
    }

    function dmxTone() {
        if (!liveLightingEnabled) {
            return theme.studio500
        }

        return liveLightingReachable ? theme.accentGreen : theme.accentRed
    }

    function oscLabel() {
        if (!liveAudioOscEnabled) {
            return "OSC Off"
        }

        if (liveAudioVerified) {
            return "OSC Ready"
        }

        return liveAudioConnected ? "OSC Await" : "OSC Down"
    }

    function oscTone() {
        if (!liveAudioOscEnabled) {
            return theme.studio500
        }

        if (liveAudioVerified) {
            return theme.accentGreen
        }

        return liveAudioConnected ? theme.accentAmber : theme.accentRed
    }

    function scaleOptions() {
        return [
            { "label": "90", "value": 0.9, "title": "Dense operator view" },
            { "label": "100", "value": 1.0, "title": "Standard operator view" },
            { "label": "108", "value": 1.08, "title": "Relaxed operator view" }
        ]
    }

    function selectWorkspace(workspaceId) {
        if (controllerReady) {
            engineController.setWorkspaceMode(workspaceId)
        }
    }

    ConsoleTheme {
        id: theme
    }

    Item {
        anchors.fill: parent

        Item {
            id: headerHost
            width: parent.width / root.scaleFactor
            height: headerContent.implicitHeight
            scale: root.scaleFactor
            transformOrigin: Item.TopLeft

            ColumnLayout {
                id: headerContent
                width: parent.width
                spacing: theme.spacing5

                RowLayout {
                    Layout.fillWidth: true
                    spacing: theme.spacing4

                    RowLayout {
                        Layout.fillWidth: true
                        Layout.minimumWidth: 0
                        spacing: theme.spacing4

                        ConsoleBadge {
                            text: "SSE ExEd Studio Control"
                            badgeColor: theme.accentBlue
                            textColor: theme.accentBlue
                        }

                        Label {
                            text: "Permanent operator surface for lighting, audio, planning, and deck control"
                            Layout.fillWidth: true
                            Layout.minimumWidth: 0
                            color: theme.studio500
                            font.family: theme.uiFontFamily
                            font.pixelSize: 9
                            font.weight: Font.DemiBold
                            font.capitalization: Font.AllUppercase
                            font.letterSpacing: 0.8
                            elide: Text.ElideRight
                            visible: root.width >= 1180
                        }
                    }

                    RowLayout {
                        Layout.alignment: Qt.AlignRight | Qt.AlignVCenter
                        spacing: theme.spacing3

                        ConsoleStatusBadge {
                            objectName: "dashboard-health-storage"
                            text: "Saved Locally"
                            toneColor: theme.accentGreen
                        }

                        ConsoleStatusBadge {
                            objectName: "dashboard-health-health"
                            text: root.operatorHealthLabel
                            toneColor: root.operatorHealthTone
                        }

                        ConsoleStatusBadge {
                            objectName: "dashboard-health-dmx"
                            text: root.dmxLabel()
                            toneColor: root.dmxTone()
                            dimmed: !controllerReady || !engineController.lightingEnabled
                        }

                        ConsoleStatusBadge {
                            objectName: "dashboard-health-osc"
                            text: root.oscLabel()
                            toneColor: root.oscTone()
                            dimmed: !controllerReady || !engineController.audioOscEnabled
                        }

                        ConsoleButton {
                            objectName: "dashboard-setup-button"
                            text: root.widescreenConsole ? "Control surface setup" : "Setup"
                            tone: "secondary"
                            compact: true
                            dense: true
                            ToolTip.visible: hovered
                            ToolTip.text: "Control surface setup"
                            onClicked: root.selectWorkspace("setup")
                        }

                        Rectangle {
                            radius: theme.radiusBadge
                            color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.5)
                            border.width: 1
                            border.color: theme.surfaceBorder
                            implicitHeight: theme.compactControlHeight
                            implicitWidth: scaleControlRow.implicitWidth + 14

                            RowLayout {
                                id: scaleControlRow
                                anchors.centerIn: parent
                                spacing: 2

                                Repeater {
                                    model: root.scaleOptions()

                                    ConsoleButton {
                                        required property var modelData
                                        objectName: "dashboard-scale-" + modelData.label
                                        text: modelData.label
                                        tone: "chip"
                                        compact: true
                                        dense: true
                                        active: Math.abs(root.rootWindow.dashboardUiScale - modelData.value) < 0.001
                                        onClicked: root.rootWindow.dashboardUiScale = modelData.value
                                    }
                                }
                            }
                        }

                        ConsoleButton {
                            objectName: "dashboard-about-button"
                            text: ""
                            iconText: "i"
                            tone: "icon"
                            compact: true
                            dense: true
                            ToolTip.visible: hovered
                            ToolTip.text: "About SSE ExEd Studio Control"
                            onClicked: root.rootWindow.aboutDialogVisible = true
                        }

                        ConsoleButton {
                            objectName: "dashboard-help-button"
                            text: ""
                            iconText: "?"
                            tone: "icon"
                            compact: true
                            dense: true
                            ToolTip.visible: hovered
                            ToolTip.text: "Keyboard shortcuts"
                            onClicked: root.rootWindow.keyboardHelpVisible = true
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.splitHeroStatsLayout ? 2 : 1
                    columnSpacing: theme.spacing5
                    rowSpacing: theme.spacing5

                    ConsoleSurface {
                        Layout.fillWidth: true
                        Layout.minimumWidth: 0
                        tone: "soft"
                        padding: 12
                        implicitHeight: heroCopyLayout.implicitHeight + 24

                        ColumnLayout {
                            id: heroCopyLayout
                            anchors.top: parent.top
                            anchors.left: parent.left
                            anchors.right: parent.right
                            spacing: theme.spacing3

                            Label {
                                text: root.operatorCopy().eyebrow
                                color: theme.accentBlue
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXxs
                                font.weight: Font.DemiBold
                                font.capitalization: Font.AllUppercase
                                font.letterSpacing: 1.1
                            }

                            Label {
                                text: root.operatorCopy().title
                                color: theme.studio050
                                font.family: theme.uiFontFamily
                                font.pixelSize: root.width >= 1500 ? 24 : root.width >= 1120 ? 21 : 19
                                font.weight: Font.DemiBold
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Label {
                                text: root.operatorCopy().description
                                color: theme.studio300
                                font.family: theme.uiFontFamily
                                font.pixelSize: 11
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }

                    Item {
                        Layout.fillWidth: !root.splitHeroStatsLayout
                        Layout.preferredWidth: root.splitHeroStatsLayout ? 396 : -1
                        Layout.minimumWidth: root.splitHeroStatsLayout ? 396 : 0
                        Layout.maximumWidth: root.splitHeroStatsLayout ? 396 : -1
                        implicitHeight: statsGrid.implicitHeight

                        GridLayout {
                            id: statsGrid
                            anchors.fill: parent
                            columns: root.splitHeroStatsLayout || root.width >= 900 ? 3 : 1
                            columnSpacing: theme.spacing4
                            rowSpacing: theme.spacing4

                            ConsoleStatCard {
                                Layout.fillWidth: true
                                label: "Lights"
                                value: String(controllerReady ? engineController.lightingFixtureCount : 0)
                                iconText: "L"
                                compact: true
                            }

                            ConsoleStatCard {
                                Layout.fillWidth: true
                                label: "Audio"
                                value: String(controllerReady ? engineController.audioChannelCount : 0)
                                iconText: "A"
                                compact: true
                            }

                            ConsoleStatCard {
                                Layout.fillWidth: true
                                label: "Projects"
                                value: String(controllerReady ? engineController.planningProjectCount : 0)
                                iconText: "P"
                                accent: true
                                compact: true
                            }
                        }
                    }
                }

                ConsoleSurface {
                    Layout.fillWidth: true
                    tone: "soft"
                    padding: 6
                    implicitHeight: dashboardTabsGrid.implicitHeight + 12

                    GridLayout {
                        id: dashboardTabsGrid
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        columns: root.width >= 960 ? 3 : 1
                        columnSpacing: theme.spacing4
                        rowSpacing: theme.spacing4

                        ConsoleTabButton {
                            objectName: "dashboard-tab-lighting"
                            text: "Lights"
                            shortcut: "L"
                            iconText: "L"
                            compact: true
                            eyebrow: "Live lighting levels, scenes, and DMX health"
                            active: controllerReady && engineController.workspaceMode === "lighting"
                            Layout.fillWidth: true
                            onClicked: root.selectWorkspace("lighting")
                        }

                        ConsoleTabButton {
                            objectName: "dashboard-tab-audio"
                            text: "Audio"
                            shortcut: "A"
                            iconText: "A"
                            compact: true
                            eyebrow: "Mixer channels, routing snapshots, and OSC status"
                            active: controllerReady && engineController.workspaceMode === "audio"
                            Layout.fillWidth: true
                            onClicked: root.selectWorkspace("audio")
                        }

                        ConsoleTabButton {
                            objectName: "dashboard-tab-planning"
                            text: "Projects"
                            shortcut: "K"
                            iconText: "P"
                            compact: true
                            eyebrow: "Run-of-show planning, tasks, timers, and prep notes"
                            active: !controllerReady || engineController.workspaceMode === "planning"
                            Layout.fillWidth: true
                            onClicked: root.selectWorkspace("planning")
                        }
                    }
                }
            }
        }
    }
}
