import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "dashboard-header-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    readonly property bool controllerReady: !!engineController

    function operatorCopy() {
        if (!controllerReady) {
            return {
                "eyebrow": "Production Planning",
                "title": "Planning stays visible without taking over the screen.",
                "description": "Track prep, handoffs, timers, and recent activity while the board remains fast to scan and edit."
            }
        }

        switch (engineController.workspaceMode) {
        case "lighting":
            return {
                "eyebrow": "Studio Control",
                "title": "Lighting control stays front and center.",
                "description": "Keep cues, fixture groups, DMX output, and scene focus readable without leaving the console."
            }
        case "audio":
            return {
                "eyebrow": "Studio Audio",
                "title": "Monitor the mix without leaving the console.",
                "description": "Keep channels, routing snapshots, and OSC health visible during live operation."
            }
        case "setup":
            return {
                "eyebrow": "Control Surface Setup",
                "title": "Commissioning and support stay one step away from the operator view.",
                "description": "Reach setup, backup, restore, and control-surface preparation without losing the main workspace."
            }
        default:
            return {
                "eyebrow": "Production Planning",
                "title": "Planning stays visible without taking over the screen.",
                "description": "Track prep, handoffs, timers, and recent activity while the board remains fast to scan and edit."
            }
        }
    }

    function healthLabel() {
        if (!controllerReady) {
            return "Starting"
        }

        switch (engineController.healthStatus) {
        case "healthy":
            return "Live Sync"
        case "degraded":
            return "Review"
        case "starting":
            return "Starting"
        default:
            return "Recovery"
        }
    }

    function healthColor() {
        if (!controllerReady) {
            return "#f59e0b"
        }

        switch (engineController.healthStatus) {
        case "healthy":
            return "#2ba36a"
        case "degraded":
        case "starting":
            return "#f59e0b"
        default:
            return "#ef6461"
        }
    }

    function dmxLabel() {
        if (!controllerReady || !engineController.lightingEnabled) {
            return "DMX Off"
        }

        return engineController.lightingReachable ? "DMX Ready" : "DMX Down"
    }

    function dmxColor() {
        if (!controllerReady || !engineController.lightingEnabled) {
            return "#64748b"
        }

        return engineController.lightingReachable ? "#2ba36a" : "#ef6461"
    }

    function oscLabel() {
        if (!controllerReady || !engineController.audioOscEnabled) {
            return "OSC Off"
        }

        if (engineController.audioVerified) {
            return "OSC Ready"
        }

        return engineController.audioConnected ? "OSC Await" : "OSC Down"
    }

    function oscColor() {
        if (!controllerReady || !engineController.audioOscEnabled) {
            return "#64748b"
        }

        if (engineController.audioVerified) {
            return "#2ba36a"
        }

        return engineController.audioConnected ? "#f59e0b" : "#ef6461"
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

    radius: 14
    color: "#0c1320"
    border.color: "#35506b"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: headerLayout.implicitHeight * scaleFactor + 30

    Item {
        anchors.fill: parent
        anchors.margins: 14

        Item {
            id: headerHost
            width: parent.width / root.scaleFactor
            height: headerLayout.implicitHeight
            scale: root.scaleFactor
            transformOrigin: Item.TopLeft

            ColumnLayout {
                id: headerLayout
                width: parent.width
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Flow {
                            Layout.fillWidth: true
                            spacing: 8

                            Rectangle {
                                radius: 999
                                color: "#13263c"
                                border.color: "#355d93"
                                border.width: 1
                                implicitHeight: 28
                                implicitWidth: operatorLabel.implicitWidth + 22

                                Label {
                                    id: operatorLabel
                                    anchors.centerIn: parent
                                    text: "SSE ExEd Studio Control"
                                    color: "#9bc4ff"
                                    font.pixelSize: 11
                                    font.weight: Font.DemiBold
                                }
                            }

                            Repeater {
                                model: [
                                    { "id": "health", "label": root.healthLabel(), "color": root.healthColor() },
                                    { "id": "dmx", "label": root.dmxLabel(), "color": root.dmxColor() },
                                    { "id": "osc", "label": root.oscLabel(), "color": root.oscColor() }
                                ]

                                Rectangle {
                                    required property var modelData
                                    objectName: "dashboard-health-" + modelData.id
                                    radius: 999
                                    color: "#101826"
                                    border.color: modelData.color
                                    border.width: 1
                                    implicitHeight: 28
                                    implicitWidth: healthBadgeLabel.implicitWidth + 26

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.leftMargin: 10
                                        anchors.rightMargin: 10
                                        spacing: 6

                                        Rectangle {
                                            radius: 999
                                            color: modelData.color
                                            implicitWidth: 7
                                            implicitHeight: 7
                                        }

                                        Label {
                                            id: healthBadgeLabel
                                            text: modelData.label
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            font.weight: Font.Medium
                                        }
                                    }
                                }
                            }
                        }

                        Label {
                            text: "Permanent operator surface for lighting, audio, planning, and control-surface work."
                            color: "#8ea4c0"
                            font.pixelSize: 11
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }

                    RowLayout {
                        spacing: 8

                        Button {
                            objectName: "dashboard-setup-button"
                            text: "Control Surface Setup"
                            highlighted: controllerReady && engineController.workspaceMode === "setup"
                            onClicked: root.selectWorkspace("setup")
                        }

                        Rectangle {
                            radius: 999
                            color: "#101826"
                            border.color: "#24344a"
                            border.width: 1
                            implicitHeight: 34
                            implicitWidth: scaleButtons.implicitWidth + 18

                            RowLayout {
                                id: scaleButtons
                                anchors.centerIn: parent
                                spacing: 4

                                Repeater {
                                    model: root.scaleOptions()

                                    Button {
                                        required property var modelData
                                        objectName: "dashboard-scale-" + modelData.label
                                        text: modelData.label
                                        flat: true
                                        highlighted: Math.abs(rootWindow.dashboardUiScale - modelData.value) < 0.001
                                        onClicked: rootWindow.dashboardUiScale = modelData.value
                                    }
                                }
                            }
                        }

                        Button {
                            objectName: "dashboard-about-button"
                            text: "About"
                            onClicked: rootWindow.aboutDialogVisible = true
                        }

                        Button {
                            objectName: "dashboard-help-button"
                            text: "Shortcuts"
                            highlighted: rootWindow.keyboardHelpVisible
                            onClicked: rootWindow.keyboardHelpVisible = !rootWindow.keyboardHelpVisible
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: width >= 1080 ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    Rectangle {
                        radius: 12
                        color: "#101826"
                        border.color: "#24344a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 126

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: root.operatorCopy().eyebrow
                                color: "#9bc4ff"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: root.operatorCopy().title
                                color: "#f5f7fb"
                                font.pixelSize: 24
                                font.weight: Font.DemiBold
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Label {
                                text: root.operatorCopy().description
                                color: "#b4c0cf"
                                font.pixelSize: 12
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }

                    GridLayout {
                        Layout.fillWidth: true
                        columns: width >= 420 ? 3 : 1
                        columnSpacing: 10
                        rowSpacing: 10

                        Repeater {
                            model: [
                                { "id": "lights", "label": "Lights", "value": controllerReady ? engineController.lightingFixtureCount : 0 },
                                { "id": "audio", "label": "Audio", "value": controllerReady ? engineController.audioChannelCount : 0 },
                                { "id": "projects", "label": "Projects", "value": controllerReady ? engineController.planningProjectCount : 0 }
                            ]

                            Rectangle {
                                required property var modelData
                                objectName: "dashboard-count-" + modelData.id
                                radius: 12
                                color: "#101826"
                                border.color: "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 126

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 14
                                    spacing: 10

                                    Label {
                                        text: modelData.label
                                        color: "#8ea4c0"
                                        font.pixelSize: 12
                                    }

                                    Label {
                                        text: modelData.value
                                        color: "#f5f7fb"
                                        font.pixelSize: 28
                                        font.weight: Font.DemiBold
                                    }
                                }
                            }
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: [
                            { "id": "planning", "label": "Projects", "description": "Run-of-show planning, tasks, timers, and prep notes" },
                            { "id": "lighting", "label": "Lights", "description": "Live levels, scenes, and DMX health" },
                            { "id": "audio", "label": "Audio", "description": "Mixer channels, snapshots, and OSC status" }
                        ]

                        Rectangle {
                            required property var modelData
                            objectName: "dashboard-tab-" + modelData.id
                            radius: 12
                            color: controllerReady && engineController.workspaceMode === modelData.id ? "#143152" : "#101826"
                            border.color: controllerReady && engineController.workspaceMode === modelData.id ? "#4da0ff" : "#24344a"
                            border.width: 1
                            Layout.fillWidth: true
                            implicitHeight: 72

                            MouseArea {
                                anchors.fill: parent
                                onClicked: root.selectWorkspace(modelData.id)
                            }

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 12
                                spacing: 4

                                Label {
                                    text: modelData.label
                                    color: controllerReady && engineController.workspaceMode === modelData.id ? "#f5f7fb" : "#d6dce5"
                                    font.pixelSize: 13
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    text: modelData.description
                                    color: controllerReady && engineController.workspaceMode === modelData.id ? "#dcecff" : "#8ea4c0"
                                    font.pixelSize: 11
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
