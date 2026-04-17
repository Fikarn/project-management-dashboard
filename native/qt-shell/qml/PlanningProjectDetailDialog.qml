import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    required property var rootWindow
    required property var engineController
    required property bool open

    property var selectedProject: rootWindow.projectById(engineController.planningSelectedProjectId)
    property var selectedProjectTasks: selectedProject ? rootWindow.tasksForProject(selectedProject.id) : []
    property var checklistTotals: selectedProject ? rootWindow.checklistTotalsForProject(selectedProject.id) : ({ "done": 0, "total": 0 })
    property int completedTaskCount: selectedProject ? rootWindow.completedTaskCountForProject(selectedProject.id) : 0
    property int totalProjectSeconds: selectedProject ? rootWindow.totalSecondsForProject(selectedProject.id) : 0
    property real progressValue: selectedProject ? rootWindow.progressForProject(selectedProject.id) : 0
    property var activityItems: selectedProject ? rootWindow.activityForProject(selectedProject.id) : []
    property string newTaskTitleDraft: ""

    anchors.fill: parent
    visible: open && selectedProject !== null
    z: 40

    Rectangle {
        anchors.fill: parent
        color: "#050913"
        opacity: 0.78

        TapHandler {
            onTapped: rootWindow.planningProjectDetailVisible = false
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 56, 980)
        height: Math.min(parent.height - 72, 720)
        radius: 18
        color: "#101826"
        border.color: "#35506b"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Label {
                            text: root.selectedProject ? root.selectedProject.title : ""
                            color: "#f5f7fb"
                            font.pixelSize: 22
                            font.weight: Font.DemiBold
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Rectangle {
                            radius: 999
                            color: "#13263c"
                            border.color: "#355d93"
                            border.width: 1
                            implicitHeight: 28
                            implicitWidth: priorityBadgeLabel.implicitWidth + 18

                            Label {
                                id: priorityBadgeLabel
                                anchors.centerIn: parent
                                text: root.selectedProject ? root.selectedProject.priority.toUpperCase() : ""
                                color: "#9bc4ff"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }
                        }

                        Rectangle {
                            radius: 999
                            color: root.selectedProject && root.selectedProject.status === "done"
                                   ? "#163a2c"
                                   : root.selectedProject && root.selectedProject.status === "blocked"
                                     ? "#3c1d22"
                                     : root.selectedProject && root.selectedProject.status === "in-progress"
                                       ? "#13263c"
                                       : "#18212e"
                            border.color: root.selectedProject && root.selectedProject.status === "done"
                                          ? "#2ba36a"
                                          : root.selectedProject && root.selectedProject.status === "blocked"
                                            ? "#9f4f5c"
                                            : root.selectedProject && root.selectedProject.status === "in-progress"
                                              ? "#4da0ff"
                                              : "#3e536d"
                            border.width: 1
                            implicitHeight: 28
                            implicitWidth: statusBadgeLabel.implicitWidth + 18

                            Label {
                                id: statusBadgeLabel
                                anchors.centerIn: parent
                                text: root.selectedProject ? rootWindow.formatEnumLabel(root.selectedProject.status) : ""
                                color: root.selectedProject && root.selectedProject.status === "done"
                                       ? "#d7ffea"
                                       : root.selectedProject && root.selectedProject.status === "blocked"
                                         ? "#ffd2da"
                                         : root.selectedProject && root.selectedProject.status === "in-progress"
                                           ? "#dcecff"
                                           : "#d6dce5"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }
                        }
                    }

                    Label {
                        visible: root.selectedProject && root.selectedProject.description.length > 0
                        text: root.selectedProject ? root.selectedProject.description : ""
                        color: "#b4c0cf"
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }

                Button {
                    text: "Close"
                    onClicked: rootWindow.planningProjectDetailVisible = false
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: [
                        {
                            "label": "Tasks",
                            "value": root.selectedProjectTasks.length > 0
                                     ? root.completedTaskCount + "/" + root.selectedProjectTasks.length
                                     : "0"
                        },
                        { "label": "Tracked", "value": rootWindow.formatSeconds(root.totalProjectSeconds) },
                        {
                            "label": "Checklist",
                            "value": root.checklistTotals.total > 0
                                     ? root.checklistTotals.done + "/" + root.checklistTotals.total
                                     : "0"
                        }
                    ]

                    Rectangle {
                        required property var modelData
                        radius: 999
                        color: "#0c1320"
                        border.color: "#24344a"
                        border.width: 1
                        implicitHeight: 32
                        implicitWidth: detailBadgeLabel.implicitWidth + detailBadgeValue.implicitWidth + 28

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            spacing: 6

                            Label {
                                id: detailBadgeLabel
                                text: modelData.label
                                color: "#8ea4c0"
                                font.pixelSize: 11
                            }

                            Label {
                                id: detailBadgeValue
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
                visible: root.selectedProjectTasks.length > 0
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

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    Layout.fillWidth: true
                    placeholderText: "New task for " + (root.selectedProject ? root.selectedProject.title : "project")
                    text: root.newTaskTitleDraft
                    onTextChanged: root.newTaskTitleDraft = text
                    onAccepted: {
                        const title = text.trim()
                        if (!root.selectedProject || title.length === 0) {
                            return
                        }

                        engineController.createPlanningTask(root.selectedProject.id, title)
                        root.newTaskTitleDraft = ""
                    }
                }

                Button {
                    text: "Add Task"
                    enabled: root.selectedProject && root.newTaskTitleDraft.trim().length > 0
                    onClicked: {
                        const title = root.newTaskTitleDraft.trim()
                        if (!root.selectedProject || title.length === 0) {
                            return
                        }

                        engineController.createPlanningTask(root.selectedProject.id, title)
                        root.newTaskTitleDraft = ""
                    }
                }
            }

            GridLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                columns: rootWindow.width >= 1240 ? 2 : 1
                columnSpacing: 12
                rowSpacing: 12

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
                            text: "Tasks"
                            color: "#f5f7fb"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: root.selectedProjectTasks.length === 0
                            text: "No tasks exist for this project yet."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: root.selectedProjectTasks.length > 0
                            contentWidth: availableWidth

                            ColumnLayout {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: root.selectedProjectTasks

                                    Rectangle {
                                        id: taskCard
                                        required property var modelData
                                        radius: 10
                                        color: rootWindow.isSelectedTask(modelData.id) ? "#143152" : "#101826"
                                        border.color: rootWindow.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: taskLayout.implicitHeight + 20

                                        TapHandler {
                                            onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                        }

                                        ColumnLayout {
                                            id: taskLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                Label {
                                                    text: modelData.title
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 13
                                                    font.weight: Font.DemiBold
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Button {
                                                    text: modelData.completed ? "Reopen" : "Complete"
                                                    onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                }
                                            }

                                            Label {
                                                text: rootWindow.taskStateLabel(modelData)
                                                      + " | "
                                                      + modelData.priority.toUpperCase()
                                                      + (modelData.dueDate ? " | " + rootWindow.formatDueDate(modelData.dueDate) : "")
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

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                Label {
                                                    text: rootWindow.checklistProgress(modelData.checklist)
                                                          + " | "
                                                          + rootWindow.formatSeconds(modelData.totalSeconds)
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Button {
                                                    text: modelData.isRunning ? "Stop Timer" : "Start Timer"
                                                    onClicked: engineController.togglePlanningTaskTimer(modelData.id)
                                                }
                                            }

                                            ColumnLayout {
                                                visible: modelData.checklist && modelData.checklist.length > 0
                                                Layout.fillWidth: true
                                                spacing: 4

                                                Repeater {
                                                    model: modelData.checklist

                                                    RowLayout {
                                                        required property var modelData
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Button {
                                                            text: modelData.done ? "Done" : "Open"
                                                            highlighted: modelData.done
                                                            onClicked: engineController.setPlanningChecklistItemDone(
                                                                           taskCard.modelData.id,
                                                                           modelData.id,
                                                                           !modelData.done
                                                                       )
                                                        }

                                                        Label {
                                                            text: modelData.text
                                                            color: modelData.done ? "#8ea4c0" : "#f5f7fb"
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
                            text: "Activity"
                            color: "#f5f7fb"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: root.activityItems.length === 0
                            text: "No matching activity entries found yet."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: root.activityItems.length > 0
                            contentWidth: availableWidth

                            ColumnLayout {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: root.activityItems.slice(0, 12)

                                    Rectangle {
                                        required property var modelData
                                        radius: 10
                                        color: "#101826"
                                        border.color: "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: activityLayout.implicitHeight + 20

                                        ColumnLayout {
                                            id: activityLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 4

                                            Label {
                                                text: rootWindow.activitySummary(modelData)
                                                color: "#f5f7fb"
                                                font.pixelSize: 13
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
    }
}
