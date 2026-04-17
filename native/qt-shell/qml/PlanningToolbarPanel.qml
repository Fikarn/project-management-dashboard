import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQml

ColumnLayout {
    id: root
    objectName: "planning-toolbar-panel"
    required property var rootWindow
    required property var engineController

    Layout.fillWidth: true
    visible: !!engineController && engineController.workspaceMode === "planning"
    spacing: 10

    function focusSearch() {
        planningSearchField.forceActiveFocus()
        Qt.callLater(function() {
            planningSearchField.selectAll()
        })
    }

    Rectangle {
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        implicitHeight: planningToolbarLayout.implicitHeight + 24

        ColumnLayout {
            id: planningToolbarLayout
            anchors.fill: parent
            anchors.margins: 12
            spacing: 10

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                TextField {
                    id: planningSearchField
                    objectName: "planning-search-field"
                    Layout.fillWidth: true
                    placeholderText: "Search projects, tasks, labels..."
                    onTextChanged: rootWindow.planningSearchQuery = text

                    Binding {
                        target: planningSearchField
                        property: "text"
                        value: rootWindow.planningSearchQuery
                        when: !planningSearchField.activeFocus
                    }
                }

                Label {
                    text: rootWindow.planningResultCount() + " results"
                    color: "#8ea4c0"
                    font.pixelSize: 11
                }

                ComboBox {
                    id: planningSortComboBox
                    objectName: "planning-sort-combo"
                    Layout.preferredWidth: 160
                    model: [
                        { "id": "manual", "name": "Manual" },
                        { "id": "priority", "name": "Priority" },
                        { "id": "date", "name": "Last Updated" },
                        { "id": "name", "name": "Name" }
                    ]
                    textRole: "name"
                    currentIndex: {
                        for (let index = 0; index < model.length; index += 1) {
                            if (engineController && model[index].id === engineController.planningSortBy) {
                                return index
                            }
                        }
                        return 0
                    }
                    onActivated: engineController.updatePlanningSettings(
                                     { "sortBy": model[currentIndex].id }
                                 )
                }

                Button {
                    objectName: "planning-time-report-toggle"
                    text: rootWindow.planningTimeReportVisible ? "Hide Report" : "Time Report"
                    onClicked: {
                        rootWindow.planningTimeReportVisible = !rootWindow.planningTimeReportVisible
                        if (rootWindow.planningTimeReportVisible) {
                            engineController.requestPlanningTimeReport()
                        }
                    }
                }

                Button {
                    objectName: "planning-shortcuts-toggle"
                    text: rootWindow.keyboardHelpVisible ? "Hide Help" : "Shortcuts"
                    onClicked: rootWindow.keyboardHelpVisible = !rootWindow.keyboardHelpVisible
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: [
                        { "id": "all", "name": "All", "shortcut": "0" },
                        { "id": "todo", "name": "To Do", "shortcut": "1" },
                        { "id": "in-progress", "name": "In Progress", "shortcut": "2" },
                        { "id": "blocked", "name": "Blocked", "shortcut": "3" },
                        { "id": "done", "name": "Done", "shortcut": "4" }
                    ]

                    Button {
                        required property var modelData
                        objectName: "planning-filter-" + modelData.id
                        text: modelData.name + " (" + modelData.shortcut + ")"
                        highlighted: !!engineController && engineController.planningViewFilter === modelData.id
                        onClicked: engineController.updatePlanningSettings(
                                       { "viewFilter": modelData.id }
                                   )
                    }
                }
            }
        }
    }

    Rectangle {
        visible: rootWindow.planningTimeReportVisible
        radius: 12
        color: "#101826"
        border.color: "#2a3b55"
        border.width: 1
        Layout.fillWidth: true
        implicitHeight: planningTimeReportLayout.implicitHeight + 24

        ColumnLayout {
            id: planningTimeReportLayout
            anchors.fill: parent
            anchors.margins: 12
            spacing: 10

            RowLayout {
                Layout.fillWidth: true

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Label {
                        text: "Time Report"
                        color: "#f5f7fb"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: engineController && engineController.planningTimeReportLoaded
                              ? rootWindow.formatSeconds(engineController.planningTotalTrackedSeconds)
                              : "Loading..."
                        color: "#8ea4c0"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "Refresh"
                    onClicked: engineController.requestPlanningTimeReport()
                }
            }

            GridLayout {
                Layout.fillWidth: true
                columns: rootWindow.width >= 1320 ? 2 : 1
                columnSpacing: 12
                rowSpacing: 12

                Rectangle {
                    radius: 10
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 220

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        Label { text: "By Project"; color: "#8ea4c0"; font.pixelSize: 11 }

                        Repeater {
                            model: engineController ? engineController.planningTimeByProject : []

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Label {
                                    text: modelData.title
                                    color: "#f5f7fb"
                                    Layout.fillWidth: true
                                    wrapMode: Text.WordWrap
                                }

                                Label {
                                    text: rootWindow.formatSeconds(modelData.totalSeconds)
                                    color: "#9bb0c9"
                                    font.family: "monospace"
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
                    implicitHeight: 220

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 6

                        Label { text: "By Task"; color: "#8ea4c0"; font.pixelSize: 11 }

                        Repeater {
                            model: engineController ? engineController.planningTimeByTask.slice(0, 8) : []

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Label {
                                    text: modelData.taskTitle + "  " + modelData.projectTitle
                                    color: "#f5f7fb"
                                    Layout.fillWidth: true
                                    wrapMode: Text.WordWrap
                                }

                                Label {
                                    text: rootWindow.formatSeconds(modelData.totalSeconds)
                                    color: "#9bb0c9"
                                    font.family: "monospace"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
