import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

GridLayout {
    id: root
    required property var rootWindow
    required property var engineController
    property bool compact: false
    readonly property var summaryItems: [
        { "id": "active-projects", "label": "Active Projects", "value": String(root.activeProjectCount()), "detail": "Projects still in play" },
        { "id": "running-timers", "label": "Running Timers", "value": String(engineController ? engineController.planningRunningTaskCount : 0), "detail": "Live task timing" },
        { "id": "blocked", "label": "Blocked", "value": String(root.blockedProjectCount()), "detail": "Projects waiting on a handoff" },
        { "id": "open-tasks", "label": "Open Tasks", "value": String(root.openTaskCount()), "detail": "Incomplete task load" }
    ]

    ConsoleTheme {
        id: theme
    }

    function activeProjectCount() {
        if (!engineController) {
            return 0
        }

        let count = 0
        for (let index = 0; index < engineController.planningProjects.length; index += 1) {
            if (engineController.planningProjects[index].status !== "done") {
                count += 1
            }
        }
        return count
    }

    function blockedProjectCount() {
        if (!engineController) {
            return 0
        }

        let count = 0
        for (let index = 0; index < engineController.planningProjects.length; index += 1) {
            if (engineController.planningProjects[index].status === "blocked") {
                count += 1
            }
        }
        return count
    }

    function openTaskCount() {
        if (!engineController) {
            return 0
        }

        let count = 0
        for (let index = 0; index < engineController.planningTasks.length; index += 1) {
            if (!engineController.planningTasks[index].completed) {
                count += 1
            }
        }
        return count
    }

    Layout.fillWidth: true
    columns: compact ? (width >= 680 ? 4 : 2) : width >= 1180 ? 4 : width >= 900 ? 2 : 1
    columnSpacing: compact ? theme.spacing2 : theme.spacing6
    rowSpacing: compact ? theme.spacing2 : theme.spacing6

    Repeater {
        model: root.summaryItems

        Item {
            required property var modelData
            Layout.fillWidth: true
            implicitHeight: root.compact ? compactCard.implicitHeight : standardCard.implicitHeight

            Rectangle {
                id: compactCard
                anchors.fill: parent
                visible: root.compact
                objectName: "planning-summary-" + modelData.id
                property int summaryValue: Number(modelData.value)
                radius: 12
                color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.34)
                border.width: 1
                border.color: theme.surfaceStroke
                implicitHeight: 44

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 7
                    spacing: 1

                    Label {
                        text: modelData.label
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: 9
                        font.weight: Font.DemiBold
                        font.capitalization: Font.AllUppercase
                        font.letterSpacing: 0.9
                        Layout.fillWidth: true
                    }

                    Label {
                        text: modelData.value
                        color: theme.studio050
                        font.family: theme.uiFontFamily
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }
                }
            }

            ConsoleStatCard {
                id: standardCard
                anchors.fill: parent
                visible: !root.compact
                objectName: "planning-summary-" + modelData.id
                label: modelData.label
                value: modelData.value
                detail: modelData.detail
                accent: modelData.id === "running-timers"
                compact: false
            }
        }
    }
}
