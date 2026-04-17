import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "PlanningProjectDetailDialog"
    when: windowShown
    width: 1280
    height: 820

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: dialogHostComponent

        Item {
            id: host
            width: 1280
            height: 820

            property alias dialog: detailDialog
            property alias engine: engineControllerStub
            property alias rootWindowObj: rootWindowStub

            QtObject {
                id: engineControllerStub

                property string planningSelectedProjectId: "project-1"
                property string planningSelectedTaskId: "task-1"
                property var lastProjectUpdate: null
                property var lastTaskUpdate: null
                property var lastTaskCreation: null
                property var lastChecklistAdd: null
                property string lastSelectedTaskId: ""
                property string lastDeletedProjectId: ""
                property string lastDeletedTaskId: ""
                property var lastChecklistToggle: null
                property var lastChecklistDelete: null
                property string lastTimerToggleTaskId: ""
                property string lastTaskCompletionToggleId: ""

                function createPlanningTask(projectId, title) {
                    lastTaskCreation = {
                        "projectId": projectId,
                        "title": title
                    }
                }

                function selectPlanningTask(taskId) {
                    planningSelectedTaskId = taskId
                    lastSelectedTaskId = taskId
                }

                function updatePlanningProject(projectId, title, description, priority) {
                    lastProjectUpdate = {
                        "projectId": projectId,
                        "title": title,
                        "description": description,
                        "priority": priority
                    }
                }

                function deletePlanningProject(projectId) {
                    lastDeletedProjectId = projectId
                }

                function updatePlanningTask(taskId, title, description, priority, dueDate, labels) {
                    lastTaskUpdate = {
                        "taskId": taskId,
                        "title": title,
                        "description": description,
                        "priority": priority,
                        "dueDate": dueDate,
                        "labels": labels
                    }
                }

                function deletePlanningTask(taskId) {
                    lastDeletedTaskId = taskId
                }

                function addPlanningChecklistItem(taskId, text) {
                    lastChecklistAdd = {
                        "taskId": taskId,
                        "text": text
                    }
                }

                function setPlanningChecklistItemDone(taskId, itemId, done) {
                    lastChecklistToggle = {
                        "taskId": taskId,
                        "itemId": itemId,
                        "done": done
                    }
                }

                function deletePlanningChecklistItem(taskId, itemId) {
                    lastChecklistDelete = {
                        "taskId": taskId,
                        "itemId": itemId
                    }
                }

                function togglePlanningTaskTimer(taskId) {
                    lastTimerToggleTaskId = taskId
                }

                function togglePlanningTaskComplete(taskId) {
                    lastTaskCompletionToggleId = taskId
                }
            }

            QtObject {
                id: rootWindowStub

                property int width: 1280
                property bool planningProjectDetailVisible: true
                property var engineControllerRef: engineControllerStub
                property var projects: [
                    {
                        "id": "project-1",
                        "title": "Run show control parity",
                        "description": "Restore the planning board workflow in native.",
                        "priority": "p2",
                        "status": "in-progress"
                    }
                ]
                property var tasks: [
                    {
                        "id": "task-1",
                        "projectId": "project-1",
                        "title": "Draft cue sheet review",
                        "description": "Verify operator-facing labels.",
                        "priority": "p2",
                        "dueDate": "2026-04-20",
                        "labels": ["deck", "planning"],
                        "completed": false,
                        "isRunning": false,
                        "totalSeconds": 120,
                        "checklist": [
                            {
                                "id": "item-1",
                                "text": "Confirm page labels",
                                "done": false
                            }
                        ]
                    },
                    {
                        "id": "task-2",
                        "projectId": "project-1",
                        "title": "Verify timer output",
                        "description": "",
                        "priority": "p1",
                        "dueDate": "",
                        "labels": ["timers"],
                        "completed": true,
                        "isRunning": false,
                        "totalSeconds": 360,
                        "checklist": []
                    }
                ]
                property var activityLog: [
                    {
                        "id": "activity-1",
                        "entityId": "project-1",
                        "action": "update",
                        "entityType": "project",
                        "detail": "Planning detail dialog opened for review.",
                        "timestamp": "2026-04-17T10:00:00.000Z"
                    }
                ]

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
                    const matches = []
                    for (let index = 0; index < tasks.length; index += 1) {
                        if (tasks[index].projectId === projectId) {
                            matches.push(tasks[index])
                        }
                    }

                    return matches
                }

                function activityForProject(projectId) {
                    const matches = []
                    const projectTasks = tasksForProject(projectId)
                    const taskIds = {}

                    for (let index = 0; index < projectTasks.length; index += 1) {
                        taskIds[projectTasks[index].id] = true
                    }

                    for (let index = 0; index < activityLog.length; index += 1) {
                        const entry = activityLog[index]
                        if (entry.entityId === projectId || taskIds[entry.entityId]) {
                            matches.push(entry)
                        }
                    }

                    return matches
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

                function isSelectedTask(taskId) {
                    return engineControllerRef.planningSelectedTaskId === taskId
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

                function labelsToCsv(labels) {
                    return labels.join(", ")
                }

                function formatEnumLabel(value) {
                    if (value === "todo") {
                        return "To Do"
                    }

                    if (value === "in-progress") {
                        return "In Progress"
                    }

                    if (value.length === 0) {
                        return value
                    }

                    return value.charAt(0).toUpperCase() + value.slice(1)
                }
            }

            PlanningProjectDetailDialog {
                id: detailDialog
                anchors.fill: parent
                rootWindow: rootWindowStub
                engineController: engineControllerStub
                open: rootWindowStub.planningProjectDetailVisible
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(dialogHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.dialog)
        return host
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

    function replaceText(field, value) {
        verify(field !== null)
        field.forceActiveFocus()
        wait(0)
        field.text = value
        wait(0)
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

    function test_projectEditSavesUpdatedFields() {
        const host = createHost()
        const editToggle = findByObjectName(host.dialog, "planning-project-edit-toggle")
        pressButton(editToggle)

        const titleField = findByObjectName(host.dialog, "planning-project-title-field")
        const descriptionField = findByObjectName(host.dialog, "planning-project-description-field")
        const priorityButton = findByObjectName(host.dialog, "planning-project-priority-p0")
        const saveButton = findByObjectName(host.dialog, "planning-project-save")

        verify(titleField !== null)
        verify(descriptionField !== null)
        verify(priorityButton !== null)
        verify(saveButton !== null)

        replaceText(titleField, "Run show control parity review")
        replaceText(descriptionField, "Validate the dashboard and board workflow in native.")
        pressButton(priorityButton)

        verify(saveButton.enabled)
        pressButton(saveButton)

        compare(host.engine.lastProjectUpdate.projectId, "project-1")
        compare(host.engine.lastProjectUpdate.title, "Run show control parity review")
        compare(host.engine.lastProjectUpdate.description, "Validate the dashboard and board workflow in native.")
        compare(host.engine.lastProjectUpdate.priority, "p0")
        compare(host.dialog.projectEditMode, false)
    }

    function test_projectCancelRestoresOriginalDrafts() {
        const host = createHost()
        const editToggle = findByObjectName(host.dialog, "planning-project-edit-toggle")
        pressButton(editToggle)

        const titleField = findByObjectName(host.dialog, "planning-project-title-field")
        verify(titleField !== null)

        replaceText(titleField, "Temporary operator draft")
        pressButton(editToggle)
        compare(host.dialog.projectEditMode, false)

        pressButton(editToggle)
        compare(titleField.text, "Run show control parity")
    }

    function test_taskEditSavesUpdatedFields() {
        const host = createHost()
        const editButton = findByObjectName(host.dialog, "planning-task-edit-task-1")
        pressButton(editButton)

        compare(host.engine.lastSelectedTaskId, "task-1")

        const titleField = findByObjectName(host.dialog, "planning-task-title-field-task-1")
        const descriptionField = findByObjectName(host.dialog, "planning-task-description-field-task-1")
        const dueDateField = findByObjectName(host.dialog, "planning-task-due-date-field-task-1")
        const labelsField = findByObjectName(host.dialog, "planning-task-labels-field-task-1")
        const priorityButton = findByObjectName(host.dialog, "planning-task-priority-task-1-p0")
        const saveButton = findByObjectName(host.dialog, "planning-task-save-task-1")

        verify(titleField !== null)
        verify(descriptionField !== null)
        verify(dueDateField !== null)
        verify(labelsField !== null)
        verify(priorityButton !== null)
        verify(saveButton !== null)

        replaceText(titleField, "Finalize cue sheet review")
        replaceText(descriptionField, "Check labels, timing, and lane ordering.")
        replaceText(dueDateField, "2026-04-21")
        replaceText(labelsField, "deck, review, mission-critical")
        pressButton(priorityButton)

        verify(saveButton.enabled)
        pressButton(saveButton)

        compare(host.engine.lastTaskUpdate.taskId, "task-1")
        compare(host.engine.lastTaskUpdate.title, "Finalize cue sheet review")
        compare(host.engine.lastTaskUpdate.description, "Check labels, timing, and lane ordering.")
        compare(host.engine.lastTaskUpdate.priority, "p0")
        compare(host.engine.lastTaskUpdate.dueDate, "2026-04-21")
        compare(host.engine.lastTaskUpdate.labels, "deck, review, mission-critical")
        compare(host.dialog.editingTaskId, "")
    }

    function test_addTaskClearsDraftAfterCreate() {
        const host = createHost()
        const taskField = findByObjectName(host.dialog, "planning-detail-new-task-field")
        const addButton = findByObjectName(host.dialog, "planning-detail-new-task-add")

        verify(taskField !== null)
        verify(addButton !== null)

        replaceText(taskField, "Publish day-of-show notes")
        verify(addButton.enabled)
        pressButton(addButton)

        compare(host.engine.lastTaskCreation.projectId, "project-1")
        compare(host.engine.lastTaskCreation.title, "Publish day-of-show notes")
        compare(host.dialog.newTaskTitleDraft, "")
        compare(taskField.text, "")
    }

    function test_addChecklistItemClearsDraftAfterCreate() {
        const host = createHost()
        const checklistField = findByObjectName(host.dialog, "planning-checklist-field-task-1")
        const addButton = findByObjectName(host.dialog, "planning-checklist-add-task-1")

        verify(checklistField !== null)
        verify(addButton !== null)

        host.dialog.setChecklistDraft("task-1", "Verify fallback packaging")
        wait(0)
        verify(addButton.enabled)
        pressButton(addButton)

        compare(host.engine.lastChecklistAdd.taskId, "task-1")
        compare(host.engine.lastChecklistAdd.text, "Verify fallback packaging")
        compare(host.dialog.checklistDraft("task-1"), "")
        compare(checklistField.text, "")
    }
}
