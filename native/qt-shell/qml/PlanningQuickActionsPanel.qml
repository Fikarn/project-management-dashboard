import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQml

Rectangle {
    id: root
    objectName: "planning-quick-actions-panel"
    required property var rootWindow
    required property var engineController
    property alias newProjectTitleField: newProjectTitleField

    visible: !!engineController && engineController.workspaceMode === "planning"
    radius: 12
    color: "#101826"
    border.color: "#24344a"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: quickActionsLayout.implicitHeight + 24

    ColumnLayout {
        id: quickActionsLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        Label {
            text: "Quick Actions"
            color: "#f5f7fb"
            font.pixelSize: 14
            font.weight: Font.DemiBold
        }

        Label {
            text: "Create projects and tasks from the board edge, then export or import planning data without leaving the workspace."
            color: "#b4c0cf"
            font.pixelSize: 12
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: newProjectTitleField
                objectName: "planning-new-project-field"
                Layout.fillWidth: true
                placeholderText: "New project title"
                onAccepted: {
                    const title = text.trim()
                    if (title.length === 0) {
                        return
                    }

                    engineController.createPlanningProject(title)
                    text = ""
                }
            }

            Button {
                objectName: "planning-new-project-add"
                text: "Add Project"
                enabled: newProjectTitleField.text.trim().length > 0
                onClicked: {
                    const title = newProjectTitleField.text.trim()
                    if (title.length === 0) {
                        return
                    }

                    engineController.createPlanningProject(title)
                    newProjectTitleField.text = ""
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            TextField {
                id: newTaskTitleField
                objectName: "planning-new-task-field"
                Layout.fillWidth: true
                enabled: !!engineController && engineController.planningSelectedProjectId.length > 0
                placeholderText: engineController && engineController.planningSelectedProjectId.length > 0
                                 ? "New task for " + rootWindow.projectTitle(engineController.planningSelectedProjectId)
                                 : "Select a project to add a task"
                onAccepted: {
                    const title = text.trim()
                    if (title.length === 0 || engineController.planningSelectedProjectId.length === 0) {
                        return
                    }

                    engineController.createPlanningTask(engineController.planningSelectedProjectId, title)
                    text = ""
                }
            }

            Button {
                objectName: "planning-new-task-add"
                text: "Add Task"
                enabled: !!engineController && engineController.planningSelectedProjectId.length > 0
                         && newTaskTitleField.text.trim().length > 0
                onClicked: {
                    const title = newTaskTitleField.text.trim()
                    if (title.length === 0 || engineController.planningSelectedProjectId.length === 0) {
                        return
                    }

                    engineController.createPlanningTask(engineController.planningSelectedProjectId, title)
                    newTaskTitleField.text = ""
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                objectName: "planning-export-backup-button"
                text: "Export Backup"
                onClicked: engineController.exportSupportBackup()
            }

            Button {
                objectName: "planning-open-backups-button"
                text: "Open Backups"
                onClicked: engineController.openSupportBackupDirectory()
            }
        }

        TextField {
            id: importPathField
            objectName: "planning-import-path-field"
            Layout.fillWidth: true
            placeholderText: "Backup or legacy db.json path"
            onTextChanged: rootWindow.supportRestorePathDraft = text

            Binding {
                target: importPathField
                property: "text"
                value: rootWindow.supportRestorePathDraft
                when: !importPathField.activeFocus
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Button {
                objectName: "planning-import-button"
                text: "Import Data"
                enabled: rootWindow.supportRestorePathDraft.trim().length > 0
                onClicked: engineController.restoreSupportBackup(rootWindow.supportRestorePathDraft.trim())
            }

            Label {
                text: "Supports native backups and legacy db.json exports."
                color: "#8ea4c0"
                font.pixelSize: 11
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }

        Label {
            text: engineController ? engineController.supportRestoreDetails : "Restore details are loading."
            color: "#8ea4c0"
            font.pixelSize: 11
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Label {
            visible: !!engineController && engineController.supportLatestBackupPath.length > 0
            text: engineController ? "Latest backup: " + engineController.supportLatestBackupPath : ""
            color: "#b4c0cf"
            font.pixelSize: 11
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }
    }
}
