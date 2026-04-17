import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQml

Item {
    id: root
    objectName: "planning-project-detail-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open

    property var selectedProject: rootWindow.projectById(engineController.planningSelectedProjectId)
    property var selectedProjectTasks: selectedProject ? rootWindow.tasksForProject(selectedProject.id) : []
    property var checklistTotals: selectedProject ? rootWindow.checklistTotalsForProject(selectedProject.id) : ({ "done": 0, "total": 0 })
    property int completedTaskCount: selectedProject ? rootWindow.completedTaskCountForProject(selectedProject.id) : 0
    property int totalProjectSeconds: selectedProject ? rootWindow.totalSecondsForProject(selectedProject.id) : 0
    property real progressValue: selectedProject ? rootWindow.progressForProject(selectedProject.id) : 0
    property var activityItems: selectedProject ? rootWindow.activityForProject(selectedProject.id) : []
    property string newTaskTitleDraft: ""
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

    anchors.fill: parent
    visible: open && selectedProject !== null
    z: 40

    onSelectedProjectChanged: {
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
            projectEditMode = false
            editingTaskId = ""
            resetTaskDrafts(null)
            checklistDrafts = ({})
            newTaskTitleDraft = ""
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#050913"
        opacity: 0.78

        TapHandler {
            onTapped: rootWindow.planningProjectDetailVisible = false
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 56, 980)
        height: Math.min(parent.height - 72, 720)
        radius: 18
        color: "#101826"
        border.color: "#35506b"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Label {
                            text: root.selectedProject ? root.selectedProject.title : ""
                            color: "#f5f7fb"
                            font.pixelSize: 22
                            font.weight: Font.DemiBold
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        Rectangle {
                            radius: 999
                            color: "#13263c"
                            border.color: "#355d93"
                            border.width: 1
                            implicitHeight: 28
                            implicitWidth: priorityBadgeLabel.implicitWidth + 18

                            Label {
                                id: priorityBadgeLabel
                                anchors.centerIn: parent
                                text: root.selectedProject ? root.selectedProject.priority.toUpperCase() : ""
                                color: "#9bc4ff"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }
                        }

                        Rectangle {
                            radius: 999
                            color: root.selectedProject && root.selectedProject.status === "done"
                                   ? "#163a2c"
                                   : root.selectedProject && root.selectedProject.status === "blocked"
                                     ? "#3c1d22"
                                     : root.selectedProject && root.selectedProject.status === "in-progress"
                                       ? "#13263c"
                                       : "#18212e"
                            border.color: root.selectedProject && root.selectedProject.status === "done"
                                          ? "#2ba36a"
                                          : root.selectedProject && root.selectedProject.status === "blocked"
                                            ? "#9f4f5c"
                                            : root.selectedProject && root.selectedProject.status === "in-progress"
                                              ? "#4da0ff"
                                              : "#3e536d"
                            border.width: 1
                            implicitHeight: 28
                            implicitWidth: statusBadgeLabel.implicitWidth + 18

                            Label {
                                id: statusBadgeLabel
                                anchors.centerIn: parent
                                text: root.selectedProject ? rootWindow.formatEnumLabel(root.selectedProject.status) : ""
                                color: root.selectedProject && root.selectedProject.status === "done"
                                       ? "#d7ffea"
                                       : root.selectedProject && root.selectedProject.status === "blocked"
                                         ? "#ffd2da"
                                         : root.selectedProject && root.selectedProject.status === "in-progress"
                                           ? "#dcecff"
                                           : "#d6dce5"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }
                        }
                    }

                    Label {
                        visible: root.selectedProject && root.selectedProject.description.length > 0
                                 && !root.projectEditMode
                        text: root.selectedProject ? root.selectedProject.description : ""
                        color: "#b4c0cf"
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }

                RowLayout {
                    spacing: 8

                    Button {
                        objectName: "planning-project-edit-toggle"
                        text: root.projectEditMode ? "Cancel" : "Edit Project"
                        enabled: !!root.selectedProject
                        onClicked: {
                            if (root.projectEditMode) {
                                root.cancelProjectEdit()
                            } else {
                                root.startProjectEdit()
                            }
                        }
                    }

                    Button {
                        objectName: "planning-project-save"
                        text: "Save Project"
                        visible: root.projectEditMode
                        enabled: root.selectedProject && root.projectTitleDraft.trim().length > 0 && root.projectDraftDirty()
                        onClicked: root.saveProjectEdit()
                    }

                    Button {
                        objectName: "planning-project-delete"
                        text: "Delete Project"
                        enabled: !!root.selectedProject
                        onClicked: {
                            if (!root.selectedProject) {
                                return
                            }

                            const projectId = root.selectedProject.id
                            rootWindow.planningProjectDetailVisible = false
                            engineController.deletePlanningProject(projectId)
                        }
                    }

                    Button {
                        objectName: "planning-project-close"
                        text: "Close"
                        onClicked: rootWindow.planningProjectDetailVisible = false
                    }
                }
            }

            Rectangle {
                visible: root.projectEditMode
                radius: 12
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                implicitHeight: projectEditLayout.implicitHeight + 24

                ColumnLayout {
                    id: projectEditLayout
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    Label {
                        text: "Project Details"
                        color: "#f5f7fb"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                    }

                    TextField {
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

                    TextArea {
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
                            color: "#8ea4c0"
                            font.pixelSize: 12
                        }

                        Repeater {
                            model: ["p0", "p1", "p2", "p3"]

                            Button {
                                required property string modelData
                                objectName: "planning-project-priority-" + modelData
                                text: modelData.toUpperCase()
                                highlighted: root.projectPriorityDraft === modelData
                                onClicked: root.projectPriorityDraft = modelData
                            }
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: [
                        {
                            "label": "Tasks",
                            "value": root.selectedProjectTasks.length > 0
                                     ? root.completedTaskCount + "/" + root.selectedProjectTasks.length
                                     : "0"
                        },
                        { "label": "Tracked", "value": rootWindow.formatSeconds(root.totalProjectSeconds) },
                        {
                            "label": "Checklist",
                            "value": root.checklistTotals.total > 0
                                     ? root.checklistTotals.done + "/" + root.checklistTotals.total
                                     : "0"
                        }
                    ]

                    Rectangle {
                        required property var modelData
                        radius: 999
                        color: "#0c1320"
                        border.color: "#24344a"
                        border.width: 1
                        implicitHeight: 32
                        implicitWidth: detailBadgeLabel.implicitWidth + detailBadgeValue.implicitWidth + 28

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            spacing: 6

                            Label {
                                id: detailBadgeLabel
                                text: modelData.label
                                color: "#8ea4c0"
                                font.pixelSize: 11
                            }

                            Label {
                                id: detailBadgeValue
                                text: modelData.value
                                color: "#f5f7fb"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }
                        }
                    }
                }
            }

            Rectangle {
                visible: root.selectedProjectTasks.length > 0
                Layout.fillWidth: true
                implicitHeight: 8
                radius: 999
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1

                Rectangle {
                    width: parent.width * root.progressValue
                    height: parent.height
                    radius: parent.radius
                    color: "#2ba36a"
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: newTaskTitleField
                    objectName: "planning-detail-new-task-field"
                    Layout.fillWidth: true
                    placeholderText: "New task for " + (root.selectedProject ? root.selectedProject.title : "project")
                    onTextChanged: root.newTaskTitleDraft = text
                    onAccepted: {
                        const title = text.trim()
                        if (!root.selectedProject || title.length === 0) {
                            return
                        }

                        engineController.createPlanningTask(root.selectedProject.id, title)
                        root.newTaskTitleDraft = ""
                    }

                    Binding {
                        target: newTaskTitleField
                        property: "text"
                        value: root.newTaskTitleDraft
                        when: !newTaskTitleField.activeFocus
                    }
                }

                Button {
                    objectName: "planning-detail-new-task-add"
                    text: "Add Task"
                    enabled: root.selectedProject && root.newTaskTitleDraft.trim().length > 0
                    onClicked: {
                        const title = root.newTaskTitleDraft.trim()
                        if (!root.selectedProject || title.length === 0) {
                            return
                        }

                        engineController.createPlanningTask(root.selectedProject.id, title)
                        root.newTaskTitleDraft = ""
                    }
                }
            }

            GridLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                columns: rootWindow.width >= 1240 ? 2 : 1
                columnSpacing: 12
                rowSpacing: 12

                Rectangle {
                    radius: 12
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    Layout.fillHeight: true

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 8

                        Label {
                            text: "Tasks"
                            color: "#f5f7fb"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: root.selectedProjectTasks.length === 0
                            text: "No tasks exist for this project yet."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: root.selectedProjectTasks.length > 0
                            contentWidth: availableWidth

                            ColumnLayout {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: root.selectedProjectTasks

                                    Rectangle {
                                        id: taskCard
                                        required property var modelData
                                        property bool editing: root.editingTaskId === modelData.id
                                        radius: 10
                                        color: rootWindow.isSelectedTask(modelData.id) ? "#143152" : "#101826"
                                        border.color: rootWindow.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: taskLayout.implicitHeight + 20

                                        TapHandler {
                                            onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                        }

                                        ColumnLayout {
                                            id: taskLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

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
                                                    objectName: "planning-task-edit-" + modelData.id
                                                    text: taskCard.editing ? "Cancel" : "Edit"
                                                    onClicked: {
                                                        if (taskCard.editing) {
                                                            root.cancelTaskEdit()
                                                        } else {
                                                            root.startTaskEdit(modelData)
                                                        }
                                                    }
                                                }

                                                Button {
                                                    objectName: "planning-task-delete-" + modelData.id
                                                    text: "Delete"
                                                    onClicked: {
                                                        if (root.editingTaskId === modelData.id) {
                                                            root.cancelTaskEdit()
                                                        }
                                                        engineController.deletePlanningTask(modelData.id)
                                                    }
                                                }

                                                Button {
                                                    text: modelData.completed ? "Reopen" : "Complete"
                                                    onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                }
                                            }

                                            ColumnLayout {
                                                visible: taskCard.editing
                                                Layout.fillWidth: true
                                                spacing: 8

                                                TextField {
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

                                                TextArea {
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
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 12
                                                    }

                                                    Repeater {
                                                        model: ["p0", "p1", "p2", "p3"]

                                                        Button {
                                                            required property string modelData
                                                            objectName: "planning-task-priority-" + taskCard.modelData.id + "-" + modelData
                                                            text: modelData.toUpperCase()
                                                            highlighted: root.taskPriorityDraft === modelData
                                                            onClicked: root.taskPriorityDraft = modelData
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    TextField {
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

                                                    TextField {
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

                                                    Button {
                                                        objectName: "planning-task-save-" + taskCard.modelData.id
                                                        text: "Save Task"
                                                        enabled: root.taskTitleDraft.trim().length > 0 && root.taskDraftDirty(taskCard.modelData)
                                                        onClicked: root.saveTaskEdit(taskCard.modelData)
                                                    }

                                                    Button {
                                                        text: "Cancel"
                                                        onClicked: root.cancelTaskEdit()
                                                    }
                                                }
                                            }

                                            ColumnLayout {
                                                visible: !taskCard.editing
                                                Layout.fillWidth: true
                                                spacing: 6

                                                Label {
                                                    text: rootWindow.taskStateLabel(modelData)
                                                          + " | "
                                                          + modelData.priority.toUpperCase()
                                                          + (modelData.dueDate ? " | " + rootWindow.formatDueDate(modelData.dueDate) : "")
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

                                                Label {
                                                    visible: modelData.labels && modelData.labels.length > 0
                                                    text: root.labelsText(modelData.labels)
                                                    color: "#9bb0c9"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 8

                                                Label {
                                                    text: rootWindow.checklistProgress(modelData.checklist)
                                                          + " | "
                                                          + rootWindow.formatSeconds(modelData.totalSeconds)
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Button {
                                                    text: modelData.isRunning ? "Stop Timer" : "Start Timer"
                                                    onClicked: engineController.togglePlanningTaskTimer(modelData.id)
                                                }
                                            }

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 4

                                                Repeater {
                                                    model: modelData.checklist

                                                    RowLayout {
                                                        required property var modelData
                                                        Layout.fillWidth: true
                                                        spacing: 8

                                                        Button {
                                                            text: modelData.done ? "Done" : "Open"
                                                            highlighted: modelData.done
                                                            onClicked: engineController.setPlanningChecklistItemDone(
                                                                           taskCard.modelData.id,
                                                                           modelData.id,
                                                                           !modelData.done
                                                                       )
                                                        }

                                                        Label {
                                                            text: modelData.text
                                                            color: modelData.done ? "#8ea4c0" : "#f5f7fb"
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }

                                                        Button {
                                                            objectName: "planning-checklist-delete-" + taskCard.modelData.id + "-" + modelData.id
                                                            text: "Remove"
                                                            onClicked: engineController.deletePlanningChecklistItem(
                                                                           taskCard.modelData.id,
                                                                           modelData.id
                                                                       )
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    TextField {
                                                        id: checklistField
                                                        objectName: "planning-checklist-field-" + taskCard.modelData.id
                                                        Layout.fillWidth: true
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

                                                    Button {
                                                        objectName: "planning-checklist-add-" + taskCard.modelData.id
                                                        text: "Add"
                                                        enabled: root.checklistDraft(taskCard.modelData.id).trim().length > 0
                                                        onClicked: root.addChecklistItem(taskCard.modelData.id)
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
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    Layout.fillHeight: true

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 8

                        Label {
                            text: "Activity"
                            color: "#f5f7fb"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: root.activityItems.length === 0
                            text: "No matching activity entries found yet."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: root.activityItems.length > 0
                            contentWidth: availableWidth

                            ColumnLayout {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: root.activityItems.slice(0, 12)

                                    Rectangle {
                                        required property var modelData
                                        radius: 10
                                        color: "#101826"
                                        border.color: "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: activityLayout.implicitHeight + 20

                                        ColumnLayout {
                                            id: activityLayout
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 4

                                            Label {
                                                text: rootWindow.activitySummary(modelData)
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
                                                text: rootWindow.formatTimestamp(modelData.timestamp)
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
        }
    }
}
