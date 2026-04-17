import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "planning-focus-panel"
    required property var rootWindow
    required property var engineController

    property var selectedProject: engineController ? rootWindow.projectById(engineController.planningSelectedProjectId) : null
    property var selectedProjectTasks: selectedProject ? rootWindow.tasksForProject(selectedProject.id) : []
    property var checklistTotals: selectedProject ? rootWindow.checklistTotalsForProject(selectedProject.id) : ({ "done": 0, "total": 0 })
    property int completedTaskCount: selectedProject ? rootWindow.completedTaskCountForProject(selectedProject.id) : 0
    property int totalProjectSeconds: selectedProject ? rootWindow.totalSecondsForProject(selectedProject.id) : 0
    property real progressValue: selectedProject ? rootWindow.progressForProject(selectedProject.id) : 0
    property var activityItems: selectedProject ? rootWindow.activityForProject(selectedProject.id) : []

    visible: !!engineController && engineController.workspaceMode === "planning"
    radius: 12
    color: "#101826"
    border.color: "#24344a"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                Label {
                    text: "Selected Project"
                    color: "#f5f7fb"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    text: root.selectedProject
                          ? root.selectedProject.title + " | " + rootWindow.formatEnumLabel(root.selectedProject.status) + " | " + root.selectedProject.priority.toUpperCase()
                          : "Select a project to inspect details, progress, and recent activity."
                    color: "#b4c0cf"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Button {
                objectName: "planning-open-detail-button"
                text: "Open Details"
                enabled: !!root.selectedProject
                onClicked: rootWindow.openPlanningProjectDetail(root.selectedProject.id)
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                text: "Prev Project"
                enabled: !!engineController && engineController.planningProjectCount > 0
                onClicked: engineController.cyclePlanningProject("prev")
            }

            Button {
                text: "Next Project"
                enabled: !!engineController && engineController.planningProjectCount > 0
                onClicked: engineController.cyclePlanningProject("next")
            }

            Button {
                text: "Prev Task"
                enabled: !!engineController && engineController.planningSelectedProjectId.length > 0 && engineController.planningTaskCount > 0
                onClicked: engineController.cyclePlanningTask("prev")
            }

            Button {
                text: "Next Task"
                enabled: !!engineController && engineController.planningSelectedProjectId.length > 0 && engineController.planningTaskCount > 0
                onClicked: engineController.cyclePlanningTask("next")
            }
        }

        RowLayout {
            visible: !!root.selectedProject
            Layout.fillWidth: true
            spacing: 8

            Repeater {
                model: [
                    { "label": "Tasks", "value": root.selectedProjectTasks.length > 0 ? root.completedTaskCount + "/" + root.selectedProjectTasks.length : "0" },
                    { "label": "Tracked", "value": rootWindow.formatSeconds(root.totalProjectSeconds) },
                    { "label": "Checklist", "value": root.checklistTotals.total > 0 ? root.checklistTotals.done + "/" + root.checklistTotals.total : "0" }
                ]

                Rectangle {
                    required property var modelData
                    radius: 999
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    implicitHeight: 32
                    implicitWidth: badgeLabel.implicitWidth + badgeValue.implicitWidth + 28

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 6

                        Label {
                            id: badgeLabel
                            text: modelData.label
                            color: "#8ea4c0"
                            font.pixelSize: 11
                        }

                        Label {
                            id: badgeValue
                            text: modelData.value
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }
                    }
                }
            }
        }

        Rectangle {
            visible: !!root.selectedProject
            Layout.fillWidth: true
            implicitHeight: 8
            radius: 999
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1

            Rectangle {
                width: parent.width * root.progressValue
                height: parent.height
                radius: parent.radius
                color: "#2ba36a"
            }
        }

        Label {
            visible: !!root.selectedProject && root.selectedProject.description && root.selectedProject.description.length > 0
            text: root.selectedProject ? root.selectedProject.description : ""
            color: "#b4c0cf"
            font.pixelSize: 12
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Rectangle {
            radius: 12
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            Layout.fillHeight: true

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 8

                Label {
                    text: "Recent Activity"
                    color: "#f5f7fb"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    visible: !root.selectedProject
                    text: "Project activity appears here after you select a board card."
                    color: "#8ea4c0"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    visible: !!root.selectedProject && root.activityItems.length === 0
                    text: "No recent project activity is recorded yet."
                    color: "#8ea4c0"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    visible: !!root.selectedProject && root.activityItems.length > 0
                    contentWidth: availableWidth

                    ColumnLayout {
                        width: parent.width
                        spacing: 6

                        Repeater {
                            model: root.activityItems.slice(0, 6)

                            Rectangle {
                                required property var modelData
                                radius: 10
                                color: "#101826"
                                border.color: "#24344a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 72

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 10
                                    spacing: 4

                                    Label {
                                        text: rootWindow.activitySummary(modelData)
                                        color: "#f5f7fb"
                                        font.pixelSize: 12
                                        font.weight: Font.DemiBold
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    Label {
                                        text: modelData.detail
                                        color: "#b4c0cf"
                                        font.pixelSize: 11
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    Label {
                                        text: rootWindow.formatTimestamp(modelData.timestamp)
                                        color: "#8ea4c0"
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
}
