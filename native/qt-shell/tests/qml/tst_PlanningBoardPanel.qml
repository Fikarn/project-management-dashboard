import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "PlanningBoardPanel"
    when: windowShown
    width: 1440
    height: 860

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: boardHostComponent

        Item {
            id: host
            width: 1440
            height: 860

            property alias board: boardPanel
            property alias engine: engineControllerStub
            property string lastOpenedProjectId: ""
            property var projects: [
                {
                    "id": "project-1",
                    "title": "Restore native planning parity",
                    "description": "Close the board and modal gaps first.",
                    "priority": "p1",
                    "status": "todo",
                    "order": 0
                },
                {
                    "id": "project-2",
                    "title": "Stabilize recovery gate",
                    "description": "Keep the fallback release-ready.",
                    "priority": "p2",
                    "status": "in-progress",
                    "order": 1
                }
            ]
            property var tasks: [
                {
                    "id": "task-1",
                    "projectId": "project-1",
                    "title": "Verify board modal flow",
                    "description": "Board title should open project detail.",
                    "priority": "p1",
                    "dueDate": "2026-04-20",
                    "labels": ["planning", "modal"],
                    "completed": false,
                    "isRunning": false,
                    "totalSeconds": 900
                },
                {
                    "id": "task-2",
                    "projectId": "project-1",
                    "title": "Keep add-task flow local",
                    "description": "Operators should not drop into side panels.",
                    "priority": "p2",
                    "dueDate": "",
                    "labels": ["board"],
                    "completed": true,
                    "isRunning": false,
                    "totalSeconds": 120
                }
            ]

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "planning"
                property string planningSelectedProjectId: ""
                property string planningSelectedTaskId: ""
                property var lastTaskCreation: null
                property string lastSelectedProjectId: ""
                property string lastSelectedTaskId: ""
                property string lastTaskCompletionToggleId: ""
                property string lastTimerToggleTaskId: ""
                property var lastReorderRequest: null

                function selectPlanningProject(projectId) {
                    planningSelectedProjectId = projectId
                    lastSelectedProjectId = projectId
                }

                function selectPlanningTask(taskId) {
                    planningSelectedTaskId = taskId
                    lastSelectedTaskId = taskId
                }

                function createPlanningTask(projectId, title) {
                    lastTaskCreation = {
                        "projectId": projectId,
                        "title": title
                    }
                }

                function togglePlanningTaskComplete(taskId) {
                    lastTaskCompletionToggleId = taskId
                }

                function togglePlanningTaskTimer(taskId) {
                    lastTimerToggleTaskId = taskId
                }

                function reorderPlanningProject(projectId, status, index) {
                    lastReorderRequest = {
                        "projectId": projectId,
                        "status": status,
                        "index": index
                    }
                }
            }

            function filteredPlanningProjectsForStatus(status) {
                const items = []

                for (let index = 0; index < projects.length; index += 1) {
                    const project = projects[index]
                    if (project.status === status) {
                        items.push(project)
                    }
                }

                items.sort(function(lhs, rhs) {
                    return lhs.order - rhs.order
                })
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

            function tasksForProject(projectId) {
                const items = []

                for (let index = 0; index < tasks.length; index += 1) {
                    if (tasks[index].projectId === projectId) {
                        items.push(tasks[index])
                    }
                }

                return items
            }

            function isSelectedProject(projectId) {
                return engineControllerStub.planningSelectedProjectId === projectId
            }

            function isSelectedTask(taskId) {
                return engineControllerStub.planningSelectedTaskId === taskId
            }

            function formatEnumLabel(value) {
                return value === "in-progress"
                       ? "In Progress"
                       : value.charAt(0).toUpperCase() + value.slice(1)
            }

            function totalSecondsForProject(projectId) {
                const projectTasks = tasksForProject(projectId)
                let total = 0

                for (let index = 0; index < projectTasks.length; index += 1) {
                    total += projectTasks[index].totalSeconds
                }

                return total
            }

            function formatSeconds(totalSeconds) {
                return totalSeconds + "s"
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

            PlanningBoardPanel {
                id: boardPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub

                function onOpenProjectDetail(projectId) {
                    host.lastOpenedProjectId = projectId
                }
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(boardHostComponent, container)
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

    function pressButton(button) {
        verify(button !== null)
        button.forceActiveFocus()
        wait(0)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_projectDetailEntryTargetIsRendered() {
        const host = createHost()
        const detailTarget = findByObjectName(host.board, "planning-board-open-detail-project-1")

        verify(detailTarget !== null)
    }

    function test_addTaskClearsDraftAfterCreate() {
        const host = createHost()
        const field = findByObjectName(host.board, "planning-board-new-task-field-project-1")
        const addButton = findByObjectName(host.board, "planning-board-new-task-add-project-1")

        verify(field !== null)
        verify(addButton !== null)

        host.board.setTaskDraft("project-1", "Capture operator handoff notes")
        wait(0)

        verify(addButton.enabled)
        pressButton(addButton)

        compare(host.engine.lastTaskCreation.projectId, "project-1")
        compare(host.engine.lastTaskCreation.title, "Capture operator handoff notes")
        compare(field.text, "")
    }

    function test_previewTaskActionsDelegateToEngine() {
        const host = createHost()
        const completeButton = findByObjectName(host.board, "planning-board-task-complete-task-1")
        const timerButton = findByObjectName(host.board, "planning-board-task-timer-task-1")

        verify(completeButton !== null)
        verify(timerButton !== null)

        pressButton(completeButton)
        pressButton(timerButton)

        compare(host.engine.lastTaskCompletionToggleId, "task-1")
        compare(host.engine.lastTimerToggleTaskId, "task-1")
    }
}
