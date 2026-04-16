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
    property string selectedAudioChannelId: ""
    property string selectedAudioMixTargetId: ""
    property string commissioningHardwareProfileDraft: ""
    property string commissioningLightingBridgeIpDraft: ""
    property int commissioningLightingUniverseDraft: 1
    property string commissioningAudioSendHostDraft: "127.0.0.1"
    property int commissioningAudioSendPortDraft: 7001
    property int commissioningAudioReceivePortDraft: 9001
    property string supportRestorePathDraft: ""
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
            return engineController && engineController.lightingSnapshotLoaded
                   ? engineController.lightingDetails
                   : "Lighting snapshot is loading from the engine."
        case "audio":
            return engineController && engineController.audioSnapshotLoaded
                   ? engineController.audioDetails
                   : "Audio snapshot is loading from the engine."
        case "setup":
            return engineController && engineController.commissioningSnapshotLoaded
                   ? engineController.commissioningDetails
                   : "Commissioning snapshot is loading from the engine."
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

    function commissioningStatusLabel(status) {
        switch (status) {
        case "completed":
            return "Completed"
        case "passed":
            return "Passed"
        case "ready":
            return "Ready"
        case "in-progress":
            return "In Progress"
        case "attention":
            return "Needs Attention"
        case "failed":
            return "Failed"
        case "idle":
            return "Idle"
        default:
            return root.formatEnumLabel(status)
        }
    }

    function commissioningStatusColor(status) {
        switch (status) {
        case "completed":
        case "passed":
            return "#34d399"
        case "ready":
            return "#60a5fa"
        case "in-progress":
            return "#f59e0b"
        case "attention":
        case "failed":
            return "#f87171"
        default:
            return "#9bb0c9"
        }
    }

    function commissioningCheckById(checkId) {
        if (!engineController || !engineController.commissioningSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.commissioningChecks.length; index += 1) {
            const check = engineController.commissioningChecks[index]
            if (check.id === checkId) {
                return check
            }
        }

        return null
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

    function audioMixTargetById(mixTargetId) {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
            const target = engineController.audioMixTargets[index]
            if (target.id === mixTargetId) {
                return target
            }
        }

        return null
    }

    function audioChannelById(channelId) {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        for (let index = 0; index < engineController.audioChannels.length; index += 1) {
            const channel = engineController.audioChannels[index]
            if (channel.id === channelId) {
                return channel
            }
        }

        return null
    }

    function audioChannelSendLevel(channel, mixTargetId) {
        if (!channel) {
            return 0
        }

        const mixLevels = channel.mixLevels || {}
        if (mixTargetId && mixLevels[mixTargetId] !== undefined) {
            return mixLevels[mixTargetId]
        }

        return channel.fader !== undefined ? channel.fader : 0
    }

    function audioLevelLabel(value) {
        if (value <= 0) {
            return "-inf"
        }

        return ((value - 0.75) * 60).toFixed(1) + " dB"
    }

    function audioRoleLabel(role) {
        switch (role) {
        case "front-preamp":
            return "Front Preamp"
        case "rear-line":
            return "Rear Line"
        case "playback-pair":
            return "Playback Pair"
        case "main-out":
            return "Main Out"
        case "phones-a":
            return "Phones 1"
        case "phones-b":
            return "Phones 2"
        default:
            return root.formatEnumLabel(role)
        }
    }

    function audioBusLabel(channel) {
        if (!channel) {
            return "Unknown bus"
        }

        return channel.role === "playback-pair" ? "Playback bus" : "Input bus"
    }

    function audioMixLabel(target) {
        if (!target) {
            return "Main Out"
        }

        switch (target.role) {
        case "main-out":
            return "Main Monitors"
        case "phones-a":
            return "Phones 1"
        case "phones-b":
            return "Phones 2"
        default:
            return target.name
        }
    }

    function activeAudioSnapshot() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            return null
        }

        if (engineController.audioLastRecalledSnapshotId.length > 0) {
            for (let index = 0; index < engineController.audioSnapshots.length; index += 1) {
                const snapshot = engineController.audioSnapshots[index]
                if (snapshot.id === engineController.audioLastRecalledSnapshotId) {
                    return snapshot
                }
            }
        }

        for (let index = 0; index < engineController.audioSnapshots.length; index += 1) {
            const snapshot = engineController.audioSnapshots[index]
            if (snapshot.lastRecalled) {
                return snapshot
            }
        }

        return null
    }

    function selectedAudioSendMatrix() {
        const channel = root.audioChannelById(root.selectedAudioChannelId)
        if (!channel || !engineController || !engineController.audioSnapshotLoaded) {
            return []
        }

        const entries = []
        for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
            const target = engineController.audioMixTargets[index]
            entries.push({
                "target": target,
                "level": root.audioChannelSendLevel(channel, target.id)
            })
        }

        return entries
    }

    function audioMeteringLabel(state) {
        switch (state) {
        case "live":
            return "Meter return verified"
        case "stale":
            return "Meter return stale"
        case "awaiting-peak-data":
            return "Awaiting peak data"
        case "transport-only":
            return "Transport ready"
        case "offline":
            return "OSC offline"
        case "disabled":
            return "OSC disabled"
        default:
            return root.formatEnumLabel(state)
        }
    }

    function audioConsoleStateLabel(confidence, reason) {
        if (confidence === "aligned") {
            return "Console aligned"
        }

        if (reason === "snapshot") {
            return "Snapshot changed hardware"
        }

        if (confidence === "assumed") {
            return "Console state assumed"
        }

        return "Console state pending"
    }

    function audioChannelSupportsGain(channel) {
        return !!channel && channel.role === "front-preamp"
    }

    function audioChannelSupportsPhantom(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsPad(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsInstrument(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsAutoSet(channel) {
        return root.audioChannelSupportsGain(channel)
    }

    function audioChannelSupportsPhase(channel) {
        return !!channel && channel.role !== "playback-pair"
    }

    function syncAudioSelection() {
        if (!engineController || !engineController.audioSnapshotLoaded) {
            root.selectedAudioChannelId = ""
            root.selectedAudioMixTargetId = ""
            return
        }

        if (engineController.audioChannels.length === 0) {
            root.selectedAudioChannelId = ""
        } else if (!root.audioChannelById(root.selectedAudioChannelId)) {
            root.selectedAudioChannelId = engineController.audioChannels[0].id
        }

        if (engineController.audioMixTargets.length === 0) {
            root.selectedAudioMixTargetId = ""
        } else if (!root.audioMixTargetById(root.selectedAudioMixTargetId)) {
            root.selectedAudioMixTargetId = engineController.audioMixTargets[0].id
        }
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

    function formatUnixTimestamp(timestamp) {
        if (!timestamp || timestamp <= 0) {
            return "Unknown time"
        }

        const date = new Date(timestamp * 1000)
        return date.toISOString().slice(0, 16).replace("T", " ")
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes <= 0) {
            return "0 B"
        }

        if (bytes < 1024) {
            return bytes + " B"
        }
        if (bytes < 1024 * 1024) {
            return Math.round(bytes / 1024) + " KB"
        }

        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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
                        Layout.preferredHeight: 220

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label {
                                text: "Commissioning Workstreams"
                                color: "#8ea4c0"
                                font.pixelSize: 12
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: engineController.commissioningSteps

                                    Rectangle {
                                        required property var modelData
                                        radius: 10
                                        color: "#101826"
                                        border.color: "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: 56

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 2

                                            RowLayout {
                                                Layout.fillWidth: true

                                                Label {
                                                    text: modelData.label
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    text: root.commissioningStatusLabel(modelData.status)
                                                    color: root.commissioningStatusColor(modelData.status)
                                                    font.pixelSize: 11
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            Label {
                                                text: modelData.summary
                                                color: "#b4c0cf"
                                                wrapMode: Text.WordWrap
                                                font.pixelSize: 11
                                                Layout.fillWidth: true
                                            }
                                        }
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

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1250 ? 3 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    Rectangle {
                        id: controlSurfaceProbeCard
                        property var probeState: root.commissioningCheckById("control-surface")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Control Surface Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: controlSurfaceProbeCard.probeState ? root.commissioningStatusLabel(controlSurfaceProbeCard.probeState.status) : "Idle"
                                color: controlSurfaceProbeCard.probeState ? root.commissioningStatusColor(controlSurfaceProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: controlSurfaceProbeCard.probeState
                                      ? controlSurfaceProbeCard.probeState.message
                                      : (engineController.controlSurfaceBaseUrl.length > 0
                                         ? "Run a native probe against the deck-facing planning context served at "
                                           + engineController.controlSurfaceBaseUrl + "."
                                         : "Run a native probe against the deck-facing planning context.")
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                            Button {
                                text: "Run Probe"
                                onClicked: engineController.runControlSurfaceProbe()
                            }
                        }
                    }

                    Rectangle {
                        id: lightingProbeCard
                        property var probeState: root.commissioningCheckById("lighting")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Lighting Bridge Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: lightingProbeCard.probeState ? root.commissioningStatusLabel(lightingProbeCard.probeState.status) : "Idle"
                                color: lightingProbeCard.probeState ? root.commissioningStatusColor(lightingProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                TextField {
                                    Layout.fillWidth: true
                                    text: root.commissioningLightingBridgeIpDraft
                                    placeholderText: "Bridge IP"
                                    onTextChanged: root.commissioningLightingBridgeIpDraft = text
                                }

                                SpinBox {
                                    from: 1
                                    to: 63999
                                    value: root.commissioningLightingUniverseDraft
                                    editable: true
                                    onValueModified: root.commissioningLightingUniverseDraft = value
                                }
                            }

                            Label {
                                text: lightingProbeCard.probeState ? lightingProbeCard.probeState.message : "Validate the configured Apollo Bridge address before DMX adapter work lands."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Button {
                                text: "Run Lighting Probe"
                                enabled: root.commissioningLightingBridgeIpDraft.trim().length > 0
                                onClicked: engineController.runLightingProbe(
                                               root.commissioningLightingBridgeIpDraft,
                                               root.commissioningLightingUniverseDraft
                                           )
                            }
                        }
                    }

                    Rectangle {
                        id: audioProbeCard
                        property var probeState: root.commissioningCheckById("audio")
                        radius: 14
                        color: "#0c1320"
                        border.color: "#35506b"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.preferredHeight: 176

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 6

                            Label { text: "Audio OSC Probe"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: audioProbeCard.probeState ? root.commissioningStatusLabel(audioProbeCard.probeState.status) : "Idle"
                                color: audioProbeCard.probeState ? root.commissioningStatusColor(audioProbeCard.probeState.status) : "#9bb0c9"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            TextField {
                                Layout.fillWidth: true
                                text: root.commissioningAudioSendHostDraft
                                placeholderText: "OSC send host"
                                onTextChanged: root.commissioningAudioSendHostDraft = text
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                SpinBox {
                                    from: 1
                                    to: 65535
                                    value: root.commissioningAudioSendPortDraft
                                    editable: true
                                    onValueModified: root.commissioningAudioSendPortDraft = value
                                }

                                SpinBox {
                                    from: 1
                                    to: 65535
                                    value: root.commissioningAudioReceivePortDraft
                                    editable: true
                                    onValueModified: root.commissioningAudioReceivePortDraft = value
                                }
                            }

                            Label {
                                text: audioProbeCard.probeState ? audioProbeCard.probeState.message : "Validate OSC transport settings before the native audio adapter owns live console sync."
                                color: "#b4c0cf"
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Button {
                                text: "Run Audio Probe"
                                enabled: root.commissioningAudioSendHostDraft.trim().length > 0
                                onClicked: engineController.runAudioProbe(
                                               root.commissioningAudioSendHostDraft,
                                               root.commissioningAudioSendPortDraft,
                                               root.commissioningAudioReceivePortDraft
                                           )
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
                    implicitHeight: 132

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 6

                        Label { text: "Sample Planning Data"; color: "#8ea4c0"; font.pixelSize: 12 }
                        Label {
                            text: engineController.commissioningPlanningProjectCount > 0
                                  ? engineController.commissioningPlanningProjectCount + " projects and "
                                    + engineController.commissioningPlanningTaskCount
                                    + " tasks are already present in native storage."
                                  : "Load the bundled native planning sample to make the dashboard useful immediately after commissioning."
                            color: "#d6dce5"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                        RowLayout {
                            spacing: 8

                            Button {
                                text: engineController.commissioningPlanningProjectCount > 0 ? "Replace Sample Data" : "Load Sample Data"
                                onClicked: engineController.seedCommissioningSamplePlanning(
                                               engineController.commissioningPlanningProjectCount > 0
                                           )
                            }

                            Label {
                                text: engineController.commissioningDetails
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WordWrap
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
                    implicitHeight: 168

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 6

                        Label { text: "Companion Export"; color: "#8ea4c0"; font.pixelSize: 12 }
                        Label {
                            text: engineController.controlSurfaceAvailable ? "Ready" : "Unavailable"
                            color: engineController.controlSurfaceAvailable ? "#6fd3a4" : "#ff9a7d"
                            font.pixelSize: 18
                            font.weight: Font.DemiBold
                        }
                        Label {
                            text: engineController.controlSurfaceDetails
                            color: "#d6dce5"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                        Label {
                            text: engineController.controlSurfaceBaseUrl.length > 0
                                  ? "Generic HTTP base URL: " + engineController.controlSurfaceBaseUrl
                                  : "No native control-surface bridge URL is available yet."
                            color: "#8ea4c0"
                            font.pixelSize: 11
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
                        }

                        RowLayout {
                            spacing: 8

                            Button {
                                text: "Export Companion Profile"
                                enabled: engineController.controlSurfaceAvailable
                                onClicked: engineController.exportCompanionConfig()
                            }

                            Button {
                                text: "Open App Data"
                                onClicked: engineController.openDiagnosticsDirectory()
                            }
                        }

                        Label {
                            text: engineController.companionExportPath.length > 0
                                  ? "Latest export: " + engineController.companionExportPath
                                  : "No native Companion profile has been exported yet."
                            color: "#8ea4c0"
                            font.pixelSize: 11
                            wrapMode: Text.WrapAnywhere
                            Layout.fillWidth: true
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
                          : engineController.workspaceMode === "setup"
                            ? "The dashboard is rendering engine-owned commissioning state directly from the Rust engine."
                            : "The dashboard is rendering engine-owned readiness state for this workspace while deeper adapter behavior stays behind the engine boundary."
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

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.width >= 1280 ? 5 : root.width >= 980 ? 3 : 1
                    columnSpacing: 10
                    rowSpacing: 10

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

                            Label { text: "Engine"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.formatEnumLabel(engineController.healthStatus)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: "Protocol " + engineController.protocolVersion + " | " + engineController.engineVersion
                                color: "#8ea4c0"
                                font.pixelSize: 11
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Workspace"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.workspaceLabel(engineController.workspaceMode)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: "Target " + root.formatEnumLabel(operatorSurfaceTarget)
                                color: "#8ea4c0"
                                font.pixelSize: 11
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Commissioning"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: root.formatEnumLabel(engineController.commissioningStage)
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.hardwareProfile
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Support"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.supportBackupCount + " backups"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.supportLatestBackupPath.length > 0
                                      ? engineController.supportLatestBackupPath
                                      : "No native backup archive yet"
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WrapAnywhere
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
                        Layout.preferredHeight: 88

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4

                            Label { text: "Current Domain"; color: "#8ea4c0"; font.pixelSize: 12 }
                            Label {
                                text: engineController.workspaceMode === "planning"
                                      ? engineController.planningTaskCount + " tasks"
                                      : engineController.workspaceMode === "lighting"
                                        ? root.formatEnumLabel(engineController.lightingStatus)
                                        : engineController.workspaceMode === "audio"
                                          ? root.formatEnumLabel(engineController.audioStatus)
                                          : engineController.commissioningChecks.length + " probes"
                                color: "#f5f7fb"
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }
                            Label {
                                text: engineController.workspaceMode === "planning"
                                      ? engineController.planningRunningTaskCount + " running | "
                                        + engineController.planningCompletedTaskCount + " completed"
                                      : engineController.workspaceMode === "lighting"
                                        ? engineController.lightingFixtureCount + " fixtures | "
                                          + engineController.lightingSceneCount + " scenes"
                                        : engineController.workspaceMode === "audio"
                                          ? engineController.audioChannelCount + " channels | "
                                            + engineController.audioSnapshotCount + " snapshots"
                                          : engineController.commissioningPlanningProjectCount + " projects | "
                                            + engineController.commissioningPlanningTaskCount + " tasks"
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
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

                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? "Lighting Snapshot"
                                                  : engineController.workspaceMode === "audio"
                                                    ? "Audio Snapshot"
                                                    : "Commissioning Snapshot"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: root.workspaceSummary(engineController.workspaceMode)
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

                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? "Bridge Config"
                                                  : engineController.workspaceMode === "audio"
                                                    ? "Transport Config"
                                                    : "Commissioning State"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? (engineController.lightingSnapshotLoaded
                                                     ? "Bridge "
                                                       + (engineController.lightingBridgeIp.length > 0
                                                          ? engineController.lightingBridgeIp
                                                          : "unconfigured")
                                                       + "\nUniverse "
                                                       + engineController.lightingUniverse
                                                       + "\nAdapter "
                                                       + root.formatEnumLabel(engineController.lightingAdapterMode)
                                                     : "Lighting configuration is waiting for the engine snapshot.")
                                                  : engineController.workspaceMode === "audio"
                                                    ? (engineController.audioSnapshotLoaded
                                                       ? "Send "
                                                         + engineController.audioSendHost
                                                         + ":"
                                                         + engineController.audioSendPort
                                                         + "\nReceive "
                                                         + engineController.audioReceivePort
                                                         + "\nAdapter "
                                                         + root.formatEnumLabel(engineController.audioAdapterMode)
                                                       : "Audio transport settings are waiting for the engine snapshot.")
                                                    : (engineController.commissioningSnapshotLoaded
                                                       ? engineController.commissioningConfigDetails
                                                       : "Commissioning configuration is waiting for the engine snapshot.")
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

                                        Label {
                                            text: engineController.workspaceMode === "setup" ? "Support Snapshot" : "Readiness"
                                            color: "#8ea4c0"
                                            font.pixelSize: 12
                                        }
                                        Label {
                                            text: engineController.workspaceMode === "lighting"
                                                  ? (engineController.lightingSnapshotLoaded
                                                     ? "Status "
                                                       + root.formatEnumLabel(engineController.lightingStatus)
                                                       + "\nConnected "
                                                       + (engineController.lightingConnected ? "yes" : "no")
                                                       + " | Reachable "
                                                       + (engineController.lightingReachable ? "yes" : "no")
                                                       + "\nFixtures "
                                                       + engineController.lightingFixtureCount
                                                       + " | Groups "
                                                       + engineController.lightingGroupCount
                                                       + " | Scenes "
                                                       + engineController.lightingSceneCount
                                                     : "Lighting readiness is still synchronizing.")
                                                  : engineController.workspaceMode === "audio"
                                                    ? (engineController.audioSnapshotLoaded
                                                       ? "Status "
                                                         + root.formatEnumLabel(engineController.audioStatus)
                                                         + "\nConnected "
                                                         + (engineController.audioConnected ? "yes" : "no")
                                                         + " | Verified "
                                                         + (engineController.audioVerified ? "yes" : "no")
                                                         + "\nMetering "
                                                         + root.formatEnumLabel(engineController.audioMeteringState)
                                                       + "\nChannels "
                                                       + engineController.audioChannelCount
                                                       + " | Mix Targets "
                                                       + engineController.audioMixTargetCount
                                                       + " | Snapshots "
                                                       + engineController.audioSnapshotCount
                                                       : "Audio readiness is still synchronizing.")
                                                    : (engineController.commissioningSnapshotLoaded
                                                       ? engineController.commissioningReadinessDetails
                                                       : "Commissioning support state is still synchronizing.")
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }
                                }
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                visible: engineController.workspaceMode === "lighting"
                                columns: root.width >= 1320 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 224

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Fixtures"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        Label {
                                            visible: engineController.lightingFixtureCount === 0
                                            text: "No fixtures are exposed by the current lighting backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingFixtures

                                            Rectangle {
                                                required property var modelData
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 84

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 6

                                                    Label {
                                                        text: modelData.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: root.formatEnumLabel(modelData.kind)
                                                              + (modelData.groupId ? " | " + modelData.groupId : "")
                                                              + " | " + modelData.id
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Label {
                                                            text: "State "
                                                                  + (modelData.on ? "On" : "Off")
                                                                  + " | Intensity "
                                                                  + modelData.intensity
                                                                  + "%"
                                                            color: modelData.on ? "#6fd3a8" : "#b4c0cf"
                                                            font.pixelSize: 11
                                                            Layout.fillWidth: true
                                                        }

                                                        Button {
                                                            text: modelData.on ? "Turn Off" : "Turn On"
                                                            onClicked: engineController.setLightingFixturePower(modelData.id, !modelData.on)
                                                        }
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
                                    Layout.preferredHeight: 224

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Groups"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        Label {
                                            visible: engineController.lightingGroupCount === 0
                                            text: "No lighting groups are exposed by the current backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingGroups

                                            Rectangle {
                                                required property var modelData
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 84

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 6

                                                    Label {
                                                        text: modelData.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }

                                                    Label {
                                                        text: modelData.id + " | " + modelData.fixtureCount + " fixtures"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Button {
                                                            text: "All On"
                                                            onClicked: engineController.setLightingGroupPower(modelData.id, true)
                                                        }

                                                        Button {
                                                            text: "All Off"
                                                            onClicked: engineController.setLightingGroupPower(modelData.id, false)
                                                        }
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
                                    Layout.preferredHeight: 224

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label {
                                                text: "Scenes"
                                                color: "#8ea4c0"
                                                font.pixelSize: 12
                                            }

                                            Item { Layout.fillWidth: true }

                                            Button {
                                                text: "Refresh"
                                                onClicked: engineController.requestLightingSnapshot()
                                            }
                                        }

                                        Label {
                                            visible: engineController.lightingSceneCount === 0
                                            text: "No lighting scenes are exposed by the current backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: engineController.lightingScenes

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
                                                    spacing: 6

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        ColumnLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 2

                                                            Label {
                                                                text: modelData.name
                                                                color: "#f5f7fb"
                                                                font.pixelSize: 12
                                                                font.weight: Font.DemiBold
                                                            }

                                                            Label {
                                                                text: modelData.id
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WrapAnywhere
                                                                Layout.fillWidth: true
                                                            }
                                                        }

                                                        Button {
                                                            text: "Recall"
                                                            onClicked: engineController.recallLightingScene(modelData.id)
                                                        }
                                                    }

                                                    Label {
                                                        visible: !!modelData.lastRecalled
                                                        text: modelData.lastRecalledAt
                                                              ? "Last recalled " + modelData.lastRecalledAt
                                                              : "Last recalled by the native engine"
                                                        color: "#6fd3a8"
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
                                visible: engineController.workspaceMode === "audio"
                                columns: root.width >= 1320 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 520

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label { text: "Channels"; color: "#8ea4c0"; font.pixelSize: 12 }

                                            Item { Layout.fillWidth: true }

                                            ComboBox {
                                                Layout.preferredWidth: 180
                                                model: engineController.audioMixTargets
                                                textRole: "name"
                                                enabled: engineController.audioMixTargetCount > 0
                                                currentIndex: {
                                                    for (let index = 0; index < engineController.audioMixTargets.length; index += 1) {
                                                        if (engineController.audioMixTargets[index].id === root.selectedAudioMixTargetId) {
                                                            return index
                                                        }
                                                    }
                                                    return 0
                                                }
                                                onActivated: function(index) {
                                                    if (index >= 0 && index < engineController.audioMixTargets.length) {
                                                        root.selectedAudioMixTargetId = engineController.audioMixTargets[index].id
                                                    }
                                                }
                                            }
                                        }

                                        Label {
                                            visible: engineController.audioChannelCount === 0
                                            text: "No channels are exposed by the current audio backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Rectangle {
                                            id: selectedAudioChannelCard
                                            property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                            visible: selectedAudioChannelCard.selectedChannel !== null
                                            radius: 10
                                            color: "#0c1320"
                                            border.color: "#4b7bc0"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel) ? 220 : 182

                                            ColumnLayout {
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 8

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    ColumnLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 2

                                                        Label {
                                                            text: selectedAudioChannelCard.selectedChannel ? selectedAudioChannelCard.selectedChannel.name : ""
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 12
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: selectedAudioChannelCard.selectedChannel
                                                                  ? root.audioRoleLabel(selectedAudioChannelCard.selectedChannel.role)
                                                                    + " | "
                                                                    + (selectedAudioChannelCard.selectedChannel.stereo ? "Stereo pair" : "Mono input")
                                                                    + " | Send "
                                                                    + root.audioLevelLabel(root.audioChannelSendLevel(selectedAudioChannelCard.selectedChannel, root.selectedAudioMixTargetId))
                                                                  : ""
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }

                                                    Rectangle {
                                                        radius: 9
                                                        color: "#152236"
                                                        border.color: "#2a3b55"
                                                        border.width: 1
                                                        implicitWidth: 74
                                                        implicitHeight: 28

                                                        Label {
                                                            anchors.centerIn: parent
                                                            text: "Selected"
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 10
                                                            font.weight: Font.DemiBold
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: selectedAudioChannelCard.selectedChannel
                                                          ? "Current mix: "
                                                            + (root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                               ? root.audioMixTargetById(root.selectedAudioMixTargetId).name
                                                               : "Main Out")
                                                          : ""
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Slider {
                                                    visible: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel)
                                                    Layout.fillWidth: true
                                                    from: 0
                                                    to: 75
                                                    stepSize: 1
                                                    enabled: engineController.operatorUiReady
                                                    value: selectedAudioChannelCard.selectedChannel ? selectedAudioChannelCard.selectedChannel.gain : 0
                                                    onPressedChanged: {
                                                        if (!pressed && selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "gain": Math.round(value) }
                                                            )
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: root.audioChannelSupportsGain(selectedAudioChannelCard.selectedChannel)
                                                    text: selectedAudioChannelCard.selectedChannel ? "Preamp gain +" + Math.round(selectedAudioChannelCard.selectedChannel.gain) + " dB" : ""
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        visible: selectedAudioChannelCard.selectedChannel !== null
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.mute ? "Muted" : "Mute"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "mute": !selectedAudioChannelCard.selectedChannel.mute }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: selectedAudioChannelCard.selectedChannel !== null
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.solo ? "Soloed" : "Solo"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "solo": !selectedAudioChannelCard.selectedChannel.solo }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsPhase(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.phase ? "Phase On" : "Phase"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "phase": !selectedAudioChannelCard.selectedChannel.phase }
                                                            )
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    visible: root.audioChannelSupportsPhantom(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsPad(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsInstrument(selectedAudioChannelCard.selectedChannel)
                                                             || root.audioChannelSupportsAutoSet(selectedAudioChannelCard.selectedChannel)
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Button {
                                                        visible: root.audioChannelSupportsPhantom(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.phantom ? "48V On" : "48V"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "phantom": !selectedAudioChannelCard.selectedChannel.phantom }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsPad(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.pad ? "Pad On" : "Pad"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "pad": !selectedAudioChannelCard.selectedChannel.pad }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsInstrument(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.instrument ? "Inst On" : "Inst"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "instrument": !selectedAudioChannelCard.selectedChannel.instrument }
                                                            )
                                                        }
                                                    }

                                                    Button {
                                                        visible: root.audioChannelSupportsAutoSet(selectedAudioChannelCard.selectedChannel)
                                                        text: selectedAudioChannelCard.selectedChannel && selectedAudioChannelCard.selectedChannel.autoSet ? "AutoSet On" : "AutoSet"
                                                        Layout.fillWidth: true
                                                        onClicked: if (selectedAudioChannelCard.selectedChannel) {
                                                            engineController.updateAudioChannel(
                                                                selectedAudioChannelCard.selectedChannel.id,
                                                                { "autoSet": !selectedAudioChannelCard.selectedChannel.autoSet }
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 8

                                                Repeater {
                                                    model: engineController.audioChannels

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: modelData.id === root.selectedAudioChannelId ? "#14233a" : "#0c1320"
                                                        border.color: modelData.id === root.selectedAudioChannelId ? "#4b7bc0" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 128

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 8

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                ColumnLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 2

                                                                    Label {
                                                                        text: modelData.name
                                                                        color: "#f5f7fb"
                                                                        font.pixelSize: 12
                                                                        font.weight: Font.DemiBold
                                                                    }

                                                                    Label {
                                                                        text: root.audioRoleLabel(modelData.role)
                                                                              + " | Send "
                                                                              + root.audioLevelLabel(root.audioChannelSendLevel(modelData, root.selectedAudioMixTargetId))
                                                                        color: "#8ea4c0"
                                                                        font.pixelSize: 11
                                                                        wrapMode: Text.WordWrap
                                                                        Layout.fillWidth: true
                                                                    }
                                                                }

                                                                Rectangle {
                                                                    radius: 9
                                                                    color: "#152236"
                                                                    border.color: "#2a3b55"
                                                                    border.width: 1
                                                                    implicitWidth: 54
                                                                    implicitHeight: 28

                                                                    Label {
                                                                        anchors.centerIn: parent
                                                                        text: modelData.shortName
                                                                        color: "#d7e2f0"
                                                                        font.pixelSize: 10
                                                                        font.weight: Font.DemiBold
                                                                    }
                                                                }

                                                                Button {
                                                                    text: modelData.id === root.selectedAudioChannelId ? "Selected" : "Focus"
                                                                    onClicked: root.selectedAudioChannelId = modelData.id
                                                                }
                                                            }

                                                            Slider {
                                                                Layout.fillWidth: true
                                                                from: 0
                                                                to: 1
                                                                stepSize: 0.01
                                                                enabled: engineController.operatorUiReady && root.selectedAudioMixTargetId.length > 0
                                                                value: root.audioChannelSendLevel(modelData, root.selectedAudioMixTargetId)
                                                                onPressedChanged: {
                                                                    if (!pressed && root.selectedAudioMixTargetId.length > 0) {
                                                                        root.selectedAudioChannelId = modelData.id
                                                                        engineController.updateAudioChannel(
                                                                            modelData.id,
                                                                            {
                                                                                "fader": value,
                                                                                "mixTargetId": root.selectedAudioMixTargetId
                                                                            }
                                                                        )
                                                                    }
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    text: modelData.mute ? "Muted" : "Mute"
                                                                    Layout.fillWidth: true
                                                                    onClicked: {
                                                                        root.selectedAudioChannelId = modelData.id
                                                                        engineController.updateAudioChannel(
                                                                            modelData.id,
                                                                            { "mute": !modelData.mute }
                                                                        )
                                                                    }
                                                                }

                                                                Button {
                                                                    text: modelData.solo ? "Soloed" : "Solo"
                                                                    Layout.fillWidth: true
                                                                    onClicked: {
                                                                        root.selectedAudioChannelId = modelData.id
                                                                        engineController.updateAudioChannel(
                                                                            modelData.id,
                                                                            { "solo": !modelData.solo }
                                                                        )
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
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 420

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Mix Targets"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        Label {
                                            visible: engineController.audioMixTargetCount === 0
                                            text: "No mix targets are exposed by the current audio backend."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 8

                                                Repeater {
                                                    model: engineController.audioMixTargets

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: modelData.id === root.selectedAudioMixTargetId ? "#14233a" : "#0c1320"
                                                        border.color: modelData.id === root.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: modelData.role === "main-out" ? 150 : 118

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 8

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    Layout.fillWidth: true
                                                                    text: modelData.name + " | " + root.audioLevelLabel(modelData.volume)
                                                                    onClicked: root.selectedAudioMixTargetId = modelData.id
                                                                }

                                                                Rectangle {
                                                                    radius: 9
                                                                    color: "#152236"
                                                                    border.color: "#2a3b55"
                                                                    border.width: 1
                                                                    implicitWidth: 54
                                                                    implicitHeight: 28

                                                                    Label {
                                                                        anchors.centerIn: parent
                                                                        text: modelData.shortName
                                                                        color: "#d7e2f0"
                                                                        font.pixelSize: 10
                                                                        font.weight: Font.DemiBold
                                                                    }
                                                                }
                                                            }

                                                            Label {
                                                                text: root.audioRoleLabel(modelData.role)
                                                                color: "#8ea4c0"
                                                                font.pixelSize: 11
                                                                wrapMode: Text.WordWrap
                                                                Layout.fillWidth: true
                                                            }

                                                            Slider {
                                                                Layout.fillWidth: true
                                                                from: 0
                                                                to: 1
                                                                stepSize: 0.01
                                                                enabled: engineController.operatorUiReady
                                                                value: modelData.volume
                                                                onPressedChanged: {
                                                                    if (!pressed) {
                                                                        engineController.updateAudioMixTarget(
                                                                            modelData.id,
                                                                            { "volume": value }
                                                                        )
                                                                    }
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    text: modelData.mute ? "Muted" : "Mute"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "mute": !modelData.mute }
                                                                    )
                                                                }

                                                                Button {
                                                                    visible: modelData.role === "main-out"
                                                                    text: modelData.dim ? "Dim On" : "Dim"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "dim": !modelData.dim }
                                                                    )
                                                                }
                                                            }

                                                            RowLayout {
                                                                visible: modelData.role === "main-out"
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                Button {
                                                                    text: modelData.mono ? "Mono On" : "Mono"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "mono": !modelData.mono }
                                                                    )
                                                                }

                                                                Button {
                                                                    text: modelData.talkback ? "Talk On" : "Talk"
                                                                    Layout.fillWidth: true
                                                                    onClicked: engineController.updateAudioMixTarget(
                                                                        modelData.id,
                                                                        { "talkback": !modelData.talkback }
                                                                    )
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
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 520

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true

                                            Label {
                                                text: "Audio Console"
                                                color: "#8ea4c0"
                                                font.pixelSize: 12
                                            }

                                            Item { Layout.fillWidth: true }

                                            Button {
                                                text: "Sync Console"
                                                onClicked: engineController.syncAudioConsole()
                                            }
                                        }

                                        ScrollView {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            clip: true

                                            ColumnLayout {
                                                width: parent.width
                                                spacing: 8

                                                Rectangle {
                                                    id: audioFocusCard
                                                    property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                                    property var selectedMixTarget: root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                    property var activeSnapshot: root.activeAudioSnapshot()
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 118

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Focus"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: audioFocusCard.selectedChannel ? audioFocusCard.selectedChannel.name : "No strip selected"
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: (audioFocusCard.selectedMixTarget ? root.audioMixLabel(audioFocusCard.selectedMixTarget) : "Main Monitors")
                                                                  + " mix is active"
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            text: audioFocusCard.activeSnapshot
                                                                  ? "Active snapshot: " + audioFocusCard.activeSnapshot.name
                                                                  : "No snapshot recalled this session"
                                                            color: audioFocusCard.activeSnapshot ? "#6fd3a8" : "#8ea4c0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#10231e"
                                                    border.color: "#2d5b4d"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 86

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Safe Startup"
                                                            color: "#9ee1c7"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: "Opening the native audio workspace initializes transport only. Stored fader and preamp state are never pushed on load."
                                                            color: "#d7efe5"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 132

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Console State"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: root.audioConsoleStateLabel(
                                                                      engineController.audioConsoleStateConfidence,
                                                                      engineController.audioLastConsoleSyncReason
                                                                  )
                                                            color: engineController.audioConsoleStateConfidence === "aligned" ? "#6fd3a8" : "#f7d47c"
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: engineController.audioConsoleStateConfidence === "aligned"
                                                                  ? (engineController.audioLastConsoleSyncAt.length > 0
                                                                     ? "Last full push " + root.formatTimestamp(engineController.audioLastConsoleSyncAt)
                                                                     : "Native console state is aligned with the stored mix.")
                                                                  : engineController.audioLastConsoleSyncReason === "snapshot"
                                                                    ? (engineController.audioLastSnapshotRecallAt.length > 0
                                                                       ? "A snapshot was recalled " + root.formatTimestamp(engineController.audioLastSnapshotRecallAt) + ". Sync Console to reassert the stored mix."
                                                                       : "A snapshot changed hardware outside this surface. Sync Console before trusting stored strip values.")
                                                                    : "Startup is transport-safe. The native surface assumes hardware state until you intentionally sync."
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    visible: engineController.audioLastActionMessage.length > 0
                                                    radius: 10
                                                    color: engineController.audioLastActionStatus === "failed" ? "#241317" : "#0c1320"
                                                    border.color: engineController.audioLastActionStatus === "failed" ? "#6b2d35" : "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 86

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: engineController.audioLastActionStatus === "failed" ? "Last Action Failed" : "Last Action"
                                                            color: engineController.audioLastActionStatus === "failed" ? "#f7b4bc" : "#8ea4c0"
                                                            font.pixelSize: 11
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: engineController.audioLastActionCode.length > 0
                                                                  ? engineController.audioLastActionMessage + " (" + engineController.audioLastActionCode + ")"
                                                                  : engineController.audioLastActionMessage
                                                            color: "#d7e2f0"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    id: audioSelectedStripCard
                                                    property var selectedChannel: root.audioChannelById(root.selectedAudioChannelId)
                                                    property var selectedMixTarget: root.audioMixTargetById(root.selectedAudioMixTargetId)
                                                    visible: audioSelectedStripCard.selectedChannel !== null
                                                    radius: 10
                                                    color: "#0c1320"
                                                    border.color: "#24344a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: 214

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        spacing: 6

                                                        Label {
                                                            text: "Selected Strip"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 11
                                                        }

                                                        Label {
                                                            text: audioSelectedStripCard.selectedChannel ? audioSelectedStripCard.selectedChannel.name : ""
                                                            color: "#f5f7fb"
                                                            font.pixelSize: 14
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: audioSelectedStripCard.selectedChannel
                                                                  ? root.audioRoleLabel(audioSelectedStripCard.selectedChannel.role) + " on " + root.audioBusLabel(audioSelectedStripCard.selectedChannel)
                                                                  : ""
                                                            color: "#b4c0cf"
                                                            font.pixelSize: 11
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 56

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 4

                                                                Label {
                                                                    text: "Current Mix"
                                                                    color: "#8ea4c0"
                                                                    font.pixelSize: 10
                                                                }

                                                                Label {
                                                                    text: root.audioMixLabel(audioSelectedStripCard.selectedMixTarget)
                                                                    color: "#f5f7fb"
                                                                    font.pixelSize: 12
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Label {
                                                            text: "Send Matrix"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 10
                                                        }

                                                        Repeater {
                                                            model: root.selectedAudioSendMatrix()

                                                            Rectangle {
                                                                required property var modelData
                                                                radius: 8
                                                                color: modelData.target.id === root.selectedAudioMixTargetId ? "#14233a" : "#101826"
                                                                border.color: modelData.target.id === root.selectedAudioMixTargetId ? "#4b7bc0" : "#24344a"
                                                                border.width: 1
                                                                Layout.fillWidth: true
                                                                implicitHeight: 48

                                                                RowLayout {
                                                                    anchors.fill: parent
                                                                    anchors.margins: 8
                                                                    spacing: 8

                                                                    ColumnLayout {
                                                                        Layout.fillWidth: true
                                                                        spacing: 2

                                                                        Label {
                                                                            text: root.audioMixLabel(modelData.target)
                                                                            color: "#f5f7fb"
                                                                            font.pixelSize: 11
                                                                            font.weight: Font.DemiBold
                                                                        }

                                                                        Label {
                                                                            text: "Out " + modelData.target.name
                                                                            color: "#8ea4c0"
                                                                            font.pixelSize: 10
                                                                            wrapMode: Text.WordWrap
                                                                            Layout.fillWidth: true
                                                                        }
                                                                    }

                                                                    Label {
                                                                        text: root.audioLevelLabel(modelData.level)
                                                                        color: "#d7e2f0"
                                                                        font.pixelSize: 11
                                                                        font.weight: Font.DemiBold
                                                                    }
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
                                                    implicitHeight: 146

                                                    GridLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 10
                                                        columns: 2
                                                        columnSpacing: 8
                                                        rowSpacing: 8

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Probe"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioVerified ? "Passed" : "Needs Probe"
                                                                    color: engineController.audioVerified ? "#6fd3a8" : "#f7d47c"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Transport"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: engineController.audioConnected ? "Ready" : "Offline"
                                                                    color: engineController.audioConnected ? "#6fd3a8" : "#f7d47c"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Metering"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: root.audioMeteringLabel(engineController.audioMeteringState)
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 8
                                                            color: "#101826"
                                                            border.color: "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: 52

                                                            ColumnLayout {
                                                                anchors.fill: parent
                                                                anchors.margins: 8
                                                                spacing: 2

                                                                Label { text: "Adapter"; color: "#8ea4c0"; font.pixelSize: 10 }
                                                                Label {
                                                                    text: root.formatEnumLabel(engineController.audioAdapterMode)
                                                                    color: "#d7e2f0"
                                                                    font.pixelSize: 11
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: engineController.audioSnapshotCount === 0
                                                    text: "No snapshots are exposed by the current audio backend."
                                                    color: "#b4c0cf"
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Repeater {
                                                    model: engineController.audioSnapshots

                                                    Rectangle {
                                                        required property var modelData
                                                        radius: 10
                                                        color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#14233a" : "#0c1320"
                                                        border.color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#4b7bc0" : "#24344a"
                                                        border.width: 1
                                                        Layout.fillWidth: true
                                                        implicitHeight: 82

                                                        ColumnLayout {
                                                            anchors.fill: parent
                                                            anchors.margins: 10
                                                            spacing: 6

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: 8

                                                                ColumnLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 2

                                                                    Label {
                                                                        text: modelData.name
                                                                        color: "#f5f7fb"
                                                                        font.pixelSize: 12
                                                                        font.weight: Font.DemiBold
                                                                    }

                                                                    Label {
                                                                        text: modelData.id
                                                                        color: "#8ea4c0"
                                                                        font.pixelSize: 11
                                                                        wrapMode: Text.WrapAnywhere
                                                                        Layout.fillWidth: true
                                                                    }
                                                                }

                                                                Button {
                                                                    text: "Recall"
                                                                    onClicked: engineController.recallAudioSnapshot(modelData.id)
                                                                }
                                                            }

                                                            Label {
                                                                text: modelData.lastRecalledAt
                                                                      ? "Last recalled " + root.formatTimestamp(modelData.lastRecalledAt)
                                                                      : (modelData.id === engineController.audioLastRecalledSnapshotId
                                                                         ? "Recalled by the native engine"
                                                                         : "Ready to recall")
                                                                color: modelData.id === engineController.audioLastRecalledSnapshotId ? "#6fd3a8" : "#8ea4c0"
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
                                visible: engineController.workspaceMode === "setup"
                                columns: root.width >= 1320 ? 3 : 1
                                columnSpacing: 12
                                rowSpacing: 12

                                Rectangle {
                                    radius: 12
                                    color: "#101826"
                                    border.color: "#2a3b55"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Backup Archive"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.supportSnapshotLoaded
                                                  ? engineController.supportDetails
                                                  : "Support snapshot is waiting for the engine."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: "Backup dir: "
                                                  + (engineController.supportBackupDir.length > 0
                                                     ? engineController.supportBackupDir
                                                     : "unavailable")
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        Label {
                                            text: engineController.supportLatestBackupPath.length > 0
                                                  ? "Latest archive: " + engineController.supportLatestBackupPath
                                                  : "No native backup archive has been created yet."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                        }
                                        RowLayout {
                                            spacing: 8

                                            Button {
                                                text: "Export Native Backup"
                                                enabled: engineController.operatorUiReady
                                                onClicked: engineController.exportSupportBackup()
                                            }

                                            Button {
                                                text: "Refresh"
                                                enabled: engineController.operatorUiReady
                                                onClicked: engineController.requestSupportSnapshot()
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
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Available Backups"; color: "#8ea4c0"; font.pixelSize: 12 }

                                        Label {
                                            visible: engineController.supportBackupCount === 0
                                            text: "No JSON backup archives are present in the native backup directory."
                                            color: "#b4c0cf"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Repeater {
                                            model: Math.min(engineController.supportBackupFiles.length, 5)

                                            Rectangle {
                                                property var entry: engineController.supportBackupFiles[index]
                                                radius: 10
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: 56

                                                ColumnLayout {
                                                    anchors.fill: parent
                                                    anchors.margins: 10
                                                    spacing: 2

                                                    Label {
                                                        text: entry.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WrapAnywhere
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        text: root.formatFileSize(entry.sizeBytes)
                                                              + " | "
                                                              + root.formatUnixTimestamp(entry.modifiedAt)
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
                                    Layout.preferredHeight: 214

                                    ColumnLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 8

                                        Label { text: "Restore And Diagnostics"; color: "#8ea4c0"; font.pixelSize: 12 }
                                        Label {
                                            text: engineController.supportSnapshotLoaded
                                                  ? engineController.supportRestoreDetails
                                                  : "Support restore state is waiting for the engine."
                                            color: "#f5f7fb"
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                        TextField {
                                            Layout.fillWidth: true
                                            text: root.supportRestorePathDraft
                                            placeholderText: "Path to backup JSON"
                                            onTextChanged: root.supportRestorePathDraft = text
                                        }
                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                text: "Restore Backup"
                                                enabled: root.supportRestorePathDraft.trim().length > 0
                                                         && engineController.operatorUiReady
                                                onClicked: engineController.restoreSupportBackup(root.supportRestorePathDraft)
                                            }

                                            Button {
                                                text: "Export Shell Diagnostics"
                                                onClicked: engineController.exportShellDiagnostics()
                                            }
                                        }
                                        Label {
                                            text: engineController.shellDiagnosticsExportPath.length > 0
                                                  ? "Shell diagnostics: " + engineController.shellDiagnosticsExportPath
                                                  : "No shell diagnostics bundle exported yet."
                                            color: "#8ea4c0"
                                            wrapMode: Text.WrapAnywhere
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

        function onCommissioningSnapshotChanged() {
            if (!engineController || !engineController.commissioningSnapshotLoaded) {
                return
            }

            root.commissioningLightingBridgeIpDraft = engineController.commissioningLightingBridgeIp
            root.commissioningLightingUniverseDraft = engineController.commissioningLightingUniverse
            root.commissioningAudioSendHostDraft = engineController.commissioningAudioSendHost
            root.commissioningAudioSendPortDraft = engineController.commissioningAudioSendPort
            root.commissioningAudioReceivePortDraft = engineController.commissioningAudioReceivePort
        }

        function onAudioSnapshotChanged() {
            root.syncAudioSelection()
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
                    text: engineController.healthDetails
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

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Button {
                        text: "Retry Startup"
                        enabled: engineController.canRetry
                        onClicked: engineController.retryStart()
                    }

                    Button {
                        text: "Open Diagnostics"
                        onClicked: engineController.openDiagnosticsDirectory()
                    }

                    Button {
                        text: "Open Logs"
                        onClicked: engineController.openLogsDirectory()
                    }

                    Button {
                        text: "Open Engine Log"
                        onClicked: engineController.openEngineLogFile()
                    }

                    Button {
                        text: "Export Shell Diagnostics"
                        onClicked: engineController.exportShellDiagnostics()
                    }
                }

                Label {
                    visible: engineController.shellDiagnosticsExportPath.length > 0
                    text: "Last shell diagnostics export: " + engineController.shellDiagnosticsExportPath
                    color: "#8ea4c0"
                    wrapMode: Text.WrapAnywhere
                    Layout.fillWidth: true
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
                text: "App Snapshot"
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
