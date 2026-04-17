import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

GridLayout {
    id: root
    required property var rootWindow
    required property var engineController

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
    visible: !!engineController && engineController.workspaceMode === "planning"
    columns: rootWindow.width >= 1180 ? 4 : rootWindow.width >= 900 ? 2 : 1
    columnSpacing: 12
    rowSpacing: 12

    Repeater {
        model: [
            { "id": "active-projects", "label": "Active Projects", "value": root.activeProjectCount() },
            { "id": "running-timers", "label": "Running Timers", "value": engineController ? engineController.planningRunningTaskCount : 0 },
            { "id": "blocked", "label": "Blocked", "value": root.blockedProjectCount() },
            { "id": "open-tasks", "label": "Open Tasks", "value": root.openTaskCount() }
        ]

        Rectangle {
            required property var modelData
            objectName: "planning-summary-" + modelData.id
            property var summaryValue: modelData.value
            radius: 12
            color: "#101826"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            Layout.preferredHeight: 88

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 4

                Label {
                    text: modelData.label
                    color: "#8ea4c0"
                    font.pixelSize: 12
                }

                Label {
                    text: modelData.value
                    color: "#f5f7fb"
                    font.pixelSize: 22
                    font.weight: Font.DemiBold
                }
            }
        }
    }
}
