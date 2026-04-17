import QtQuick
import QtQuick.Controls
import QtTest
import "../../qml"

TestCase {
    name: "PlanningModalFlow"
    when: windowShown
    width: 1440
    height: 860

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: modalHostComponent

        FocusScope {
            id: host
            width: 1440
            height: 860
            focus: true

            property alias board: boardPanel
            property alias dialog: detailDialog
            property alias engine: engineControllerStub
            property bool planningProjectDetailVisible: false
            property bool planningTimeReportVisible: false
            property bool keyboardHelpVisible: false
            property var projects: [
                {
                    "id": "project-1",
                    "title": "Restore native planning parity",
                    "description": "Keep the operator workflow aligned with the legacy board.",
                    "priority": "p1",
                    "status": "todo",
                    "order": 0
                }
            ]
            property var tasks: [
                {
                    "id": "task-1",
                    "projectId": "project-1",
                    "title": "Verify modal open from board",
                    "description": "Open the native project detail directly from the lane.",
                    "priority": "p1",
                    "dueDate": "2026-04-22",
                    "labels": ["planning", "modal"],
                    "completed": false,
                    "isRunning": false,
                    "totalSeconds": 780,
                    "checklist": [
                        {
                            "id": "check-1",
                            "text": "Confirm board title opens detail",
                            "done": false
                        }
                    ]
                }
            ]
            property var activityLog: [
                {
                    "id": "activity-1",
                    "entityId": "project-1",
                    "action": "updated",
                    "entityType": "project",
                    "detail": "Planning board detail flow reviewed.",
                    "timestamp": "2026-04-17T12:00:00.000Z"
                }
            ]

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "planning"
                property string planningSelectedProjectId: ""
                property string planningSelectedTaskId: ""
                property string lastSelectedProjectId: ""

                function selectPlanningProject(projectId) {
                    planningSelectedProjectId = projectId
                    lastSelectedProjectId = projectId
                }

                function selectPlanningTask(taskId) {
                    planningSelectedTaskId = taskId
                }

                function createPlanningTask(projectId, title) {}
                function togglePlanningTaskComplete(taskId) {}
                function togglePlanningTaskTimer(taskId) {}
                function reorderPlanningProject(projectId, status, index) {}
                function updatePlanningProject(projectId, title, description, priority) {}
                function deletePlanningProject(projectId) {}
                function updatePlanningTask(taskId, title, description, priority, dueDate, labels) {}
                function deletePlanningTask(taskId) {}
                function addPlanningChecklistItem(taskId, text) {}
                function setPlanningChecklistItemDone(taskId, itemId, done) {}
                function deletePlanningChecklistItem(taskId, itemId) {}
            }

            function closeTransientPanels() {
                keyboardHelpVisible = false
                planningTimeReportVisible = false
                planningProjectDetailVisible = false
            }

            function openPlanningProjectDetail(projectId) {
                if (!projectId || projectId.length === 0) {
                    return
                }

                engineControllerStub.selectPlanningProject(projectId)
                planningProjectDetailVisible = true
            }

            function filteredPlanningProjectsForStatus(status) {
                const items = []

                for (let index = 0; index < projects.length; index += 1) {
                    if (projects[index].status === status) {
                        items.push(projects[index])
                    }
                }

                return items
            }

            function projectById(projectId) {
                for (let index = 0; index < projects.length; index += 1) {
                    if (projects[index].id === projectId) {
                        return projects[index]
                    }
                }

                return null
            }

            function taskById(taskId) {
                for (let index = 0; index < tasks.length; index += 1) {
                    if (tasks[index].id === taskId) {
                        return tasks[index]
                    }
                }

                return null
            }

            function tasksForProject(projectId) {
                const items = []

                for (let index = 0; index < tasks.length; index += 1) {
                    if (tasks[index].projectId === projectId) {
                        items.push(tasks[index])
                    }
                }

                return items
            }

            function checklistTotalsForProject(projectId) {
                const projectTasks = tasksForProject(projectId)
                let done = 0
                let total = 0

                for (let index = 0; index < projectTasks.length; index += 1) {
                    const checklist = projectTasks[index].checklist || []
                    total += checklist.length
                    for (let itemIndex = 0; itemIndex < checklist.length; itemIndex += 1) {
                        if (checklist[itemIndex].done) {
                            done += 1
                        }
                    }
                }

                return { "done": done, "total": total }
            }

            function completedTaskCountForProject(projectId) {
                const projectTasks = tasksForProject(projectId)
                let count = 0

                for (let index = 0; index < projectTasks.length; index += 1) {
                    if (projectTasks[index].completed) {
                        count += 1
                    }
                }

                return count
            }

            function totalSecondsForProject(projectId) {
                const projectTasks = tasksForProject(projectId)
                let total = 0

                for (let index = 0; index < projectTasks.length; index += 1) {
                    total += projectTasks[index].totalSeconds
                }

                return total
            }

            function progressForProject(projectId) {
                const projectTasks = tasksForProject(projectId)
                if (projectTasks.length === 0) {
                    return 0
                }

                return completedTaskCountForProject(projectId) / projectTasks.length
            }

            function activityForProject(projectId) {
                const items = []

                for (let index = 0; index < activityLog.length; index += 1) {
                    if (activityLog[index].entityId === projectId) {
                        items.push(activityLog[index])
                    }
                }

                return items
            }

            function labelsToCsv(labels) {
                return labels.join(", ")
            }

            function isSelectedProject(projectId) {
                return engineControllerStub.planningSelectedProjectId === projectId
            }

            function isSelectedTask(taskId) {
                return engineControllerStub.planningSelectedTaskId === taskId
            }

            function taskStateLabel(task) {
                if (task.isRunning) {
                    return "Running"
                }

                if (task.completed) {
                    return "Completed"
                }

                return "Queued"
            }

            function formatDueDate(dueDate) {
                return dueDate
            }

            function checklistProgress(checklist) {
                let done = 0

                for (let index = 0; index < checklist.length; index += 1) {
                    if (checklist[index].done) {
                        done += 1
                    }
                }

                return done + "/" + checklist.length + " done"
            }

            function formatSeconds(totalSeconds) {
                return totalSeconds + "s"
            }

            function activitySummary(entry) {
                return formatEnumLabel(entry.action) + " " + formatEnumLabel(entry.entityType)
            }

            function formatTimestamp(timestamp) {
                return timestamp
            }

            function formatEnumLabel(value) {
                return value === "in-progress"
                       ? "In Progress"
                       : value.charAt(0).toUpperCase() + value.slice(1)
            }

            Shortcut {
                id: escapeShortcut
                sequence: "Esc"
                enabled: host.keyboardHelpVisible || host.planningTimeReportVisible || host.planningProjectDetailVisible
                onActivated: host.closeTransientPanels()
            }

            PlanningBoardPanel {
                id: boardPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub

                function onOpenProjectDetail(projectId) {
                    host.openPlanningProjectDetail(projectId)
                }
            }

            PlanningProjectDetailDialog {
                id: detailDialog
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                open: host.planningProjectDetailVisible
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(modalHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.board)
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

    function test_openPlanningProjectDetailOpensPlanningProjectDetail() {
        const host = createHost()
        host.openPlanningProjectDetail("project-1")
        wait(0)

        compare(host.engine.lastSelectedProjectId, "project-1")
        compare(host.planningProjectDetailVisible, true)
        compare(host.dialog.selectedProject.id, "project-1")
    }

    function test_escapeClosesTransientPanels() {
        const host = createHost()

        host.keyboardHelpVisible = true
        host.planningTimeReportVisible = true
        host.planningProjectDetailVisible = true
        host.forceActiveFocus()
        wait(0)

        keyClick(Qt.Key_Escape)
        wait(0)

        compare(host.keyboardHelpVisible, false)
        compare(host.planningTimeReportVisible, false)
        compare(host.planningProjectDetailVisible, false)
    }
}
