import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "OperatorParityHelpers.js" as OperatorParityHelpers

Rectangle {
    id: root
    required property var rootWindow
    required property var engineController
    signal openProjectDetail(string projectId)
    property var newTaskDrafts: ({})
    property bool projectDragActive: false
    property string draggedProjectId: ""
    property string draggedProjectStatus: ""
    property int draggedProjectIndex: -1
    property string draggedProjectTitle: ""
    property string draggedProjectPriority: ""
    property real draggedProjectBaseX: 0
    property real draggedProjectBaseY: 0
    property real draggedProjectWidth: 0
    property real draggedProjectHeight: 0
    property real draggedProjectHotSpotX: 0
    property real draggedProjectHotSpotY: 0
    property string draggedDropStatus: ""
    property int draggedDropIndex: -1
    property var activeProjectDragHandler: null

    function beginProjectDrag(project, projectStatus, projectIndex, card, handler) {
        if (!project || !card || !handler) {
            return
        }

        const cardOrigin = card.mapToItem(root, 0, 0)
        const hotSpot = card.mapToItem(root, handler.centroid.position.x, handler.centroid.position.y)

        projectDragActive = true
        draggedProjectId = project.id
        draggedProjectStatus = projectStatus
        draggedProjectIndex = projectIndex
        draggedProjectTitle = project.title || ""
        draggedProjectPriority = project.priority || ""
        draggedProjectBaseX = cardOrigin.x
        draggedProjectBaseY = cardOrigin.y
        draggedProjectWidth = card.width
        draggedProjectHeight = card.height
        draggedProjectHotSpotX = hotSpot.x - cardOrigin.x
        draggedProjectHotSpotY = hotSpot.y - cardOrigin.y
        draggedDropStatus = projectStatus
        draggedDropIndex = projectIndex
        activeProjectDragHandler = handler
        engineController.selectPlanningProject(project.id)
    }

    function dropIndexForSlot(status, slotIndex) {
        return OperatorParityHelpers.planningDropIndexForSlot(
            draggedProjectStatus,
            draggedProjectIndex,
            status,
            slotIndex
        )
    }

    function previewProjectDrop(status, slotIndex) {
        const index = dropIndexForSlot(status, slotIndex)
        if (!projectDragActive || !status || index < 0) {
            return
        }

        draggedDropStatus = status
        draggedDropIndex = index
    }

    function dropSlotVisible(status, slotIndex, projectId) {
        if (!projectDragActive) {
            return false
        }

        return !(status === draggedProjectStatus && slotIndex === draggedProjectIndex && projectId === draggedProjectId)
    }

    function finishProjectDrag() {
        if (projectDragActive
                && draggedProjectId.length > 0
                && draggedDropStatus.length > 0
                && draggedDropIndex >= 0
                && (draggedDropStatus !== draggedProjectStatus || draggedDropIndex !== draggedProjectIndex)) {
            engineController.reorderPlanningProject(draggedProjectId, draggedDropStatus, draggedDropIndex)
        }

        projectDragActive = false
        draggedProjectId = ""
        draggedProjectStatus = ""
        draggedProjectIndex = -1
        draggedProjectTitle = ""
        draggedProjectPriority = ""
        draggedProjectBaseX = 0
        draggedProjectBaseY = 0
        draggedProjectWidth = 0
        draggedProjectHeight = 0
        draggedProjectHotSpotX = 0
        draggedProjectHotSpotY = 0
        draggedDropStatus = ""
        draggedDropIndex = -1
        activeProjectDragHandler = null
    }

    function dropSlotActive(status, index) {
        return projectDragActive && draggedDropStatus === status && draggedDropIndex === index
    }

    function taskDraft(projectId) {
        if (!projectId || !newTaskDrafts[projectId]) {
            return ""
        }

        return newTaskDrafts[projectId]
    }

    function setTaskDraft(projectId, value) {
        const nextDrafts = Object.assign({}, newTaskDrafts)
        if (!value || value.trim().length === 0) {
            delete nextDrafts[projectId]
        } else {
            nextDrafts[projectId] = value
        }
        newTaskDrafts = nextDrafts
    }

    visible: engineController.workspaceMode === "planning"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: planningBoardLayout.implicitHeight + 24

    Rectangle {
        id: projectDragProxy
        property string projectId: root.draggedProjectId
        property string projectStatus: root.draggedProjectStatus
        property int projectIndex: root.draggedProjectIndex
        z: 40
        radius: 10
        color: "#17304d"
        border.color: "#6baeff"
        border.width: 1
        opacity: 0.96
        width: root.draggedProjectWidth
        height: root.draggedProjectHeight
        x: root.draggedProjectBaseX + (root.activeProjectDragHandler ? root.activeProjectDragHandler.activeTranslation.x : 0)
        y: root.draggedProjectBaseY + (root.activeProjectDragHandler ? root.activeProjectDragHandler.activeTranslation.y : 0)
        visible: root.projectDragActive && width > 0 && height > 0

        Drag.active: visible
        Drag.source: projectDragProxy
        Drag.keys: ["planning-project-card"]
        Drag.supportedActions: Qt.MoveAction
        Drag.hotSpot.x: root.draggedProjectHotSpotX
        Drag.hotSpot.y: root.draggedProjectHotSpotY

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 10
            spacing: 6

            Label {
                text: root.draggedProjectTitle
                color: "#f5f7fb"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Label {
                text: root.draggedProjectPriority.toUpperCase() + " | " + rootWindow.formatEnumLabel(root.draggedProjectStatus)
                color: "#b6c8de"
                font.pixelSize: 11
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }
    }

    ColumnLayout {
        id: planningBoardLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        Label {
            text: "Planning Board"
            color: "#f5f7fb"
            font.pixelSize: 14
            font.weight: Font.DemiBold
        }

        GridLayout {
            Layout.fillWidth: true
            columns: rootWindow.width >= 1400 ? 4 : 2
            columnSpacing: 12
            rowSpacing: 12

            Repeater {
                model: [
                    { "id": "todo", "name": "To Do" },
                    { "id": "in-progress", "name": "In Progress" },
                    { "id": "blocked", "name": "Blocked" },
                    { "id": "done", "name": "Done" }
                ]

                Rectangle {
                    required property var modelData
                    property var projects: rootWindow.filteredPlanningProjectsForStatus(modelData.id)
                    radius: 10
                    color: "#0c1320"
                    border.color: root.projectDragActive && root.draggedDropStatus === modelData.id ? "#4da0ff" : "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: 260

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        RowLayout {
                            Layout.fillWidth: true

                            Label {
                                text: modelData.name
                                color: "#f5f7fb"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                            }

                            Item { Layout.fillWidth: true }

                            Label {
                                text: projects.length
                                color: "#8ea4c0"
                                font.pixelSize: 11
                            }
                        }

                        Label {
                            visible: projects.length === 0 && !root.projectDragActive
                            text: "No projects in this column."
                            color: "#8ea4c0"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ScrollView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            clip: true
                            visible: projects.length > 0 || root.projectDragActive

                            Column {
                                width: parent.width
                                spacing: 8

                                Repeater {
                                    model: projects.length + 1

                                    Item {
                                        required property int index
                                        property var project: index < projects.length ? projects[index] : null
                                        width: parent.width
                                        implicitHeight: dropSlot.implicitHeight
                                                        + (projectCard.visible ? projectCard.height + (projectCard.height > 0 ? 8 : 0) : 0)

                                        Rectangle {
                                            id: dropSlot
                                            width: parent.width
                                            implicitHeight: root.projectDragActive ? 18 : 0
                                            visible: root.dropSlotVisible(modelData.id, index, project ? project.id : "")
                                            radius: 8
                                            color: root.dropSlotActive(modelData.id, root.dropIndexForSlot(modelData.id, index)) ? "#1c3d62" : "#0a1220"
                                            border.color: root.dropSlotActive(modelData.id, root.dropIndexForSlot(modelData.id, index)) ? "#6baeff" : "#24344a"
                                            border.width: 1
                                            opacity: visible ? 1 : 0

                                            DropArea {
                                                anchors.fill: parent
                                                keys: ["planning-project-card"]
                                                onEntered: root.previewProjectDrop(modelData.id, index)
                                                onPositionChanged: root.previewProjectDrop(modelData.id, index)
                                            }

                                            Label {
                                                anchors.centerIn: parent
                                                visible: root.dropSlotActive(modelData.id, root.dropIndexForSlot(modelData.id, index))
                                                text: "Drop Here"
                                                color: "#dcecff"
                                                font.pixelSize: 10
                                                font.weight: Font.DemiBold
                                            }
                                        }

                                        Rectangle {
                                            id: projectCard
                                            visible: project !== null
                                            anchors.top: dropSlot.bottom
                                            anchors.topMargin: project !== null ? 8 : 0
                                            width: parent.width
                                            height: isDraggedProject ? 0 : implicitHeight
                                            clip: true
                                            property var projectTasks: project ? rootWindow.tasksForProject(project.id) : []
                                            property var previewTasks: projectTasks.slice(0, 3)
                                            property bool isDraggedProject: root.projectDragActive && root.draggedProjectId === (project ? project.id : "")
                                            radius: 10
                                            color: project && rootWindow.isSelectedProject(project.id) ? "#143152" : "#101826"
                                            border.color: project && rootWindow.isSelectedProject(project.id) ? "#4da0ff" : "#24344a"
                                            border.width: isDraggedProject ? 0 : 1
                                            opacity: isDraggedProject ? 0 : 1
                                            implicitHeight: projectCardLayout.implicitHeight + 20

                                            TapHandler {
                                                enabled: project !== null
                                                onTapped: engineController.selectPlanningProject(project.id)
                                            }

                                            DragHandler {
                                                id: projectCardDragHandler
                                                enabled: project !== null
                                                target: null
                                                acceptedButtons: Qt.LeftButton
                                                cursorShape: active ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                                                onActiveChanged: {
                                                    if (!project) {
                                                        return
                                                    }

                                                    if (active) {
                                                        root.beginProjectDrag(project, modelData.id, index, projectCard, projectCardDragHandler)
                                                    } else if (root.activeProjectDragHandler === projectCardDragHandler) {
                                                        root.finishProjectDrag()
                                                    }
                                                }
                                            }

                                            ColumnLayout {
                                                id: projectCardLayout
                                                anchors.fill: parent
                                                anchors.margins: 10
                                                spacing: 6

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    Label {
                                                        text: project ? project.title : ""
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true

                                                        TapHandler {
                                                            enabled: project !== null
                                                            onTapped: {
                                                                engineController.selectPlanningProject(project.id)
                                                                openProjectDetail(project.id)
                                                            }
                                                        }
                                                    }

                                                    Rectangle {
                                                        radius: 999
                                                        color: "#0c1320"
                                                        border.color: "#24344a"
                                                        border.width: 1
                                                        implicitHeight: 24
                                                        implicitWidth: dragBadgeLabel.implicitWidth + 16

                                                        Label {
                                                            id: dragBadgeLabel
                                                            anchors.centerIn: parent
                                                            text: "DRAG"
                                                            color: "#8ea4c0"
                                                            font.pixelSize: 10
                                                            font.weight: Font.DemiBold
                                                            font.family: "monospace"
                                                        }
                                                    }
                                                }

                                                Label {
                                                    text: (project ? project.priority.toUpperCase() : "")
                                                          + " | "
                                                          + projectCard.projectTasks.length
                                                          + " tasks | "
                                                          + rootWindow.formatSeconds(project ? rootWindow.totalSecondsForProject(project.id) : 0)
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                Label {
                                                    visible: project && project.description.length > 0
                                                    text: project ? project.description : ""
                                                    color: "#b4c0cf"
                                                    font.pixelSize: 11
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                ColumnLayout {
                                                    visible: projectCard.previewTasks.length > 0
                                                    Layout.fillWidth: true
                                                    spacing: 4

                                                    Repeater {
                                                        model: projectCard.previewTasks

                                                        Rectangle {
                                                            required property var modelData
                                                            radius: 8
                                                            color: rootWindow.isSelectedTask(modelData.id) ? "#17304d" : "#0c1320"
                                                            border.color: rootWindow.isSelectedTask(modelData.id) ? "#4da0ff" : "#24344a"
                                                            border.width: 1
                                                            Layout.fillWidth: true
                                                            implicitHeight: taskPreviewLayout.implicitHeight + 14

                                                            TapHandler {
                                                                onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                                            }

                                                            ColumnLayout {
                                                                id: taskPreviewLayout
                                                                anchors.fill: parent
                                                                anchors.margins: 7
                                                                spacing: 3

                                                                RowLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 6

                                                                    Label {
                                                                        text: modelData.title
                                                                        color: modelData.completed ? "#8ea4c0" : "#f5f7fb"
                                                                        font.pixelSize: 11
                                                                        font.weight: Font.DemiBold
                                                                        wrapMode: Text.WordWrap
                                                                        Layout.fillWidth: true
                                                                    }

                                                                    Rectangle {
                                                                        visible: modelData.isRunning
                                                                        radius: 999
                                                                        color: "#163a2c"
                                                                        implicitWidth: 8
                                                                        implicitHeight: 8
                                                                    }
                                                                }

                                                                RowLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 6

                                                                    Label {
                                                                        text: rootWindow.taskStateLabel(modelData)
                                                                              + " | "
                                                                              + modelData.priority.toUpperCase()
                                                                              + (modelData.dueDate ? " | " + rootWindow.formatDueDate(modelData.dueDate) : "")
                                                                        color: "#8ea4c0"
                                                                        font.pixelSize: 10
                                                                        wrapMode: Text.WordWrap
                                                                        Layout.fillWidth: true
                                                                    }

                                                                    Label {
                                                                        text: rootWindow.formatSeconds(modelData.totalSeconds)
                                                                        color: modelData.isRunning ? "#6fd3a8" : "#9bb0c9"
                                                                        font.pixelSize: 10
                                                                        font.family: "monospace"
                                                                    }
                                                                }

                                                                Label {
                                                                    visible: modelData.labels && modelData.labels.length > 0
                                                                    text: modelData.labels.slice(0, 2).join(", ")
                                                                           + (modelData.labels.length > 2 ? " +" + (modelData.labels.length - 2) : "")
                                                                    color: "#9bb0c9"
                                                                    font.pixelSize: 10
                                                                    wrapMode: Text.WordWrap
                                                                    Layout.fillWidth: true
                                                                }

                                                                RowLayout {
                                                                    Layout.fillWidth: true
                                                                    spacing: 6

                                                                    Button {
                                                                        text: modelData.completed ? "Reopen" : "Complete"
                                                                        onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                                    }

                                                                    Button {
                                                                        text: modelData.isRunning ? "Stop Timer" : "Start Timer"
                                                                        onClicked: engineController.togglePlanningTaskTimer(modelData.id)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Label {
                                                    visible: projectCard.projectTasks.length > projectCard.previewTasks.length
                                                    text: "+" + (projectCard.projectTasks.length - projectCard.previewTasks.length) + " more tasks"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                    wrapMode: Text.WordWrap
                                                    Layout.fillWidth: true
                                                }

                                                RowLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 6

                                                    TextField {
                                                        Layout.fillWidth: true
                                                        placeholderText: "+ Add Task"
                                                        text: project ? taskDraft(project.id) : ""
                                                        onTextChanged: {
                                                            if (project) {
                                                                setTaskDraft(project.id, text)
                                                            }
                                                        }
                                                        onAccepted: {
                                                            if (!project) {
                                                                return
                                                            }

                                                            const title = text.trim()
                                                            if (title.length === 0) {
                                                                return
                                                            }

                                                            engineController.createPlanningTask(project.id, title)
                                                            setTaskDraft(project.id, "")
                                                        }
                                                    }

                                                    Button {
                                                        text: "Add"
                                                        enabled: project ? taskDraft(project.id).trim().length > 0 : false
                                                        onClicked: {
                                                            if (!project) {
                                                                return
                                                            }

                                                            const title = taskDraft(project.id).trim()
                                                            if (title.length === 0) {
                                                                return
                                                            }

                                                            engineController.createPlanningTask(project.id, title)
                                                            setTaskDraft(project.id, "")
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Item {
                                    width: parent.width
                                    height: 1
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
