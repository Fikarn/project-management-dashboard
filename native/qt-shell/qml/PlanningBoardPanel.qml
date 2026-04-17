import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    required property var rootWindow
    required property var engineController

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
                                        radius: 10
                                        color: rootWindow.isSelectedProject(modelData.id) ? "#143152" : "#101826"
                                        border.color: rootWindow.isSelectedProject(modelData.id) ? "#4da0ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: 110

                                        TapHandler {
                                            onTapped: engineController.selectPlanningProject(parent.modelData.id)
                                        }

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 4

                                            Label {
                                                text: modelData.title
                                                color: "#f5f7fb"
                                                font.pixelSize: 12
                                                font.weight: Font.DemiBold
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }

                                            Label {
                                                text: modelData.priority.toUpperCase()
                                                      + " | "
                                                      + rootWindow.tasksForProject(modelData.id).length
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
