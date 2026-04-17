import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "PlanningQuickActionsPanel"
    when: windowShown
    width: 960
    height: 420

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: quickActionsHostComponent

        Item {
            id: host
            width: 960
            height: 420

            property alias panel: quickActionsPanel
            property alias engine: engineControllerStub
            property string supportRestorePathDraft: ""

            function projectTitle(projectId) {
                return projectId === "project-1" ? "Restore native planning parity" : ""
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "planning"
                property string planningSelectedProjectId: "project-1"
                property string supportRestoreDetails: "Restore from a native support backup archive or a legacy db.json export."
                property string supportLatestBackupPath: "/tmp/latest-backup.json"
                property var createdProject: null
                property var createdTask: null
                property int exportSupportBackupCalls: 0
                property int openSupportBackupDirectoryCalls: 0
                property string restoredPath: ""

                function createPlanningProject(title) {
                    createdProject = title
                }

                function createPlanningTask(projectId, title) {
                    createdTask = { "projectId": projectId, "title": title }
                }

                function exportSupportBackup() {
                    exportSupportBackupCalls += 1
                }

                function openSupportBackupDirectory() {
                    openSupportBackupDirectoryCalls += 1
                }

                function restoreSupportBackup(path) {
                    restoredPath = path
                }
            }

            PlanningQuickActionsPanel {
                id: quickActionsPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(quickActionsHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.panel)
        return host
    }

    function findByObjectName(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const childItems = item.children || []
        for (let index = 0; index < childItems.length; index += 1) {
            const match = findByObjectName(childItems[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function pressButton(button) {
        verify(button !== null)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_projectTaskExportAndImportActionsRouteToEngine() {
        const host = createHost()
        const projectField = findByObjectName(host.panel, "planning-new-project-field")
        const taskField = findByObjectName(host.panel, "planning-new-task-field")
        const importField = findByObjectName(host.panel, "planning-import-path-field")

        projectField.text = "Finish planning parity"
        taskField.text = "Validate native dashboard header"
        importField.text = "/tmp/legacy-db.json"
        wait(0)

        pressButton(findByObjectName(host.panel, "planning-new-project-add"))
        compare(host.engine.createdProject, "Finish planning parity")

        pressButton(findByObjectName(host.panel, "planning-new-task-add"))
        compare(host.engine.createdTask.projectId, "project-1")
        compare(host.engine.createdTask.title, "Validate native dashboard header")

        pressButton(findByObjectName(host.panel, "planning-export-backup-button"))
        compare(host.engine.exportSupportBackupCalls, 1)

        pressButton(findByObjectName(host.panel, "planning-open-backups-button"))
        compare(host.engine.openSupportBackupDirectoryCalls, 1)

        pressButton(findByObjectName(host.panel, "planning-import-button"))
        compare(host.engine.restoredPath, "/tmp/legacy-db.json")
    }
}
