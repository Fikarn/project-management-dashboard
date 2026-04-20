import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window
import QtQml

Item {
    id: root
    objectName: "planning-project-detail-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open

    property var selectedProject: engineController ? rootWindow.projectById(engineController.planningSelectedProjectId) : null
    property var selectedProjectTasks: selectedProject ? rootWindow.tasksForProject(selectedProject.id) : []
    property var checklistTotals: selectedProject ? rootWindow.checklistTotalsForProject(selectedProject.id) : ({ "done": 0, "total": 0 })
    property int completedTaskCount: selectedProject ? rootWindow.completedTaskCountForProject(selectedProject.id) : 0
    property int totalProjectSeconds: selectedProject ? rootWindow.totalSecondsForProject(selectedProject.id) : 0
    property real progressValue: selectedProject ? rootWindow.progressForProject(selectedProject.id) : 0
    property var activityItems: selectedProject ? rootWindow.activityForProject(selectedProject.id) : []
    property string newTaskTitleDraft: ""
    property bool addTaskMode: false
    property bool projectEditMode: false
    property string projectTitleDraft: ""
    property string projectDescriptionDraft: ""
    property string projectPriorityDraft: "p2"
    property string editingTaskId: ""
    property string taskTitleDraft: ""
    property string taskDescriptionDraft: ""
    property string taskPriorityDraft: "p2"
    property string taskDueDateDraft: ""
    property string taskLabelsDraft: ""
    property var checklistDrafts: ({})
    property bool compactReadMode: root.largeWorkspace
                                   && !root.projectEditMode
                                   && root.editingTaskId.length === 0
                                   && !root.addTaskMode
    property bool largeWorkspace: rootWindow
                                  && (rootWindow.visibility === Window.FullScreen || rootWindow.width >= 1450)

    ConsoleTheme {
        id: theme
    }

    function labelsText(labels) {
        if (rootWindow.labelsToCsv) {
            return rootWindow.labelsToCsv(labels || [])
        }

        return (labels || []).join(", ")
    }

    function taskById(taskId) {
        if (!taskId) {
            return null
        }

        if (rootWindow.taskById) {
            return rootWindow.taskById(taskId)
        }

        for (let index = 0; index < root.selectedProjectTasks.length; index += 1) {
            const task = root.selectedProjectTasks[index]
            if (task.id === taskId) {
                return task
            }
        }

        return null
    }

    function priorityBadgeColor(priority) {
        if (priority === "p0") {
            return theme.accentRed
        }

        if (priority === "p1") {
            return theme.accentOrange
        }

        if (priority === "p2") {
            return theme.accentAmber
        }

        return theme.studio600
    }

    function priorityTextColor(priority) {
        if (priority === "p2" || priority === "p3") {
            return theme.studio100
        }

        return theme.studio950
    }

    function statusBadgeColor(status) {
        if (status === "done") {
            return theme.accentGreen
        }

        if (status === "blocked") {
            return theme.accentRed
        }

        if (status === "in-progress") {
            return theme.accentBlue
        }

        return theme.studio600
    }

    function statusTextColor(status) {
        if (status === "done") {
            return theme.accentGreen
        }

        if (status === "blocked") {
            return theme.accentRed
        }

        if (status === "in-progress") {
            return theme.accentBlue
        }

        return theme.studio300
    }

    function checklistDoneCount(checklist) {
        let done = 0
        const items = checklist || []

        for (let index = 0; index < items.length; index += 1) {
            if (items[index].done) {
                done += 1
            }
        }

        return done
    }

    function formatTaskTimer(totalSeconds) {
        const value = Math.max(0, Number(totalSeconds || 0))
        const hours = Math.floor(value / 3600)
        const minutes = Math.floor((value % 3600) / 60)
        const seconds = Math.floor(value % 60)
        return String(hours).padStart(2, "0")
                + ":" + String(minutes).padStart(2, "0")
                + ":" + String(seconds).padStart(2, "0")
    }

    function dueDateColor(dueDate) {
        if (!dueDate || dueDate.length === 0) {
            return theme.studio400
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(dueDate + "T00:00:00")
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return theme.accentRed
        }
        if (diffDays === 0) {
            return theme.accentAmber
        }
        if (diffDays <= 3) {
            return theme.accentAmber
        }

        return theme.studio400
    }

    function dueDateLabel(dueDate) {
        if (!dueDate || dueDate.length === 0) {
            return ""
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(dueDate + "T00:00:00")
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return "Overdue (" + dueDate + ")"
        }
        if (diffDays === 0) {
            return "Due today"
        }

        return "Due " + dueDate
    }

    function createTaskFromDraft() {
        const title = newTaskTitleDraft.trim()
        if (!selectedProject || title.length === 0) {
            return
        }

        engineController.createPlanningTask(selectedProject.id, title)
        newTaskTitleDraft = ""
        addTaskMode = false
    }

    function resetProjectDrafts() {
        projectTitleDraft = selectedProject ? selectedProject.title : ""
        projectDescriptionDraft = selectedProject ? selectedProject.description : ""
        projectPriorityDraft = selectedProject ? selectedProject.priority : "p2"
    }

    function projectDraftDirty() {
        if (!selectedProject) {
            return false
        }

        return projectTitleDraft.trim() !== selectedProject.title
               || projectDescriptionDraft !== selectedProject.description
               || projectPriorityDraft !== selectedProject.priority
    }

    function startProjectEdit() {
        if (!selectedProject) {
            return
        }

        resetProjectDrafts()
        projectEditMode = true
    }

    function cancelProjectEdit() {
        resetProjectDrafts()
        projectEditMode = false
    }

    function saveProjectEdit() {
        const title = projectTitleDraft.trim()
        if (!selectedProject || title.length === 0) {
            return
        }

        engineController.updatePlanningProject(
            selectedProject.id,
            title,
            projectDescriptionDraft,
            projectPriorityDraft
        )
        projectEditMode = false
    }

    function resetTaskDrafts(task) {
        taskTitleDraft = task ? task.title : ""
        taskDescriptionDraft = task ? task.description : ""
        taskPriorityDraft = task ? task.priority : "p2"
        taskDueDateDraft = task && task.dueDate ? task.dueDate : ""
        taskLabelsDraft = task ? labelsText(task.labels) : ""
    }

    function startTaskEdit(task) {
        if (!task) {
            return
        }

        engineController.selectPlanningTask(task.id)
        editingTaskId = task.id
        resetTaskDrafts(task)
    }

    function cancelTaskEdit() {
        const task = taskById(editingTaskId)
        resetTaskDrafts(task)
        editingTaskId = ""
    }

    function taskDraftDirty(task) {
        if (!task) {
            return false
        }

        return taskTitleDraft.trim() !== task.title
               || taskDescriptionDraft !== task.description
               || taskPriorityDraft !== task.priority
               || taskDueDateDraft !== (task.dueDate ? task.dueDate : "")
               || taskLabelsDraft !== labelsText(task.labels)
    }

    function saveTaskEdit(task) {
        const title = taskTitleDraft.trim()
        if (!task || title.length === 0) {
            return
        }

        engineController.updatePlanningTask(
            task.id,
            title,
            taskDescriptionDraft,
            taskPriorityDraft,
            taskDueDateDraft,
            taskLabelsDraft
        )
        editingTaskId = ""
    }

    function checklistDraft(taskId) {
        if (!taskId || !checklistDrafts[taskId]) {
            return ""
        }

        return checklistDrafts[taskId]
    }

    function setChecklistDraft(taskId, value) {
        const nextDrafts = Object.assign({}, checklistDrafts)
        if (!value || value.trim().length === 0) {
            delete nextDrafts[taskId]
        } else {
            nextDrafts[taskId] = value
        }
        checklistDrafts = nextDrafts
    }

    function addChecklistItem(taskId) {
        const text = checklistDraft(taskId).trim()
        if (!taskId || text.length === 0) {
            return
        }

        engineController.addPlanningChecklistItem(taskId, text)
        setChecklistDraft(taskId, "")
    }

    function relativeTimestamp(isoValue) {
        if (!isoValue) {
            return ""
        }

        const timestamp = new Date(isoValue).getTime()
        if (isNaN(timestamp)) {
            return ""
        }

        const diffMs = Date.now() - timestamp
        const minutes = Math.floor(diffMs / 60000)
        if (minutes < 1) {
            return "just now"
        }

        if (minutes < 60) {
            return minutes + "m ago"
        }

        const hours = Math.floor(minutes / 60)
        if (hours < 24) {
            return hours + "h ago"
        }

        const days = Math.floor(hours / 24)
        return days + "d ago"
    }

    anchors.fill: parent
    visible: open && selectedProject !== null
    z: 40

    onSelectedProjectChanged: {
        addTaskMode = false
        projectEditMode = false
        resetProjectDrafts()
        editingTaskId = ""
        resetTaskDrafts(null)
        newTaskTitleDraft = ""
        checklistDrafts = ({})
    }

    onSelectedProjectTasksChanged: {
        if (editingTaskId.length === 0) {
            return
        }

        const currentTask = taskById(editingTaskId)
        if (!currentTask || (selectedProject && currentTask.projectId !== selectedProject.id)) {
            editingTaskId = ""
            resetTaskDrafts(null)
        }
    }

    onOpenChanged: {
        if (!open) {
            addTaskMode = false
            projectEditMode = false
            editingTaskId = ""
            resetTaskDrafts(null)
            checklistDrafts = ({})
            newTaskTitleDraft = ""
        }
    }

    Rectangle {
        anchors.fill: parent
        color: theme.overlayScrim
        opacity: 0.86

        TapHandler {
            onTapped: rootWindow.planningProjectDetailVisible = false
        }
    }

    ConsoleSurface {
        id: detailSurface
        anchors.horizontalCenter: parent.horizontalCenter
        y: Math.max(44, (parent.height - height) * 0.075)
        width: Math.min(parent.width - 88, root.largeWorkspace ? (root.compactReadMode ? 500 : 620) : 540)
        implicitHeight: detailLayout.implicitHeight + (padding * 2)
        height: Math.min(implicitHeight, parent.height - 108)
        tone: "modal"
        padding: 14

        ColumnLayout {
            id: detailLayout
            width: parent.width
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            spacing: 8

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Label {
                            text: root.selectedProject ? root.selectedProject.title : ""
                            color: theme.studio050
                            font.family: theme.uiFontFamily
                            font.pixelSize: theme.textMd
                            font.weight: Font.DemiBold
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ConsoleBadge {
                            visible: !!root.selectedProject
                            text: root.selectedProject ? root.selectedProject.priority.toUpperCase() : ""
                            badgeColor: root.priorityBadgeColor(root.selectedProject ? root.selectedProject.priority : "")
                            textColor: root.priorityTextColor(root.selectedProject ? root.selectedProject.priority : "")
                            filled: root.selectedProject && (root.selectedProject.priority === "p0" || root.selectedProject.priority === "p1")
                        }

                        ConsoleBadge {
                            visible: !!root.selectedProject
                            text: root.selectedProject ? rootWindow.formatEnumLabel(root.selectedProject.status) : ""
                            badgeColor: root.statusBadgeColor(root.selectedProject ? root.selectedProject.status : "")
                            textColor: root.statusTextColor(root.selectedProject ? root.selectedProject.status : "")
                        }
                    }

                    Label {
                        visible: !!root.selectedProject && root.selectedProject.description.length > 0 && !root.projectEditMode
                        text: root.selectedProject ? root.selectedProject.description : ""
                        color: theme.studio400
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textXs
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Rectangle {
                            radius: theme.radiusBadge
                            color: Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.56)
                            border.width: 1
                            border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.6)
                            implicitHeight: 20
                            implicitWidth: completionSummaryLabel.implicitWidth + 18

                            Label {
                                id: completionSummaryLabel
                                anchors.centerIn: parent
                                text: root.selectedProjectTasks.length > 0
                                      ? root.completedTaskCount + "/" + root.selectedProjectTasks.length + " tasks complete"
                                      : "No tasks yet"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXxs
                            }
                        }

                        Rectangle {
                            radius: theme.radiusBadge
                            color: Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.56)
                            border.width: 1
                            border.color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.6)
                            implicitHeight: 20
                            implicitWidth: timeSummaryLabel.implicitWidth + 18

                            Label {
                                id: timeSummaryLabel
                                anchors.centerIn: parent
                                text: "Total time: " + rootWindow.formatSeconds(root.totalProjectSeconds)
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXxs
                            }
                        }

                        Item {
                            Layout.fillWidth: true
                        }
                    }
                }

                RowLayout {
                    spacing: 3
                    Layout.alignment: Qt.AlignTop

                    ConsoleButton {
                        objectName: "planning-project-edit-toggle"
                        text: root.projectEditMode ? "Cancel" : "Edit"
                        enabled: !!root.selectedProject
                        tone: "secondary"
                        compact: true
                        dense: true
                        leftPadding: 10
                        rightPadding: 10
                        onClicked: {
                            if (root.projectEditMode) {
                                root.cancelProjectEdit()
                            } else {
                                root.startProjectEdit()
                            }
                        }
                    }

                    ConsoleButton {
                        objectName: "planning-project-save"
                        text: "Save"
                        visible: root.projectEditMode
                        enabled: !!root.selectedProject && root.projectTitleDraft.trim().length > 0 && root.projectDraftDirty()
                        tone: "primary"
                        compact: true
                        dense: true
                        onClicked: root.saveProjectEdit()
                    }

                    ConsoleButton {
                        objectName: "planning-project-delete"
                        text: "Delete"
                        visible: root.projectEditMode
                        enabled: !!root.selectedProject
                        tone: "danger"
                        compact: true
                        dense: true
                        onClicked: {
                            if (!root.selectedProject) {
                                return
                            }

                            const projectId = root.selectedProject.id
                            rootWindow.planningProjectDetailVisible = false
                            engineController.deletePlanningProject(projectId)
                        }
                    }

                    ConsoleButton {
                        objectName: "planning-project-close"
                        text: ""
                        iconText: "x"
                        tone: "icon"
                        compact: true
                        dense: true
                        iconPixelSize: 10
                        ToolTip.visible: hovered
                        ToolTip.text: "Close project detail"
                        onClicked: rootWindow.planningProjectDetailVisible = false
                    }
                }
            }

            ConsoleSurface {
                visible: root.projectEditMode
                tone: "soft"
                padding: 14
                Layout.fillWidth: true
                implicitHeight: projectEditLayout.implicitHeight + 28

                ColumnLayout {
                    id: projectEditLayout
                    anchors.fill: parent
                    spacing: 10

                    Label {
                        text: "Project Details"
                        color: theme.studio050
                        font.family: theme.uiFontFamily
                        font.pixelSize: theme.textMd
                        font.weight: Font.DemiBold
                    }

                    ConsoleTextField {
                        id: projectTitleField
                        objectName: "planning-project-title-field"
                        Layout.fillWidth: true
                        placeholderText: "Project title"
                        onTextChanged: root.projectTitleDraft = text

                        Binding {
                            target: projectTitleField
                            property: "text"
                            value: root.projectTitleDraft
                            when: !projectTitleField.activeFocus
                        }
                    }

                    ConsoleTextArea {
                        id: projectDescriptionField
                        objectName: "planning-project-description-field"
                        Layout.fillWidth: true
                        Layout.preferredHeight: 76
                        placeholderText: "Project description"
                        wrapMode: TextEdit.Wrap
                        onTextChanged: root.projectDescriptionDraft = text

                        Binding {
                            target: projectDescriptionField
                            property: "text"
                            value: root.projectDescriptionDraft
                            when: !projectDescriptionField.activeFocus
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Label {
                            text: "Priority"
                            color: theme.studio400
                            font.family: theme.uiFontFamily
                            font.pixelSize: theme.textXs
                        }

                        Repeater {
                            model: ["p0", "p1", "p2", "p3"]

                            ConsoleButton {
                                required property string modelData
                                objectName: "planning-project-priority-" + modelData
                                text: modelData.toUpperCase()
                                tone: "chip"
                                compact: true
                                active: root.projectPriorityDraft === modelData
                                onClicked: root.projectPriorityDraft = modelData
                            }
                        }
                    }
                }
            }

            Rectangle {
                visible: root.selectedProjectTasks.length > 0 && !root.compactReadMode
                Layout.fillWidth: true
                implicitHeight: 5
                radius: theme.radiusPill
                color: theme.studio800

                Rectangle {
                    width: parent.width * root.progressValue
                    height: parent.height
                    radius: parent.radius
                    color: theme.accentGreen
                }
            }

            ScrollView {
                id: detailScroll
                Layout.fillWidth: true
                Layout.preferredHeight: Math.min(
                                           detailContentLayout.implicitHeight + 12,
                                           root.largeWorkspace
                                           ? (root.compactReadMode ? 440 : 500)
                                           : 420
                                       )
                clip: true
                contentWidth: availableWidth

                ColumnLayout {
                    id: detailContentLayout
                    width: detailScroll.availableWidth
                    spacing: 12

                    Item {
                        Layout.fillWidth: true
                        implicitHeight: tasksSectionLayout.implicitHeight

                        ColumnLayout {
                            id: tasksSectionLayout
                            anchors.fill: parent
                            spacing: 10

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Label {
                                    text: "Tasks"
                                    color: theme.studio050
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textMd
                                    font.weight: Font.DemiBold
                                    Layout.fillWidth: true
                                }

                                ConsoleButton {
                                    objectName: "planning-detail-new-task-toggle"
                                    text: root.addTaskMode ? "Cancel" : "+ Add Task"
                                    tone: root.addTaskMode ? "secondary" : "ghost"
                                    compact: true
                                    dense: true
                                    onClicked: {
                                        root.addTaskMode = !root.addTaskMode
                                        if (!root.addTaskMode) {
                                            root.newTaskTitleDraft = ""
                                        }
                                    }
                                }
                            }

                            ConsoleSurface {
                                visible: root.addTaskMode
                                tone: "soft"
                                padding: 12
                                Layout.fillWidth: true
                                implicitHeight: addTaskComposerLayout.implicitHeight + 24

                                ColumnLayout {
                                    id: addTaskComposerLayout
                                    anchors.fill: parent
                                    spacing: 8

                                    ConsoleTextField {
                                        id: newTaskTitleField
                                        objectName: "planning-detail-new-task-field"
                                        Layout.fillWidth: true
                                        placeholderText: "New task for " + (root.selectedProject ? root.selectedProject.title : "project")
                                        onTextChanged: root.newTaskTitleDraft = text
                                        onAccepted: root.createTaskFromDraft()

                                        Binding {
                                            target: newTaskTitleField
                                            property: "text"
                                            value: root.newTaskTitleDraft
                                            when: !newTaskTitleField.activeFocus
                                        }
                                    }

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 8

                                        Item {
                                            Layout.fillWidth: true
                                        }

                                        ConsoleButton {
                                            objectName: "planning-detail-new-task-add"
                                            text: "Add Task"
                                            enabled: !!root.selectedProject && root.newTaskTitleDraft.trim().length > 0
                                            tone: "primary"
                                            compact: true
                                            dense: true
                                            onClicked: root.createTaskFromDraft()
                                        }
                                    }
                                }
                            }

                            Label {
                                visible: root.selectedProjectTasks.length === 0
                                text: "No tasks yet."
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textSm
                                font.italic: true
                                Layout.fillWidth: true
                            }

                            ColumnLayout {
                                visible: root.selectedProjectTasks.length > 0
                                Layout.fillWidth: true
                                spacing: 0

                                Repeater {
                                    model: root.selectedProjectTasks

                                    Item {
                                        id: taskCard
                                        required property var modelData
                                        property bool editing: root.editingTaskId === modelData.id
                                        Layout.fillWidth: true
                                        implicitHeight: taskCardLayout.implicitHeight + 8

                                        TapHandler {
                                            onTapped: engineController.selectPlanningTask(taskCard.modelData.id)
                                        }

                                        HoverHandler {
                                            id: taskCardHover
                                        }

                                        Rectangle {
                                            anchors.fill: parent
                                            radius: theme.radiusCard
                                            color: taskCard.editing
                                                   ? Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.94)
                                                   : "transparent"
                                            border.width: taskCard.editing ? 1 : 0
                                            border.color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.45)
                                        }

                                        ColumnLayout {
                                            id: taskCardLayout
                                            anchors.fill: parent
                                            anchors.margins: taskCard.editing ? 10 : 0
                                            spacing: 4

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                Rectangle {
                                                    width: 14
                                                    height: 14
                                                    radius: 4
                                                    color: taskCard.modelData.completed ? theme.accentGreen : "transparent"
                                                    border.width: 1
                                                    border.color: taskCard.modelData.completed ? theme.accentGreen : theme.studio600
                                                    Layout.alignment: Qt.AlignTop

                                                    TapHandler {
                                                        onTapped: engineController.togglePlanningTaskComplete(taskCard.modelData.id)
                                                    }

                                                    Label {
                                                        anchors.centerIn: parent
                                                        visible: taskCard.modelData.completed
                                                        text: "✓"
                                                        color: theme.studio950
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: 10
                                                        font.weight: Font.Bold
                                                    }
                                                }

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 3

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 6

                                                        Rectangle {
                                                            visible: taskCard.modelData.isRunning
                                                            width: 6
                                                            height: 6
                                                            radius: 3
                                                            color: theme.accentGreen
                                                            Layout.alignment: Qt.AlignVCenter
                                                        }

                                                        Label {
                                                            text: taskCard.modelData.title
                                                            color: taskCard.modelData.completed ? theme.studio500 : theme.studio100
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXs
                                                            font.weight: Font.Medium
                                                            font.strikeout: taskCard.modelData.completed
                                                            elide: Text.ElideRight
                                                            Layout.fillWidth: true
                                                        }

                                                        ConsoleBadge {
                                                            text: taskCard.modelData.priority.toUpperCase()
                                                            badgeColor: root.priorityBadgeColor(taskCard.modelData.priority)
                                                            textColor: root.priorityTextColor(taskCard.modelData.priority)
                                                            filled: taskCard.modelData.priority === "p0" || taskCard.modelData.priority === "p1"
                                                        }

                                                        Label {
                                                            visible: taskCard.modelData.checklist.length > 0
                                                            text: root.checklistDoneCount(taskCard.modelData.checklist) + "/" + taskCard.modelData.checklist.length
                                                            color: theme.studio500
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXxs
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8
                                                        visible: taskCard.modelData.description.length > 0
                                                                 || !!taskCard.modelData.dueDate
                                                                 || taskCard.modelData.totalSeconds > 0
                                                                 || taskCard.modelData.isRunning

                                                        Label {
                                                            visible: taskCard.modelData.description.length > 0
                                                            text: taskCard.modelData.description
                                                            color: theme.studio400
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXxs
                                                            elide: Text.ElideRight
                                                            Layout.fillWidth: true
                                                        }

                                                        Label {
                                                            visible: !!taskCard.modelData.dueDate
                                                            text: root.dueDateLabel(taskCard.modelData.dueDate)
                                                            color: root.dueDateColor(taskCard.modelData.dueDate)
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXxs
                                                        }
                                                    }

                                                    Flow {
                                                        visible: taskCard.modelData.labels && taskCard.modelData.labels.length > 0
                                                        Layout.fillWidth: true
                                                        spacing: 3

                                                        Repeater {
                                                            model: taskCard.modelData.labels || []

                                                            Rectangle {
                                                                required property string modelData
                                                                radius: theme.radiusPill
                                                                color: theme.studio800
                                                                border.color: theme.surfaceBorder
                                                                border.width: 1
                                                                implicitHeight: 16
                                                                implicitWidth: labelBadge.implicitWidth + 8

                                                                Label {
                                                                    id: labelBadge
                                                                    anchors.centerIn: parent
                                                                    text: modelData
                                                                    color: theme.studio400
                                                                    font.family: theme.uiFontFamily
                                                                    font.pixelSize: 9
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: taskCard.modelData.totalSeconds > 0 || taskCard.modelData.isRunning
                                                    text: root.formatTaskTimer(taskCard.modelData.totalSeconds)
                                                    color: taskCard.modelData.isRunning ? theme.accentGreen : theme.studio500
                                                    font.family: theme.monoFontFamily
                                                    font.pixelSize: theme.textXxs
                                                    Layout.alignment: Qt.AlignTop
                                                }

                                                ConsoleButton {
                                                    objectName: "planning-task-edit-" + taskCard.modelData.id
                                                    text: taskCard.editing ? "Cancel" : ""
                                                    iconText: taskCard.editing ? "" : "\u270e"
                                                    visible: taskCard.editing || taskCardHover.hovered
                                                    tone: taskCard.editing ? "secondary" : "icon"
                                                    compact: true
                                                    dense: true
                                                    Layout.alignment: Qt.AlignTop
                                                    ToolTip.visible: hovered && !taskCard.editing
                                                    ToolTip.text: "Edit task"
                                                    onClicked: {
                                                        if (taskCard.editing) {
                                                            root.cancelTaskEdit()
                                                        } else {
                                                            root.startTaskEdit(taskCard.modelData)
                                                        }
                                                    }
                                                }
                                            }

                                            ConsoleSurface {
                                                visible: taskCard.editing
                                                tone: "default"
                                                padding: 12
                                                Layout.fillWidth: true
                                                implicitHeight: taskEditLayout.implicitHeight + 24

                                                ColumnLayout {
                                                    id: taskEditLayout
                                                    anchors.fill: parent
                                                    spacing: 8

                                                    ConsoleTextField {
                                                        id: taskTitleField
                                                        objectName: "planning-task-title-field-" + taskCard.modelData.id
                                                        Layout.fillWidth: true
                                                        placeholderText: "Task title"
                                                        onTextChanged: root.taskTitleDraft = text

                                                        Binding {
                                                            target: taskTitleField
                                                            property: "text"
                                                            value: root.taskTitleDraft
                                                            when: taskCard.editing && !taskTitleField.activeFocus
                                                        }
                                                    }

                                                    ConsoleTextArea {
                                                        id: taskDescriptionField
                                                        objectName: "planning-task-description-field-" + taskCard.modelData.id
                                                        Layout.fillWidth: true
                                                        Layout.preferredHeight: 68
                                                        placeholderText: "Task description"
                                                        wrapMode: TextEdit.Wrap
                                                        onTextChanged: root.taskDescriptionDraft = text

                                                        Binding {
                                                            target: taskDescriptionField
                                                            property: "text"
                                                            value: root.taskDescriptionDraft
                                                            when: taskCard.editing && !taskDescriptionField.activeFocus
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Label {
                                                            text: "Priority"
                                                            color: theme.studio400
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXs
                                                        }

                                                        Repeater {
                                                            model: ["p0", "p1", "p2", "p3"]

                                                            ConsoleButton {
                                                                required property string modelData
                                                                objectName: "planning-task-priority-" + taskCard.modelData.id + "-" + modelData
                                                                text: modelData.toUpperCase()
                                                                tone: "chip"
                                                                compact: true
                                                                active: root.taskPriorityDraft === modelData
                                                                onClicked: root.taskPriorityDraft = modelData
                                                            }
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        ConsoleTextField {
                                                            id: taskDueDateField
                                                            objectName: "planning-task-due-date-field-" + taskCard.modelData.id
                                                            Layout.fillWidth: true
                                                            placeholderText: "Due date YYYY-MM-DD"
                                                            onTextChanged: root.taskDueDateDraft = text

                                                            Binding {
                                                                target: taskDueDateField
                                                                property: "text"
                                                                value: root.taskDueDateDraft
                                                                when: taskCard.editing && !taskDueDateField.activeFocus
                                                            }
                                                        }

                                                        ConsoleTextField {
                                                            id: taskLabelsField
                                                            objectName: "planning-task-labels-field-" + taskCard.modelData.id
                                                            Layout.fillWidth: true
                                                            placeholderText: "Labels: frontend, urgent"
                                                            onTextChanged: root.taskLabelsDraft = text

                                                            Binding {
                                                                target: taskLabelsField
                                                                property: "text"
                                                                value: root.taskLabelsDraft
                                                                when: taskCard.editing && !taskLabelsField.activeFocus
                                                            }
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        ConsoleButton {
                                                            objectName: "planning-task-save-" + taskCard.modelData.id
                                                            text: "Save Task"
                                                            enabled: root.taskTitleDraft.trim().length > 0 && root.taskDraftDirty(taskCard.modelData)
                                                            tone: "primary"
                                                            compact: true
                                                            onClicked: root.saveTaskEdit(taskCard.modelData)
                                                        }

                                                        ConsoleButton {
                                                            text: "Cancel"
                                                            tone: "secondary"
                                                            compact: true
                                                            onClicked: root.cancelTaskEdit()
                                                        }

                                                        Item {
                                                            Layout.fillWidth: true
                                                        }

                                                        ConsoleButton {
                                                            objectName: "planning-task-delete-" + taskCard.modelData.id
                                                            text: "Delete"
                                                            tone: "danger"
                                                            compact: true
                                                            onClicked: {
                                                                if (root.editingTaskId === taskCard.modelData.id) {
                                                                    root.cancelTaskEdit()
                                                                }
                                                                engineController.deletePlanningTask(taskCard.modelData.id)
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                Layout.leftMargin: 26
                                                spacing: 3

                                                Repeater {
                                                    model: taskCard.modelData.checklist

                                                    RowLayout {
                                                        required property var modelData
                                                        Layout.fillWidth: true
                                                        spacing: 6

                                                        Rectangle {
                                                            width: 12
                                                            height: 12
                                                            radius: 3
                                                            color: modelData.done ? theme.accentGreen : "transparent"
                                                            border.width: 1
                                                            border.color: modelData.done ? theme.accentGreen : theme.studio600

                                                            TapHandler {
                                                                onTapped: engineController.setPlanningChecklistItemDone(
                                                                               taskCard.modelData.id,
                                                                               modelData.id,
                                                                               !modelData.done
                                                                           )
                                                            }

                                                            Label {
                                                                anchors.centerIn: parent
                                                                visible: modelData.done
                                                                text: "✓"
                                                                color: theme.studio950
                                                                font.family: theme.uiFontFamily
                                                                font.pixelSize: 10
                                                                font.weight: Font.Bold
                                                            }
                                                        }

                                                        Label {
                                                            text: modelData.text
                                                            color: modelData.done ? theme.studio500 : theme.studio300
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXxs
                                                            font.strikeout: modelData.done
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        ConsoleButton {
                                                            objectName: "planning-checklist-delete-" + taskCard.modelData.id + "-" + modelData.id
                                                            text: "Remove"
                                                            visible: taskCard.editing
                                                            tone: "ghost"
                                                            compact: true
                                                            onClicked: engineController.deletePlanningChecklistItem(
                                                                           taskCard.modelData.id,
                                                                           modelData.id
                                                                       )
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 6

                                                    ConsoleTextField {
                                                        id: checklistField
                                                        objectName: "planning-checklist-field-" + taskCard.modelData.id
                                                        Layout.fillWidth: true
                                                        dense: true
                                                        tone: "inline"
                                                        placeholderText: "+ Add checklist item"
                                                        onTextEdited: root.setChecklistDraft(taskCard.modelData.id, text)
                                                        onAccepted: root.addChecklistItem(taskCard.modelData.id)

                                                        Binding {
                                                            target: checklistField
                                                            property: "text"
                                                            value: root.checklistDraft(taskCard.modelData.id)
                                                            when: !checklistField.activeFocus
                                                        }
                                                    }

                                                    ConsoleButton {
                                                        objectName: "planning-checklist-add-" + taskCard.modelData.id
                                                        text: "Add"
                                                        enabled: root.checklistDraft(taskCard.modelData.id).trim().length > 0
                                                        visible: root.checklistDraft(taskCard.modelData.id).trim().length > 0
                                                        tone: "primary"
                                                        compact: true
                                                        onClicked: root.addChecklistItem(taskCard.modelData.id)
                                                    }
                                                }
                                            }

                                            Rectangle {
                                                visible: root.selectedProjectTasks.length > 0
                                                         && taskCard.modelData.id !== root.selectedProjectTasks[root.selectedProjectTasks.length - 1].id
                                                         && !taskCard.editing
                                                Layout.fillWidth: true
                                                implicitHeight: 1
                                                color: theme.surfaceBorder
                                                opacity: 0.65
                                            }
                                        }
                                    }
                                }
                            }

                            Label {
                                visible: root.checklistTotals.total > 0
                                text: root.checklistTotals.done + "/" + root.checklistTotals.total + " checklist items done"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXxs
                            }
                        }
                    }

                    Rectangle {
                        visible: root.activityItems.length > 0
                        Layout.fillWidth: true
                        implicitHeight: 1
                        color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.7)
                    }

                    Item {
                        visible: root.activityItems.length > 0
                        Layout.fillWidth: true
                        implicitHeight: activityLayout.implicitHeight

                        ColumnLayout {
                            id: activityLayout
                            anchors.fill: parent
                            spacing: 6

                            Label {
                                text: "Activity"
                                color: theme.studio050
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textMd
                                font.weight: Font.DemiBold
                            }

                            Repeater {
                                model: root.activityItems.slice(0, 12)

                                Item {
                                    required property var modelData
                                    Layout.fillWidth: true
                                    implicitHeight: activityEntryLayout.implicitHeight + 8

                                    ColumnLayout {
                                        id: activityEntryLayout
                                        anchors.fill: parent
                                        spacing: 2

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Rectangle {
                                                width: 6
                                                height: 6
                                                radius: 3
                                                color: theme.studio600
                                                Layout.alignment: Qt.AlignTop
                                            }

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 2

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 6

                                                    Label {
                                                        text: root.relativeTimestamp(modelData.timestamp)
                                                        color: theme.studio500
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: theme.textXxs
                                                        Layout.preferredWidth: 56
                                                        Layout.alignment: Qt.AlignTop
                                                    }
                                                }

                                                Label {
                                                    text: modelData.detail
                                                    color: theme.studio400
                                                    font.family: theme.uiFontFamily
                                                    font.pixelSize: theme.textXs
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }
                                        }

                                        Rectangle {
                                            visible: root.activityItems.length > 0
                                                     && modelData.id !== root.activityItems[Math.min(root.activityItems.length, 12) - 1].id
                                            Layout.fillWidth: true
                                            implicitHeight: 1
                                            color: theme.surfaceBorder
                                            opacity: 0.65
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
