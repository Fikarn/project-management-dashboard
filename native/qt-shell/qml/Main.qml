import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

ApplicationWindow {
    id: root
    property var engineController: null
    property bool shellSmokeTest: false
    property bool windowSettingsApplied: false
    property bool suppressWindowStateSync: false
    property string selectedProjectTitleDraft: ""
    property string selectedProjectDescriptionDraft: ""
    property string selectedProjectPriorityDraft: "p2"
    property string selectedTaskTitleDraft: ""
    property string selectedTaskDescriptionDraft: ""
    property string selectedTaskPriorityDraft: "p2"
    property string selectedTaskDueDateDraft: ""
    property string selectedTaskLabelsDraft: ""
    property string selectedChecklistItemDraft: ""
    property string commissioningHardwareProfileDraft: ""
    property string operatorSurfaceTarget: engineController && engineController.appSnapshotLoaded
                                           ? engineController.startupTargetSurface
                                           : "locked"

    width: 1280
    height: 800
    visible: !shellSmokeTest
    title: operatorSurfaceTarget === "dashboard"
           ? "SSE ExEd Studio Control Native - Dashboard"
           : operatorSurfaceTarget === "commissioning"
             ? "SSE ExEd Studio Control Native - Commissioning"
             : "SSE ExEd Studio Control Native"
    color: "#0f1724"

    function workspaceLabel(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return "Planning"
        case "lighting":
            return "Lighting"
        case "audio":
            return "Audio"
        case "setup":
            return "Setup"
        default:
            return "Planning"
        }
    }

    function workspaceSummary(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return engineController && engineController.planningSnapshotLoaded
                   ? engineController.planningDetails
                   : "Planning snapshot is loading from the engine."
        case "lighting":
            return "Fixture state, scenes, groups, DMX monitoring, and spatial editor workflows will render from the lighting engine module."
        case "audio":
            return "Channel control, metering, mix targets, snapshots, and console sync will render from the audio engine module."
        case "setup":
            return "Commissioning and support tools remain reachable from the dashboard even after first-launch setup is complete."
        default:
            return "Dashboard content will be driven by engine-owned state."
        }
    }

    function commissioningSummary(stage) {
        switch (stage) {
        case "setup-required":
            return "This workstation has not completed commissioning, so the shell keeps the operator on setup instead of opening the dashboard."
        case "in-progress":
            return "Commissioning is in progress. The shell remains in setup until the engine marks the workstation ready."
        case "ready":
            return "Commissioning reports ready. Future launches should route directly to the dashboard surface."
        default:
            return "Commissioning state is engine-owned and controls startup routing."
        }
    }

    function dashboardModuleSummary(workspaceMode) {
        switch (workspaceMode) {
        case "planning":
            return "Primary model: projects, tasks, activity, reports"
        case "lighting":
            return "Primary model: fixtures, groups, scenes, DMX state"
        case "audio":
            return "Primary model: channels, metering, snapshots, sync"
        case "setup":
            return "Primary model: commissioning status and support tools"
        default:
            return "Primary model: engine snapshot pending"
        }
    }

    function formatEnumLabel(value) {
        if (!value || value.length === 0) {
            return "Unknown"
        }

        const spaced = value.replace(/-/g, " ")
        return spaced.charAt(0).toUpperCase() + spaced.slice(1)
    }

    function formatSeconds(totalSeconds) {
        if (!totalSeconds || totalSeconds <= 0) {
            return "0m"
        }

        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)

        if (hours > 0 && minutes > 0) {
            return hours + "h " + minutes + "m"
        }

        if (hours > 0) {
            return hours + "h"
        }

        return minutes + "m"
    }

    function checklistProgress(checklist) {
        if (!checklist || checklist.length === 0) {
            return "No checklist"
        }

        let completedCount = 0
        for (let index = 0; index < checklist.length; index += 1) {
            if (checklist[index].done) {
                completedCount += 1
            }
        }

        return completedCount + "/" + checklist.length + " checklist complete"
    }

    function formatTimestamp(timestamp) {
        if (!timestamp || timestamp.length === 0) {
            return "Unknown time"
        }

        return timestamp.slice(0, 16).replace("T", " ")
    }

    function formatDueDate(dueDate) {
        if (!dueDate || dueDate.length === 0) {
            return ""
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(dueDate + "T00:00:00")
        const diffMs = due.getTime() - today.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return "Overdue " + dueDate
        }
        if (diffDays === 0) {
            return "Due today"
        }
        if (diffDays <= 3) {
            return "Due " + dueDate
        }

        return dueDate
    }

    function projectTitle(projectId) {
        if (!engineController) {
            return projectId
        }

        const project = root.projectById(projectId)
        if (project) {
            return project.title
        }

        return projectId
    }

    function taskTitle(taskId) {
        if (!engineController) {
            return taskId
        }

        const task = root.taskById(taskId)
        if (task) {
            return task.title
        }

        return taskId
    }

    function projectById(projectId) {
        if (!engineController || !projectId || projectId.length === 0) {
            return null
        }

        for (let index = 0; index < engineController.planningProjects.length; index += 1) {
            const project = engineController.planningProjects[index]
            if (project.id === projectId) {
                return project
            }
        }

        return null
    }

    function taskById(taskId) {
        if (!engineController || !taskId || taskId.length === 0) {
            return null
        }

        for (let index = 0; index < engineController.planningTasks.length; index += 1) {
            const task = engineController.planningTasks[index]
            if (task.id === taskId) {
                return task
            }
        }

        return null
    }

    function labelsToCsv(labels) {
        if (!labels || labels.length === 0) {
            return ""
        }

        return labels.join(", ")
    }

    function tasksForProject(projectId) {
        const items = []
        if (!engineController || !projectId || projectId.length === 0) {
            return items
        }

        for (let index = 0; index < engineController.planningTasks.length; index += 1) {
            const task = engineController.planningTasks[index]
            if (task.projectId === projectId) {
                items.push(task)
            }
        }

        return items
    }

    function activityForProject(projectId) {
        const items = []
        if (!engineController || !projectId || projectId.length === 0) {
            return items
        }

        const taskIds = {}
        const tasks = root.tasksForProject(projectId)
        for (let index = 0; index < tasks.length; index += 1) {
            taskIds[tasks[index].id] = true
        }

        for (let index = 0; index < engineController.planningActivityLog.length; index += 1) {
            const entry = engineController.planningActivityLog[index]
            if (entry.entityId === projectId || taskIds[entry.entityId]) {
                items.push(entry)
            }
        }

        return items
    }

    function completedTaskCountForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let count = 0
        for (let index = 0; index < tasks.length; index += 1) {
            if (tasks[index].completed) {
                count += 1
            }
        }

        return count
    }

    function totalSecondsForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let total = 0
        for (let index = 0; index < tasks.length; index += 1) {
            total += tasks[index].totalSeconds
        }

        return total
    }

    function checklistTotalsForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        let done = 0
        let total = 0
        for (let index = 0; index < tasks.length; index += 1) {
            const checklist = tasks[index].checklist || []
            total += checklist.length
            for (let itemIndex = 0; itemIndex < checklist.length; itemIndex += 1) {
                if (checklist[itemIndex].done) {
                    done += 1
                }
            }
        }

        return { done: done, total: total }
    }

    function progressForProject(projectId) {
        const tasks = root.tasksForProject(projectId)
        if (tasks.length === 0) {
            return 0
        }

        return root.completedTaskCountForProject(projectId) / tasks.length
    }

    function syncPlanningDrafts() {
        const selectedProject = root.projectById(engineController ? engineController.planningSelectedProjectId : "")
        const selectedTask = root.taskById(engineController ? engineController.planningSelectedTaskId : "")
        root.selectedProjectTitleDraft = selectedProject ? selectedProject.title : ""
        root.selectedProjectDescriptionDraft = selectedProject ? selectedProject.description : ""
        root.selectedProjectPriorityDraft = selectedProject ? selectedProject.priority : "p2"
        root.selectedTaskTitleDraft = selectedTask ? selectedTask.title : ""
        root.selectedTaskDescriptionDraft = selectedTask ? selectedTask.description : ""
        root.selectedTaskPriorityDraft = selectedTask ? selectedTask.priority : "p2"
        root.selectedTaskDueDateDraft = selectedTask && selectedTask.dueDate ? selectedTask.dueDate : ""
        root.selectedTaskLabelsDraft = selectedTask ? root.labelsToCsv(selectedTask.labels) : ""
        root.selectedChecklistItemDraft = ""
    }

    function isSelectedProject(projectId) {
        return engineController && engineController.planningSelectedProjectId === projectId
    }

    function isSelectedTask(taskId) {
        return engineController && engineController.planningSelectedTaskId === taskId
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

    function activitySummary(entry) {
        if (!entry) {
            return ""
        }

        const action = root.formatEnumLabel(entry.action)
        const entityType = root.formatEnumLabel(entry.entityType)
        return action + " " + entityType
    }

    function scheduleWindowStateSync() {
        if (shellSmokeTest || !engineController || !windowSettingsApplied || suppressWindowStateSync) {
            return
        }

        if (!engineController.operatorUiReady) {
            return
        }

        windowStateSyncTimer.restart()
    }

    onWidthChanged: scheduleWindowStateSync()
    onHeightChanged: scheduleWindowStateSync()
    onVisibilityChanged: scheduleWindowStateSync()

    Timer {
        id: windowStateSyncTimer
        interval: 350
        repeat: false
        onTriggered: {
            if (!engineController || !engineController.operatorUiReady) {
                return
            }

            engineController.syncWindowState(
                Math.round(root.width),
                Math.round(root.height),
                root.visibility === Window.Maximized
            )
        }
    }

    Component {
        id: commissioningSurfaceComponent

        Item {
            ColumnLayout {
                anchors.fill: parent
                spacing: 12

                Label {
                    text: "Commissioning Surface"
                    color: "#ffffff"
                    font.pixelSize: 22
                    font.weight: Font.DemiBold
                }

                Label {
                    text: root.commissioningSummary(engineController.commissioningStage)
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1100 ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 164

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Commissioning Gate"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: engineController.commissioningStage
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Dashboard remains blocked until the engine marks setup complete."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: ["setup-required", "in-progress", "ready"]

                                    Button {
                                        required property string modelData
                                        text: modelData === "ready" ? "Mark Ready" : root.formatEnumLabel(modelData)
                                        highlighted: engineController.commissioningStage === modelData
                                        onClicked: engineController.updateCommissioningStage(modelData)
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 164

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Hardware Profile"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: engineController.hardwareProfile
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Adapter configuration and commissioning checks will attach to this engine-owned profile."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    Layout.fillWidth: true
                                    text: root.commissioningHardwareProfileDraft
                                    placeholderText: "Hardware profile id"
                                    onTextChanged: root.commissioningHardwareProfileDraft = text
                                }

                                Button {
                                    text: "Save"
                                    enabled: root.commissioningHardwareProfileDraft.trim().length > 0
                                    onClicked: engineController.updateHardwareProfile(root.commissioningHardwareProfileDraft)
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 170

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Commissioning Workstreams"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: "1. Verify hardware and connection health\n2. Configure control-surface mappings\n3. Seed local planning data\n4. Mark commissioning complete in the engine"
                                color: "#d6dce5"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }
                    }

                    Rectangle {
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 128

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Persisted Dashboard Landing"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "When commissioning completes, the shell will route to the dashboard and restore this workspace first."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: ["planning", "lighting", "audio", "setup"]

                                    Button {
                                        required property string modelData
                                        text: root.workspaceLabel(modelData)
                                        highlighted: engineController.workspaceMode === modelData
                                        onClicked: engineController.setWorkspaceMode(modelData)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Component {
        id: dashboardSurfaceComponent

        Item {
            ColumnLayout {
                anchors.fill: parent
                spacing: 12

                Label {
                    text: "Dashboard Surface"
                    color: "#ffffff"
                    font.pixelSize: 22
                    font.weight: Font.DemiBold
                }

                Label {
                    text: engineController.workspaceMode === "planning"
                          ? (engineController.planningSnapshotLoaded
                             ? "The dashboard is rendering native planning state directly from the Rust engine."
                             : "The dashboard is waiting for the native planning snapshot from the Rust engine.")
                          : "The engine marked commissioning complete, so the shell routes directly into the dashboard surface while other workspaces remain in scaffold mode."
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: ["planning", "lighting", "audio", "setup"]

                        Rectangle {
                            required property string modelData
                            radius: 999
                            color: engineController.workspaceMode === modelData ? "#143152" : "#0c1320"
                            border.color: engineController.workspaceMode === modelData ? "#4da0ff" : "#35506b"
                            border.width: 1
                            implicitHeight: 34
                            implicitWidth: label.implicitWidth + 24

                            TapHandler {
                                onTapped: engineController.setWorkspaceMode(parent.modelData)
                            }

                            Label {
                                id: label
                                anchors.centerIn: parent
                                text: root.workspaceLabel(modelData)
                                color: engineController.workspaceMode === modelData ? "#e8f2ff" : "#9bb0c9"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                            }
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: 14
                    color: "#0c1320"
                    border.color: "#35506b"
                    border.width: 1

                    ScrollView {
                        anchors.fill: parent
                        anchors.margins: 14
                        clip: true
                        contentWidth: availableWidth

                        ColumnLayout {
                            width: parent.width
                            spacing: 10

                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode) + " Workspace"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: root.workspaceSummary(engineController.workspaceMode)
                                color: "#d6dce5"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1180 ? 4 : root.width >= 900 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 88

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 4

                                        Label { text: "Projects"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.planningProjectCount
                                            color: "#f5f7fb"
                                            font.pixelSize: 22
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 88

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 4

                                        Label { text: "Tasks"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.planningTaskCount
                                            color: "#f5f7fb"
                                            font.pixelSize: 22
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 88

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 4

                                        Label { text: "Running"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.planningRunningTaskCount
                                            color: "#f5f7fb"
                                            font.pixelSize: 22
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 88

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 4

                                        Label { text: "Completed"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.planningCompletedTaskCount
                                            color: "#f5f7fb"
                                            font.pixelSize: 22
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1320 ? 4 : root.width >= 980 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 142

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Quick Actions"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Create native projects and tasks directly against the Rust engine contract."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                id: newProjectTitleField
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
                                                text: "Add Project"
                                                enabled: newProjectTitleField.text.trim().length > 0
                                                onClicked: {
                                                    const title = newProjectTitleField.text.trim()
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
                                                Layout.fillWidth: true
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                placeholderText: engineController.planningSelectedProjectId.length > 0
                                                                 ? "New task for " + root.projectTitle(engineController.planningSelectedProjectId)
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
                                                text: "Add Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && newTaskTitleField.text.trim().length > 0
                                                onClicked: {
                                                    const title = newTaskTitleField.text.trim()
                                                    engineController.createPlanningTask(engineController.planningSelectedProjectId, title)
                                                    newTaskTitleField.text = ""
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 142

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selection"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Project " + (engineController.planningSelectedProjectId.length > 0
                                                                ? root.projectTitle(engineController.planningSelectedProjectId)
                                                                : "None")
                                                  + "\nTask "
                                                  + (engineController.planningSelectedTaskId.length > 0
                                                     ? root.taskTitle(engineController.planningSelectedTaskId)
                                                     : "None")
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Prev Project"
                                                enabled: engineController.planningProjectCount > 0
                                                onClicked: engineController.cyclePlanningProject("prev")
                                            }

                                            Button {
                                                text: "Next Project"
                                                enabled: engineController.planningProjectCount > 0
                                                onClicked: engineController.cyclePlanningProject("next")
                                            }

                                            Button {
                                                text: "Prev Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && engineController.planningTaskCount > 0
                                                onClicked: engineController.cyclePlanningTask("prev")
                                            }

                                            Button {
                                                text: "Next Task"
                                                enabled: engineController.planningSelectedProjectId.length > 0
                                                         && engineController.planningTaskCount > 0
                                                onClicked: engineController.cyclePlanningTask("next")
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    id: projectControls
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 338

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Project Controls"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectControls.selectedProject
                                                  ? root.formatEnumLabel(projectControls.selectedProject.status) + " | " + projectControls.selectedProject.priority.toUpperCase()
                                                  : "Select a project to edit its details, move it, or change status."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        TextField {
                                            Layout.fillWidth: true
                                            enabled: !!projectControls.selectedProject
                                            text: root.selectedProjectTitleDraft
                                            placeholderText: "Selected project title"
                                            onTextChanged: root.selectedProjectTitleDraft = text
                                            onAccepted: {
                                                if (!projectControls.selectedProject || text.trim().length === 0) {
                                                    return
                                                }

                                                engineController.updatePlanningProject(
                                                            projectControls.selectedProject.id,
                                                            root.selectedProjectTitleDraft.trim(),
                                                            root.selectedProjectDescriptionDraft,
                                                            root.selectedProjectPriorityDraft)
                                            }
                                        }

                                        TextArea {
                                            Layout.fillWidth: true
                                            Layout.preferredHeight: 72
                                            enabled: !!projectControls.selectedProject
                                            text: root.selectedProjectDescriptionDraft
                                            placeholderText: "Project description"
                                            wrapMode: TextEdit.Wrap
                                            onTextChanged: root.selectedProjectDescriptionDraft = text
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Priority"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["p0", "p1", "p2", "p3"]

                                                Button {
                                                    required property string modelData
                                                    text: modelData.toUpperCase()
                                                    enabled: !!projectControls.selectedProject
                                                    highlighted: root.selectedProjectPriorityDraft === modelData
                                                    onClicked: root.selectedProjectPriorityDraft = modelData
                                                }
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Save"
                                                enabled: !!projectControls.selectedProject
                                                         && root.selectedProjectTitleDraft.trim().length > 0
                                                         && (root.selectedProjectTitleDraft.trim() !== projectControls.selectedProject.title
                                                             || root.selectedProjectDescriptionDraft !== projectControls.selectedProject.description
                                                             || root.selectedProjectPriorityDraft !== projectControls.selectedProject.priority)
                                                onClicked: engineController.updatePlanningProject(
                                                               projectControls.selectedProject.id,
                                                               root.selectedProjectTitleDraft.trim(),
                                                               root.selectedProjectDescriptionDraft,
                                                               root.selectedProjectPriorityDraft)
                                            }

                                            Button {
                                                text: "Delete"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.deletePlanningProject(projectControls.selectedProject.id)
                                            }

                                            Button {
                                                text: "Move Up"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.movePlanningProject(projectControls.selectedProject.id, "prev")
                                            }

                                            Button {
                                                text: "Move Down"
                                                enabled: !!projectControls.selectedProject
                                                onClicked: engineController.movePlanningProject(projectControls.selectedProject.id, "next")
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Status"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["todo", "in-progress", "blocked", "done"]

                                                Button {
                                                    required property string modelData
                                                    text: root.formatEnumLabel(modelData)
                                                    enabled: !!projectControls.selectedProject
                                                             && projectControls.selectedProject.status !== modelData
                                                    onClicked: engineController.setPlanningProjectStatus(
                                                                   projectControls.selectedProject.id,
                                                                   modelData)
                                                }
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    id: taskControls
                                    property var selectedTask: root.taskById(engineController.planningSelectedTaskId)
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 474

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Task Controls"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: taskControls.selectedTask
                                                  ? root.projectTitle(taskControls.selectedTask.projectId) + " | " + root.taskStateLabel(taskControls.selectedTask)
                                                  : "Select a task to edit details, checklist items, time, or ordering."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        TextField {
                                            Layout.fillWidth: true
                                            enabled: !!taskControls.selectedTask
                                            text: root.selectedTaskTitleDraft
                                            placeholderText: "Selected task title"
                                            onTextChanged: root.selectedTaskTitleDraft = text
                                            onAccepted: {
                                                if (!taskControls.selectedTask || text.trim().length === 0) {
                                                    return
                                                }

                                                engineController.updatePlanningTask(
                                                            taskControls.selectedTask.id,
                                                            root.selectedTaskTitleDraft.trim(),
                                                            root.selectedTaskDescriptionDraft,
                                                            root.selectedTaskPriorityDraft,
                                                            root.selectedTaskDueDateDraft,
                                                            root.selectedTaskLabelsDraft)
                                            }
                                        }

                                        TextArea {
                                            Layout.fillWidth: true
                                            Layout.preferredHeight: 72
                                            enabled: !!taskControls.selectedTask
                                            text: root.selectedTaskDescriptionDraft
                                            placeholderText: "Task description"
                                            wrapMode: TextEdit.Wrap
                                            onTextChanged: root.selectedTaskDescriptionDraft = text
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Label { text: "Priority"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Repeater {
                                                model: ["p0", "p1", "p2", "p3"]

                                                Button {
                                                    required property string modelData
                                                    text: modelData.toUpperCase()
                                                    enabled: !!taskControls.selectedTask
                                                    highlighted: root.selectedTaskPriorityDraft === modelData
                                                    onClicked: root.selectedTaskPriorityDraft = modelData
                                                }
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            TextField {
                                                Layout.fillWidth: true
                                                enabled: !!taskControls.selectedTask
                                                text: root.selectedTaskDueDateDraft
                                                placeholderText: "Due date YYYY-MM-DD"
                                                onTextChanged: root.selectedTaskDueDateDraft = text
                                            }

                                            TextField {
                                                Layout.fillWidth: true
                                                enabled: !!taskControls.selectedTask
                                                text: root.selectedTaskLabelsDraft
                                                placeholderText: "Labels: frontend, urgent"
                                                onTextChanged: root.selectedTaskLabelsDraft = text
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Save"
                                                enabled: !!taskControls.selectedTask
                                                         && root.selectedTaskTitleDraft.trim().length > 0
                                                         && (root.selectedTaskTitleDraft.trim() !== taskControls.selectedTask.title
                                                             || root.selectedTaskDescriptionDraft !== taskControls.selectedTask.description
                                                             || root.selectedTaskPriorityDraft !== taskControls.selectedTask.priority
                                                             || root.selectedTaskDueDateDraft !== (taskControls.selectedTask.dueDate ? taskControls.selectedTask.dueDate : "")
                                                             || root.selectedTaskLabelsDraft !== root.labelsToCsv(taskControls.selectedTask.labels))
                                                onClicked: engineController.updatePlanningTask(
                                                               taskControls.selectedTask.id,
                                                               root.selectedTaskTitleDraft.trim(),
                                                               root.selectedTaskDescriptionDraft,
                                                               root.selectedTaskPriorityDraft,
                                                               root.selectedTaskDueDateDraft,
                                                               root.selectedTaskLabelsDraft)
                                            }

                                            Button {
                                                text: "Delete"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.deletePlanningTask(taskControls.selectedTask.id)
                                            }

                                            Button {
                                                text: "Move Up"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.movePlanningTask(taskControls.selectedTask.id, "prev")
                                            }

                                            Button {
                                                text: "Move Down"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.movePlanningTask(taskControls.selectedTask.id, "next")
                                            }
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Toggle Timer"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.togglePlanningTaskTimer(taskControls.selectedTask.id)
                                            }

                                            Button {
                                                text: "Toggle Complete"
                                                enabled: !!taskControls.selectedTask
                                                onClicked: engineController.togglePlanningTaskComplete(taskControls.selectedTask.id)
                                            }

                                            Label {
                                                text: taskControls.selectedTask
                                                      ? root.checklistProgress(taskControls.selectedTask.checklist) + " | " + root.formatSeconds(taskControls.selectedTask.totalSeconds)
                                                      : ""
                                                color: "#b4c0cf"
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }
                                        }

                                        Label {
                                            visible: !!taskControls.selectedTask
                                            text: "Checklist"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }

                                        ColumnLayout {
                                            Layout.fillWidth: true
                                            visible: !!taskControls.selectedTask
                                            spacing: 6

                                            Repeater {
                                                model: taskControls.selectedTask ? taskControls.selectedTask.checklist : []

                                                RowLayout {
                                                    required property var modelData
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        text: modelData.done ? "Done" : "Open"
                                                        highlighted: modelData.done
                                                        onClicked: engineController.setPlanningChecklistItemDone(
                                                                       taskControls.selectedTask.id,
                                                                       modelData.id,
                                                                       !modelData.done)
                                                    }

                                                    Label {
                                                        text: modelData.text
                                                        color: modelData.done ? "#8ea4c0" : "#f5f7fb"
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Button {
                                                        text: "Remove"
                                                        onClicked: engineController.deletePlanningChecklistItem(
                                                                       taskControls.selectedTask.id,
                                                                       modelData.id)
                                                    }
                                                }
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                TextField {
                                                    Layout.fillWidth: true
                                                    enabled: !!taskControls.selectedTask
                                                    text: root.selectedChecklistItemDraft
                                                    placeholderText: "+ Add checklist item"
                                                    onTextChanged: root.selectedChecklistItemDraft = text
                                                    onAccepted: {
                                                        if (!taskControls.selectedTask || text.trim().length === 0) {
                                                            return
                                                        }

                                                        engineController.addPlanningChecklistItem(
                                                                    taskControls.selectedTask.id,
                                                                    text.trim())
                                                    }
                                                }

                                                Button {
                                                    text: "Add"
                                                    enabled: !!taskControls.selectedTask
                                                             && root.selectedChecklistItemDraft.trim().length > 0
                                                    onClicked: engineController.addPlanningChecklistItem(
                                                                   taskControls.selectedTask.id,
                                                                   root.selectedChecklistItemDraft.trim())
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1180 ? 2 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    id: projectOverview
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    property var selectedProjectTasks: projectOverview.selectedProject ? root.tasksForProject(projectOverview.selectedProject.id) : []
                                    property var checklistTotals: projectOverview.selectedProject ? root.checklistTotalsForProject(projectOverview.selectedProject.id) : ({ done: 0, total: 0 })
                                    property int completedTaskCount: projectOverview.selectedProject ? root.completedTaskCountForProject(projectOverview.selectedProject.id) : 0
                                    property int totalProjectSeconds: projectOverview.selectedProject ? root.totalSecondsForProject(projectOverview.selectedProject.id) : 0
                                    property real progressValue: projectOverview.selectedProject ? root.progressForProject(projectOverview.selectedProject.id) : 0
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 344

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selected Project Overview"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectOverview.selectedProject
                                                  ? projectOverview.selectedProject.title + " | " + root.formatEnumLabel(projectOverview.selectedProject.status) + " | " + projectOverview.selectedProject.priority.toUpperCase()
                                                  : "Select a project to inspect its task list, progress, and detail context."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProject.description.length > 0
                                            text: projectOverview.selectedProject ? projectOverview.selectedProject.description : ""
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8
                                            visible: !!projectOverview.selectedProject

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: tasksBadge.implicitWidth + 18

                                                Label {
                                                    id: tasksBadge
                                                    anchors.centerIn: parent
                                                    text: projectOverview.completedTaskCount + "/" + projectOverview.selectedProjectTasks.length + " tasks"
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: timeBadge.implicitWidth + 18

                                                Label {
                                                    id: timeBadge
                                                    anchors.centerIn: parent
                                                    text: "Time " + root.formatSeconds(projectOverview.totalProjectSeconds)
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }

                                            Rectangle {
                                                radius: 999
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                implicitHeight: 28
                                                implicitWidth: checklistBadge.implicitWidth + 18

                                                Label {
                                                    id: checklistBadge
                                                    anchors.centerIn: parent
                                                    text: projectOverview.checklistTotals.total > 0
                                                          ? projectOverview.checklistTotals.done + "/" + projectOverview.checklistTotals.total + " checklist"
                                                          : "No checklist"
                                                    color: "#d6dce5"
                                                    font.pixelSize: 11
                                                }
                                            }
                                        }

                                        Rectangle {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length > 0
                                            Layout.fillWidth: true
                                            implicitHeight: 8
                                            radius: 999
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1

                                            Rectangle {
                                                width: parent.width * projectOverview.progressValue
                                                height: parent.height
                                                radius: 999
                                                color: "#2ba36a"
                                            }
                                        }

                                        Label {
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length === 0
                                            text: "No tasks exist for the selected project yet."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true
                                            visible: !!projectOverview.selectedProject && projectOverview.selectedProjectTasks.length > 0

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 6

                                                Repeater {
                                                    model: projectOverview.selectedProjectTasks

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: root.isSelectedTask(modelData.id) ? "#143152" : "#0c1320"
                                                        border.color: root.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 86

                                                        TapHandler {
                                                            onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                                        }

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 4

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
                                                                text: root.taskStateLabel(modelData)
                                                                      + " | " + modelData.priority.toUpperCase()
                                                                      + (modelData.dueDate ? " | " + root.formatDueDate(modelData.dueDate) : "")
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                text: root.checklistProgress(modelData.checklist) + " | " + root.formatSeconds(modelData.totalSeconds)
                                                                color: "#b4c0cf"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Label {
                                                                visible: modelData.labels && modelData.labels.length > 0
                                                                text: root.labelsToCsv(modelData.labels)
                                                                color: "#9bb0c9"
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

                                Rectangle {
                                    id: projectActivity
                                    property var selectedProject: root.projectById(engineController.planningSelectedProjectId)
                                    property var activityItems: projectActivity.selectedProject ? root.activityForProject(projectActivity.selectedProject.id) : []
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 344

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Selected Project Activity"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: projectActivity.selectedProject
                                                  ? "Recent project and task events scoped to " + projectActivity.selectedProject.title + "."
                                                  : "Select a project to review its recent activity trail."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: !!projectActivity.selectedProject && projectActivity.activityItems.length === 0
                                            text: "No matching activity entries found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true
                                            visible: !!projectActivity.selectedProject && projectActivity.activityItems.length > 0

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 6

                                                Repeater {
                                                    model: projectActivity.activityItems.slice(0, 8)

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: "#0c1320"
                                                        border.color: "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 74

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 4

                                                            Label {
                                                                text: root.activitySummary(modelData)
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
                                                                text: root.formatTimestamp(modelData.timestamp)
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

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "planning"
                                columns: root.width >= 1180 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Projects"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Imported project order and status from native storage."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningProjectCount === 0
                                            text: "No imported projects found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.planningProjects.length, 4)

                                            Rectangle {
                                                property var project: engineController.planningProjects[index]
                                                radius: 10
                                                color: root.isSelectedProject(project.id) ? "#143152" : "#0c1320"
                                                border.color: root.isSelectedProject(project.id) ? "#4da0ff" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 66

                                                TapHandler {
                                                    onTapped: engineController.selectPlanningProject(parent.project.id)
                                                }

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: project.title
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatEnumLabel(project.status) + " | " + project.priority.toUpperCase()
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

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Tasks"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Task timers, checklist progress, and project ownership now come from the engine snapshot."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningTaskCount === 0
                                            text: "No imported tasks found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.planningTasks.length, 4)

                                            Rectangle {
                                                property var task: engineController.planningTasks[index]
                                                radius: 10
                                                color: root.isSelectedTask(task.id) ? "#143152" : "#0c1320"
                                                border.color: root.isSelectedTask(task.id) ? "#4da0ff" : "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 76

                                                TapHandler {
                                                    onTapped: engineController.selectPlanningTask(parent.task.id)
                                                }

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: task.title
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.projectTitle(task.projectId) + " | " + root.taskStateLabel(task)
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.checklistProgress(task.checklist) + " | " + root.formatSeconds(task.totalSeconds)
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

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 220

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Recent Activity"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Latest engine-owned task and project events."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: engineController.planningActivityLog.length === 0
                                            text: "No recent activity entries found yet."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.planningActivityLog.length, 5)

                                            Rectangle {
                                                property var entry: engineController.planningActivityLog[index]
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 74

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 4

                                                    Label {
                                                        text: root.activitySummary(entry)
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 13
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: entry.detail
                                                        color: "#b4c0cf"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatTimestamp(entry.timestamp)
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

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode !== "planning"
                                columns: root.width >= 1100 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label { text: "Module Ownership"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: root.dashboardModuleSummary(engineController.workspaceMode)
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label { text: "Runtime Health"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: "Health " + engineController.healthStatus + "\n" + engineController.storageDetails
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 110

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 6

                                        Label { text: "Planning Snapshot"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.planningSnapshotLoaded
                                                  ? engineController.planningDetails
                                                  : "Planning snapshot is still synchronizing."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                visible: engineController.workspaceMode === "planning"
                                radius: 12
                                color: "#101826"
                                border.color: "#2a3b55"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 88

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 4

                                    Label { text: "View State"; color: "#8ea4c0"; font.pixelSize: 12 }
                                    Label {
                                        text: "Filter " + root.formatEnumLabel(engineController.planningViewFilter) + " | Sort " + root.formatEnumLabel(engineController.planningSortBy) + "\nWorkspace " + root.workspaceLabel(engineController.workspaceMode)
                                        color: "#f5f7fb"
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

    Connections {
        target: engineController

        function onPlanningSnapshotChanged() {
            root.syncPlanningDrafts()
        }

        function onAppSnapshotChanged() {
            if (!engineController || !engineController.appSnapshotLoaded) {
                return
            }

            root.commissioningHardwareProfileDraft = engineController.hardwareProfile
        }

        function onSettingsChanged() {
            if (!engineController || shellSmokeTest || windowSettingsApplied || !engineController.windowSettingsLoaded) {
                return
            }

            suppressWindowStateSync = true
            root.width = engineController.windowWidth
            root.height = engineController.windowHeight
            root.visibility = engineController.windowMaximized ? Window.Maximized : Window.Windowed
            windowSettingsApplied = true
            Qt.callLater(function() {
                suppressWindowStateSync = false
            })
        }
    }

    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#15253c" }
            GradientStop { position: 1.0; color: "#0b1018" }
        }
    }

    ColumnLayout {
        anchors.top: parent.top
        anchors.topMargin: 28
        anchors.horizontalCenter: parent.horizontalCenter
        width: Math.min(root.width - 48, 960)
        spacing: 18

        Label {
            text: "Native Runtime Shell"
            color: "#f5f7fb"
            font.pixelSize: 32
            font.weight: Font.DemiBold
            Layout.alignment: Qt.AlignHCenter
        }

        Label {
            text: "Qt/QML shell supervising a Rust engine process over local IPC. The operator surface is selected from engine-owned startup state."
            color: "#b4c0cf"
            wrapMode: Text.WordWrap
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
        }

        Rectangle {
            Layout.fillWidth: true
            radius: 18
            color: "#101826"
            border.color: "#2a3b55"
            border.width: 1
            implicitHeight: 170

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 12

                Label {
                    text: "Engine State"
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: engineController.stateLabel
                    color: "#ffffff"
                    font.pixelSize: 24
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Startup: " + engineController.startupPhaseLabel
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: "Health: " + engineController.healthStatus
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: engineController.message
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            radius: 18
            color: "#111823"
            border.color: engineController.stateLabel === "Failed" ? "#b4534b" : "#2a3b55"
            border.width: 1
            implicitHeight: 420

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 10

                Label {
                    text: "Recovery"
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: engineController.stateLabel === "Failed"
                          ? "Startup failed or the engine exited unexpectedly."
                          : "If startup fails, this panel becomes the recovery surface for retry and diagnostics."
                    color: "#e6ebf2"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Diagnostics path: " + engineController.diagnosticsPath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
                }

                Label {
                    text: "App data path: " + engineController.appDataPath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
                }

                Label {
                    text: "Logs path: " + engineController.logsPath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
                }

                Label {
                    text: "Engine log: " + engineController.engineLogPath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
                }

                Label {
                    text: "Database path: " + engineController.databasePath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
                }

                Label {
                    text: "Engine version: " + engineController.engineVersion + " | Protocol: " + engineController.protocolVersion
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    visible: engineController.lastError.length > 0
                    text: "Last error: " + engineController.lastError
                    color: "#f0b3aa"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Storage: " + engineController.storageDetails
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Settings: " + engineController.settingsDetails
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Recent engine log excerpt"
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 120
                    radius: 10
                    color: "#0c1320"
                    border.color: "#2a3b55"
                    border.width: 1

                    ScrollView {
                        anchors.fill: parent
                        anchors.margins: 8
                        clip: true

                        TextEdit {
                            readOnly: true
                            text: engineController.recentLogExcerpt
                            color: "#d6dce5"
                            wrapMode: TextEdit.Wrap
                            selectByMouse: true
                            textFormat: TextEdit.PlainText
                            width: parent ? parent.width : 0
                        }
                    }
                }

                Button {
                    text: "Retry Startup"
                    enabled: engineController.canRetry
                    onClicked: engineController.retryStart()
                }
            }
        }

        RowLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 10
            visible: !shellSmokeTest

            Button {
                text: "Start Engine"
                onClicked: engineController.start()
            }

            Button {
                text: "Ping"
                onClicked: engineController.ping()
            }

            Button {
                text: "Health"
                onClicked: engineController.requestHealthSnapshot()
            }

            Button {
                text: "Load Settings"
                onClicked: engineController.requestSettings()
            }

            Button {
                text: "Stop Engine"
                onClicked: engineController.stop()
            }
        }

        Rectangle {
            Layout.fillWidth: true
            radius: 18
            color: "#101826"
            border.color: "#2a3b55"
            border.width: 1
            implicitHeight: 360
            visible: engineController.operatorUiReady

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true

                    Label {
                        text: "Operator Surface"
                        color: "#8ea4c0"
                        font.pixelSize: 13
                    }

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        radius: 999
                        color: operatorSurfaceTarget === "dashboard" ? "#163a2c" : "#3a2616"
                        border.color: operatorSurfaceTarget === "dashboard" ? "#2ba36a" : "#d59354"
                        border.width: 1
                        implicitHeight: 28
                        implicitWidth: badgeLabel.implicitWidth + 20

                        Label {
                            id: badgeLabel
                            anchors.centerIn: parent
                            text: operatorSurfaceTarget.toUpperCase()
                            color: operatorSurfaceTarget === "dashboard" ? "#d7ffea" : "#ffe6d3"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }
                    }
                }

                Label {
                    text: engineController.appSnapshotDetails
                    color: "#d6dce5"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    radius: 14
                    color: "#101826"
                    border.color: "#2a3b55"
                    border.width: 1

                    Loader {
                        anchors.fill: parent
                        anchors.margins: 16
                        sourceComponent: operatorSurfaceTarget === "dashboard"
                                         ? dashboardSurfaceComponent
                                         : commissioningSurfaceComponent
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            radius: 18
            color: "#101826"
            border.color: "#2a3b55"
            border.width: 1
            implicitHeight: 170
            visible: engineController.operatorUiReady

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 12

                Label {
                    text: "Restored Shell State"
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: "Persisted workspace: " + root.workspaceLabel(engineController.workspaceMode)
                    color: "#ffffff"
                    font.pixelSize: 18
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Persisted window: " + engineController.windowWidth + " x " + engineController.windowHeight + " (" + (engineController.windowMaximized ? "maximized" : "windowed") + ")"
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                RowLayout {
                    spacing: 8

                    Button {
                        text: "Planning"
                        onClicked: engineController.setWorkspaceMode("planning")
                    }

                    Button {
                        text: "Lighting"
                        onClicked: engineController.setWorkspaceMode("lighting")
                    }

                    Button {
                        text: "Audio"
                        onClicked: engineController.setWorkspaceMode("audio")
                    }

                    Button {
                        text: "Setup"
                        onClicked: engineController.setWorkspaceMode("setup")
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            radius: 18
            color: "#101826"
            border.color: "#2a3b55"
            border.width: 1
            implicitHeight: 120
            visible: !engineController.operatorUiReady

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 18
                spacing: 10

                Label {
                    text: "Operator Surface Locked"
                    color: "#8ea4c0"
                    font.pixelSize: 13
                }

                Label {
                    text: engineController.stateLabel === "Failed"
                          ? "The engine did not reach a healthy startup state. Retry from the recovery panel."
                          : "The operator surface will unlock only after the engine reports healthy startup and an engine-owned application snapshot."
                    color: "#ffffff"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "Current startup phase: " + engineController.startupPhaseLabel
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: "App snapshot: " + engineController.appSnapshotDetails
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }
        }
    }
}
