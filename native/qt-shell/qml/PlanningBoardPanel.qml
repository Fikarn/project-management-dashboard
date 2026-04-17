import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    required property var rootWindow
    required property var engineController
    signal openProjectDetail(string projectId)
    property var newTaskDrafts: ({})

    function taskDraft(projectId) {
        if (!projectId || !newTaskDrafts[projectId]) {
            return ""
        }

        return newTaskDrafts[projectId]
    }

    function setTaskDraft(projectId, value) {
        const nextDrafts = Object.assign({}, newTaskDrafts)
        if (!value || value.trim().length === 0) {
            delete nextDrafts[projectId]
        } else {
            nextDrafts[projectId] = value
        }
        newTaskDrafts = nextDrafts
    }

    visible: engineController.workspaceMode === "planning"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: planningBoardLayout.implicitHeight + 24

    ColumnLayout {
        id: planningBoardLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        Label {
            text: "Planning Board"
            color: "#f5f7fb"
            font.pixelSize: 14
            font.weight: Font.DemiBold
        }

        GridLayout {
            Layout.fillWidth: true
            columns: rootWindow.width >= 1400 ? 4 : 2
            columnSpacing: 12
            rowSpacing: 12

            Repeater {
                model: [
                    { "id": "todo", "name": "To Do" },
                    { "id": "in-progress", "name": "In Progress" },
                    { "id": "blocked", "name": "Blocked" },
                    { "id": "done", "name": "Done" }
                ]

                Rectangle {
                    required property var modelData
                    property var projects: rootWindow.filteredPlanningProjectsForStatus(modelData.id)
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 260

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        RowLayout {
                            Layout.fillWidth: true

                            Label {
                                text: modelData.name
                                color: "#f5f7fb"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                            }

                            Item { Layout.fillWidth: true }

                            Label {
                                text: projects.length
                                color: "#8ea4c0"
                                font.pixelSize: 11
                            }
                        }

                        Label {
                            visible: projects.length === 0
                            text: "No projects in this column."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: projects.length > 0

                            ColumnLayout {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: projects

                                    Rectangle {
                                        required property var modelData
                                        property var projectTasks: rootWindow.tasksForProject(modelData.id)
                                        property var previewTasks: projectTasks.slice(0, 3)
                                        radius: 10
                                        color: rootWindow.isSelectedProject(modelData.id) ? "#143152" : "#101826"
                                        border.color: rootWindow.isSelectedProject(modelData.id) ? "#4da0ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: projectCardLayout.implicitHeight + 20

                                        TapHandler {
                                            onTapped: engineController.selectPlanningProject(parent.modelData.id)
                                        }

                                        ColumnLayout {
                                            id: projectCardLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            Label {
                                                text: modelData.title
                                                color: "#f5f7fb"
                                                font.pixelSize: 12
                                                font.weight: Font.DemiBold
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true

                                                TapHandler {
                                                    onTapped: {
                                                        engineController.selectPlanningProject(modelData.id)
                                                        openProjectDetail(modelData.id)
                                                    }
                                                }
                                            }

                                            Label {
                                                text: modelData.priority.toUpperCase()
                                                      + " | "
                                                      + projectTasks.length
                                                      + " tasks | "
                                                      + rootWindow.formatSeconds(rootWindow.totalSecondsForProject(modelData.id))
                                                color: "#8ea4c0"
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            Label {
                                                visible: modelData.description.length > 0
                                                text: modelData.description
                                                color: "#b4c0cf"
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            ColumnLayout {
                                                visible: previewTasks.length > 0
                                                Layout.fillWidth: true
                                                spacing: 4

                                                Repeater {
                                                    model: previewTasks

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 8
                                                        color: rootWindow.isSelectedTask(modelData.id) ? "#17304d" : "#0c1320"
                                                        border.color: rootWindow.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: taskPreviewLayout.implicitHeight + 14

                                                        TapHandler {
                                                            onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                                        }

                                                        ColumnLayout {
                                                            id: taskPreviewLayout
                                                            anchors.fill: parent
                                                            anchors.margins: 7
                                                            spacing: 3

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 6

                                                                Label {
                                                                    text: modelData.title
                                                                    color: modelData.completed ? "#8ea4c0" : "#f5f7fb"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }

                                                                Rectangle {
                                                                    visible: modelData.isRunning
                                                                    radius: 999
                                                                    color: "#163a2c"
                                                                    implicitWidth: 8
                                                                    implicitHeight: 8
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 6

                                                                Label {
                                                                    text: rootWindow.taskStateLabel(modelData)
                                                                          + " | "
                                                                          + modelData.priority.toUpperCase()
                                                                          + (modelData.dueDate ? " | " + rootWindow.formatDueDate(modelData.dueDate) : "")
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 10
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }

                                                                Label {
                                                                    text: rootWindow.formatSeconds(modelData.totalSeconds)
                                                                    color: modelData.isRunning ? "#6fd3a8" : "#9bb0c9"
                                                                    font.pixelSize: 10
                                                                    font.family: "monospace"
                                                                }
                                                            }

                                                            Label {
                                                                visible: modelData.labels && modelData.labels.length > 0
                                                                text: modelData.labels.slice(0, 2).join(", ")
                                                                       + (modelData.labels.length > 2 ? " +" + (modelData.labels.length - 2) : "")
                                                                color: "#9bb0c9"
                                                                font.pixelSize: 10
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 6

                                                                Button {
                                                                    text: modelData.completed ? "Reopen" : "Complete"
                                                                    onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                                }

                                                                Button {
                                                                    text: modelData.isRunning ? "Stop Timer" : "Start Timer"
                                                                    onClicked: engineController.togglePlanningTaskTimer(modelData.id)
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            Label {
                                                visible: projectTasks.length > previewTasks.length
                                                text: "+" + (projectTasks.length - previewTasks.length) + " more tasks"
                                                color: "#8ea4c0"
                                                font.pixelSize: 10
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 6

                                                TextField {
                                                    Layout.fillWidth: true
                                                    placeholderText: "+ Add Task"
                                                    text: taskDraft(modelData.id)
                                                    onTextChanged: setTaskDraft(modelData.id, text)
                                                    onAccepted: {
                                                        const title = text.trim()
                                                        if (title.length === 0) {
                                                            return
                                                        }

                                                        engineController.createPlanningTask(modelData.id, title)
                                                        setTaskDraft(modelData.id, "")
                                                    }
                                                }

                                                Button {
                                                    text: "Add"
                                                    enabled: taskDraft(modelData.id).trim().length > 0
                                                    onClicked: {
                                                        const title = taskDraft(modelData.id).trim()
                                                        if (title.length === 0) {
                                                            return
                                                        }

                                                        engineController.createPlanningTask(modelData.id, title)
                                                        setTaskDraft(modelData.id, "")
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
            }
        }
    }
}
