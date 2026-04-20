import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQml
import QtQuick.Window
import "OperatorParityHelpers.js" as OperatorParityHelpers

Item {
    id: root
    objectName: "planning-board-panel"
    required property var rootWindow
    required property var engineController
    signal openProjectDetail(string projectId)
    readonly property bool fullscreenOperatorSurface: rootWindow && rootWindow.visibility === Window.FullScreen
    readonly property bool widescreenLayout: fullscreenOperatorSurface || width >= 1450

    property var newTaskDrafts: ({})
    property string composerProjectId: ""
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

    ConsoleTheme {
        id: theme
    }

    function columnDefinitions() {
        const filter = engineController ? engineController.planningViewFilter : "all"
        const columns = [
            { "id": "todo", "name": "To Do", "accent": theme.studio500 },
            { "id": "in-progress", "name": "In Progress", "accent": theme.accentBlue },
            { "id": "blocked", "name": "Blocked", "accent": theme.accentRed },
            { "id": "done", "name": "Done", "accent": theme.accentGreen }
        ]

        if (filter === "all") {
            return columns
        }

        for (let index = 0; index < columns.length; index += 1) {
            if (columns[index].id === filter) {
                return [columns[index]]
            }
        }

        return columns
    }

    function beginProjectDrag(project, projectStatus, projectIndex, card, handler) {
        if (!project || !card || !handler) {
            return
        }

        const cardOrigin = card.mapToItem(boardSurface, 0, 0)
        const hotSpot = card.mapToItem(boardSurface, handler.centroid.position.x, handler.centroid.position.y)

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

    function taskComposerOpen(projectId) {
        return !!projectId && (composerProjectId === projectId || taskDraft(projectId).trim().length > 0)
    }

    function openTaskComposer(projectId, field) {
        if (!projectId) {
            return
        }

        composerProjectId = projectId
        if (field) {
            Qt.callLater(function() {
                field.forceActiveFocus()
            })
        }
    }

    function closeTaskComposer(projectId) {
        if (!projectId) {
            return
        }

        setTaskDraft(projectId, "")
        if (composerProjectId === projectId) {
            composerProjectId = ""
        }
    }

    function requestProjectDetail(project) {
        if (!project) {
            return
        }

        engineController.selectPlanningProject(project.id)
        openProjectDetail(project.id)
    }

    function completedTaskCount(projectTasks) {
        let count = 0
        const items = projectTasks || []
        for (let index = 0; index < items.length; index += 1) {
            if (items[index].completed) {
                count += 1
            }
        }
        return count
    }

    function priorityBadgeColor(priority) {
        switch (priority) {
        case "p0":
            return theme.accentRed
        case "p1":
            return theme.accentOrange
        case "p2":
            return theme.accentAmber
        default:
            return theme.studio600
        }
    }

    function projectUpdatedLabel(project) {
        if (!project) {
            return ""
        }

        if (rootWindow && typeof rootWindow.formatProjectUpdated === "function") {
            return rootWindow.formatProjectUpdated(project.lastUpdated)
        }

        return "Updated recently"
    }

    function visibleTaskLabels(task) {
        if (!task || !task.labels) {
            return []
        }

        return task.labels.slice(0, 2)
    }

    visible: !!engineController && engineController.workspaceMode === "planning"
    Layout.fillWidth: true
    Layout.fillHeight: true
    implicitHeight: root.widescreenLayout ? 650
                   : root.width >= 1150 ? 560
                   : 620

    ConsoleSurface {
        id: boardSurface
        anchors.fill: parent
        tone: "soft"
        padding: root.widescreenLayout ? 6 : 12

        Rectangle {
            id: projectDragProxy
            property string projectId: root.draggedProjectId
            property string projectStatus: root.draggedProjectStatus
            property int projectIndex: root.draggedProjectIndex
            z: 40
            radius: theme.radiusCard
            color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.12)
            border.color: Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.58)
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
                anchors.margins: 12
                spacing: theme.spacing4

                Label {
                    text: root.draggedProjectTitle
                    color: theme.studio050
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textSm
                    font.weight: Font.DemiBold
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Label {
                    text: root.draggedProjectPriority.toUpperCase() + " | " + rootWindow.formatEnumLabel(root.draggedProjectStatus)
                    color: theme.studio300
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }
        }

        ColumnLayout {
            anchors.fill: parent
            spacing: root.widescreenLayout ? theme.spacing3 : theme.spacing6

            RowLayout {
                visible: false
                Layout.fillWidth: true
                spacing: theme.spacing3

                Label {
                    text: "Planning Board"
                    color: theme.studio400
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.weight: Font.DemiBold
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 1.1
                }

                Label {
                    text: "Dense project lanes with direct detail access."
                    visible: false
                    color: theme.studio500
                    font.family: theme.uiFontFamily
                    font.pixelSize: theme.textXxs
                    font.capitalization: Font.AllUppercase
                    font.letterSpacing: 0.8
                }

                Item {
                    Layout.fillWidth: true
                }
            }

            GridLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                columns: root.columnDefinitions().length === 1 ? 1 : root.width >= 1400 ? 4 : 2
                columnSpacing: root.widescreenLayout ? theme.spacing3 : theme.spacing6
                rowSpacing: root.widescreenLayout ? theme.spacing3 : theme.spacing6

                Repeater {
                    model: root.columnDefinitions()

                    ConsoleSurface {
                        required property var modelData
                        property var projects: rootWindow.filteredPlanningProjectsForStatus(modelData.id)
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        tone: "default"
                        padding: root.widescreenLayout ? 6 : 9

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: root.widescreenLayout ? theme.spacing2 : theme.spacing3

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: theme.spacing3

                                Rectangle {
                                    radius: theme.radiusPill
                                    color: modelData.accent
                                    implicitWidth: 8
                                    implicitHeight: 8
                                }

                                Label {
                                    text: modelData.name
                                    color: theme.studio300
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textXxs
                                    font.weight: Font.DemiBold
                                    font.capitalization: Font.AllUppercase
                                    font.letterSpacing: 1.1
                                }

                                ConsoleBadge {
                                    text: String(projects.length)
                                    badgeColor: theme.studio600
                                    textColor: theme.studio300
                                }

                                Item {
                                    Layout.fillWidth: true
                                }

                                ConsoleButton {
                                    tone: "ghost"
                                    compact: true
                                    text: "+"
                                    onClicked: {
                                        if (rootWindow.openPlanningCreateProject) {
                                            rootWindow.openPlanningCreateProject(modelData.id)
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                Layout.fillWidth: true
                                implicitHeight: 1
                                color: theme.surfaceBorder
                            }

                            Label {
                                visible: projects.length === 0 && !root.projectDragActive
                                text: "No projects in this lane"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: theme.textXs
                                font.italic: true
                                horizontalAlignment: Text.AlignHCenter
                                Layout.fillWidth: true
                                Layout.topMargin: 12
                            }

                            Flickable {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true
                                visible: projects.length > 0 || root.projectDragActive
                                contentWidth: width
                                contentHeight: laneColumn.implicitHeight
                                boundsBehavior: Flickable.StopAtBounds

                                Column {
                                    id: laneColumn
                                    width: parent.width
                                    spacing: theme.spacing3

                                    Repeater {
                                        model: projects.length + 1

                                        Item {
                                            required property int index
                                            property var project: index < projects.length ? projects[index] : null
                                            width: parent.width
                                            implicitHeight: dropSlot.implicitHeight
                                                            + (projectCard.visible ? projectCard.implicitHeight + (projectCard.implicitHeight > 0 ? theme.spacing3 : 0) : 0)

                                            Rectangle {
                                                id: dropSlot
                                                width: parent.width
                                                implicitHeight: root.projectDragActive ? 16 : 0
                                                visible: root.dropSlotVisible(modelData.id, index, project ? project.id : "")
                                                radius: theme.radiusBadge
                                                color: root.dropSlotActive(modelData.id, root.dropIndexForSlot(modelData.id, index))
                                                       ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.12)
                                                       : "transparent"
                                                border.color: root.dropSlotActive(modelData.id, root.dropIndexForSlot(modelData.id, index))
                                                              ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.55)
                                                              : theme.surfaceBorder
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
                                                    text: "Drop here"
                                                    color: theme.studio050
                                                    font.family: theme.uiFontFamily
                                                    font.pixelSize: theme.textXxs
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            ConsoleSurface {
                                                id: projectCard
                                                objectName: project ? "planning-board-card-" + project.id : ""
                                                visible: project !== null
                                                anchors.top: dropSlot.bottom
                                                anchors.topMargin: project !== null ? theme.spacing3 : 0
                                                width: parent.width
                                                height: isDraggedProject ? 0 : implicitHeight
                                                clip: true
                                                property var projectTasks: project ? rootWindow.tasksForProject(project.id) : []
                                                property var previewTasks: projectTasks.slice(0, 3)
                                                property bool isDraggedProject: root.projectDragActive && root.draggedProjectId === (project ? project.id : "")
                                                property real completionRatio: projectTasks.length > 0
                                                                               ? root.completedTaskCount(projectTasks) / projectTasks.length
                                                                               : 0
                                                tone: "default"
                                                padding: root.widescreenLayout ? 6 : 9
                                                implicitHeight: projectCardLayout.implicitHeight + 12
                                                border.color: project && rootWindow.isSelectedProject(project.id)
                                                              ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.5)
                                                              : theme.surfaceBorder
                                                color: project && rootWindow.isSelectedProject(project.id)
                                                       ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.07)
                                                       : theme.surfaceRaised
                                                opacity: isDraggedProject ? 0 : 1

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
                                                    anchors.top: parent.top
                                                    anchors.left: parent.left
                                                    anchors.right: parent.right
                                                    spacing: root.widescreenLayout ? theme.spacing2 : theme.spacing3

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: theme.spacing4

                                                        Item {
                                                            Layout.fillWidth: true
                                                            implicitHeight: projectTitleLabel.implicitHeight
                                                            implicitWidth: projectTitleLabel.implicitWidth
                                                            objectName: project ? "planning-board-open-detail-" + project.id : ""

                                                            Label {
                                                                id: projectTitleLabel
                                                                anchors.fill: parent
                                                                text: project ? project.title : ""
                                                                color: theme.studio050
                                                                font.family: theme.uiFontFamily
                                                                font.pixelSize: theme.textSm
                                                                font.weight: Font.DemiBold
                                                                wrapMode: Text.WordWrap
                                                            }

                                                            TapHandler {
                                                                enabled: project !== null
                                                                onTapped: root.requestProjectDetail(project)
                                                            }
                                                        }

                                                        ConsoleBadge {
                                                            text: project ? project.priority.toUpperCase() : ""
                                                            badgeColor: root.priorityBadgeColor(project ? project.priority : "")
                                                            textColor: project && (project.priority === "p2" || project.priority === "p3") ? theme.studio100 : theme.studio950
                                                            filled: project && (project.priority === "p0" || project.priority === "p1")
                                                        }
                                                    }

                                                    RowLayout {
                                                        Layout.fillWidth: true
                                                        spacing: theme.spacing4

                                                        ConsoleBadge {
                                                            text: project ? rootWindow.formatEnumLabel(project.status) : ""
                                                            badgeColor: modelData.accent
                                                            textColor: modelData.accent
                                                        }

                                                        Label {
                                                            text: root.projectUpdatedLabel(project)
                                                            color: theme.studio500
                                                            font.family: theme.uiFontFamily
                                                            font.pixelSize: theme.textXxs
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }

                                                    Label {
                                                        visible: project && project.description.length > 0
                                                        text: project ? project.description : ""
                                                        color: theme.studio400
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: theme.textXxs
                                                        wrapMode: Text.WordWrap
                                                        maximumLineCount: 1
                                                        Layout.fillWidth: true
                                                    }

                                                    Label {
                                                        visible: projectCard.projectTasks.length > 0
                                                        text: root.completedTaskCount(projectCard.projectTasks)
                                                              + "/" + projectCard.projectTasks.length + " tasks"
                                                        color: theme.studio500
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: theme.textXxs
                                                        Layout.fillWidth: true
                                                    }

                                                    Rectangle {
                                                        visible: projectCard.projectTasks.length > 0
                                                        Layout.fillWidth: true
                                                        implicitHeight: 4
                                                        radius: theme.radiusPill
                                                        color: theme.studio750

                                                        Rectangle {
                                                            width: parent.width * projectCard.completionRatio
                                                            height: parent.height
                                                            radius: parent.radius
                                                            color: theme.accentGreen
                                                        }
                                                    }

                                                    ColumnLayout {
                                                        visible: projectCard.previewTasks.length > 0
                                                        Layout.fillWidth: true
                                                        spacing: theme.spacing3

                                                        Repeater {
                                                            model: projectCard.previewTasks

                                                            Rectangle {
                                                                required property var modelData
                                                                radius: theme.radiusBadge
                                                                color: rootWindow.isSelectedTask(modelData.id)
                                                                       ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.08)
                                                                       : Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.52)
                                                                border.color: rootWindow.isSelectedTask(modelData.id)
                                                                              ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.45)
                                                                              : theme.surfaceBorder
                                                                border.width: 1
                                                                Layout.fillWidth: true
                                                                implicitHeight: taskPreviewLayout.implicitHeight + 6

                                                                TapHandler {
                                                                    onTapped: engineController.selectPlanningTask(parent.modelData.id)
                                                                }

                                                                ColumnLayout {
                                                                    id: taskPreviewLayout
                                                                    anchors.fill: parent
                                                                    anchors.margins: 6
                                                                    spacing: 1

                                                                    RowLayout {
                                                                        Layout.fillWidth: true
                                                                        spacing: theme.spacing4

                                                                        Rectangle {
                                                                            visible: modelData.isRunning
                                                                            radius: theme.radiusPill
                                                                            color: theme.accentGreen
                                                                            implicitWidth: 7
                                                                            implicitHeight: 7
                                                                        }

                                                                        Rectangle {
                                                                            implicitWidth: 12
                                                                            implicitHeight: 12
                                                                            radius: 3
                                                                            color: "transparent"
                                                                            border.width: 1
                                                                            border.color: modelData.completed ? theme.accentGreen : theme.studio600

                                                                            Rectangle {
                                                                                anchors.centerIn: parent
                                                                                visible: modelData.completed
                                                                                implicitWidth: 6
                                                                                implicitHeight: 6
                                                                                radius: 2
                                                                                color: theme.accentGreen
                                                                            }
                                                                        }

                                                                        Label {
                                                                            text: modelData.title
                                                                            color: modelData.completed ? theme.studio500 : theme.studio100
                                                                            font.family: theme.uiFontFamily
                                                                            font.pixelSize: theme.textXxs
                                                                            font.weight: Font.DemiBold
                                                                            wrapMode: Text.WordWrap
                                                                            Layout.fillWidth: true
                                                                        }

                                                                        ConsoleBadge {
                                                                            text: modelData.priority.toUpperCase()
                                                                            badgeColor: root.priorityBadgeColor(modelData.priority)
                                                                            textColor: modelData.priority === "p2" || modelData.priority === "p3"
                                                                                       ? theme.studio100
                                                                                       : theme.studio950
                                                                            filled: modelData.priority === "p0" || modelData.priority === "p1"
                                                                        }
                                                                    }

                                                                    RowLayout {
                                                                        visible: root.visibleTaskLabels(modelData).length > 0
                                                                                 || ((modelData.labels || []).length > root.visibleTaskLabels(modelData).length)
                                                                                 || modelData.totalSeconds > 0
                                                                                 || modelData.isRunning
                                                                        Layout.fillWidth: true
                                                                        spacing: theme.spacing2

                                                                        Repeater {
                                                                            model: root.visibleTaskLabels(modelData)

                                                                            Rectangle {
                                                                                required property string modelData
                                                                                radius: theme.radiusPill
                                                                                color: Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.85)
                                                                                border.width: 1
                                                                                border.color: theme.surfaceBorder
                                                                                implicitHeight: 16
                                                                                implicitWidth: taskLabelText.implicitWidth + 10

                                                                                Label {
                                                                                    id: taskLabelText
                                                                                    anchors.centerIn: parent
                                                                                    text: modelData
                                                                                    color: theme.studio500
                                                                                    font.family: theme.uiFontFamily
                                                                                    font.pixelSize: 10
                                                                                }
                                                                            }
                                                                        }

                                                                        Label {
                                                                            visible: (modelData.labels || []).length > root.visibleTaskLabels(modelData).length
                                                                            text: "+" + ((modelData.labels || []).length - root.visibleTaskLabels(modelData).length)
                                                                            color: theme.studio500
                                                                            font.family: theme.uiFontFamily
                                                                            font.pixelSize: theme.textXxs
                                                                        }

                                                                        Rectangle {
                                                                            visible: modelData.totalSeconds > 0 || modelData.isRunning
                                                                            radius: theme.radiusBadge
                                                                            color: Qt.rgba(theme.studio800.r, theme.studio800.g, theme.studio800.b, 0.85)
                                                                            border.width: 1
                                                                            border.color: modelData.isRunning
                                                                                          ? Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.4)
                                                                                          : theme.surfaceBorder
                                                                            implicitHeight: 16
                                                                            implicitWidth: timerLabel.implicitWidth + 10

                                                                            Label {
                                                                                id: timerLabel
                                                                                anchors.centerIn: parent
                                                                                text: rootWindow.formatSeconds(modelData.totalSeconds)
                                                                                color: modelData.isRunning ? theme.accentGreen : theme.studio500
                                                                                font.family: theme.monoFontFamily
                                                                                font.pixelSize: 10
                                                                            }
                                                                        }

                                                                        Item {
                                                                            Layout.fillWidth: true
                                                                        }
                                                                    }

                                                                    RowLayout {
                                                                        visible: false
                                                                        Layout.fillWidth: true
                                                                        spacing: theme.spacing4

                                                                        ConsoleButton {
                                                                            objectName: "planning-board-task-complete-" + modelData.id
                                                                            tone: "ghost"
                                                                            compact: true
                                                                            text: modelData.completed ? "Reopen" : "Complete"
                                                                            onClicked: engineController.togglePlanningTaskComplete(modelData.id)
                                                                        }

                                                                        ConsoleButton {
                                                                            objectName: "planning-board-task-timer-" + modelData.id
                                                                            tone: "ghost"
                                                                            compact: true
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
                                                        color: theme.studio500
                                                        font.family: theme.uiFontFamily
                                                        font.pixelSize: theme.textXxs
                                                        Layout.fillWidth: true
                                                    }

                                                    ColumnLayout {
                                                        Layout.fillWidth: true
                                                        spacing: theme.spacing3

                                                        Rectangle {
                                                            visible: project && !root.taskComposerOpen(project.id)
                                                            Layout.fillWidth: true
                                                            implicitHeight: 22
                                                            radius: theme.radiusBadge
                                                            color: "transparent"
                                                            border.width: 1
                                                            border.color: theme.surfaceBorder

                                                            Label {
                                                                anchors.centerIn: parent
                                                                text: "+ Add Task"
                                                                color: theme.studio500
                                                                font.family: theme.uiFontFamily
                                                                font.pixelSize: theme.textXxs
                                                                font.weight: Font.Medium
                                                            }

                                                            TapHandler {
                                                                onTapped: root.openTaskComposer(project ? project.id : "", projectTaskDraftField)
                                                            }
                                                        }

                                                        ColumnLayout {
                                                            visible: project && root.taskComposerOpen(project.id)
                                                            Layout.fillWidth: true
                                                            spacing: theme.spacing3

                                                            ConsoleTextField {
                                                                id: projectTaskDraftField
                                                                objectName: project ? "planning-board-new-task-field-" + project.id : ""
                                                                Layout.fillWidth: true
                                                                dense: true
                                                                placeholderText: "Add task"
                                                                onActiveFocusChanged: {
                                                                    if (activeFocus && project) {
                                                                        root.composerProjectId = project.id
                                                                    }
                                                                }
                                                                onTextEdited: {
                                                                    if (project) {
                                                                        root.composerProjectId = project.id
                                                                        root.setTaskDraft(project.id, text)
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
                                                                    root.closeTaskComposer(project.id)
                                                                }

                                                                Binding {
                                                                    target: projectTaskDraftField
                                                                    property: "text"
                                                                    value: project ? root.taskDraft(project.id) : ""
                                                                    when: !projectTaskDraftField.activeFocus
                                                                }
                                                            }

                                                            RowLayout {
                                                                Layout.fillWidth: true
                                                                spacing: theme.spacing3

                                                                ConsoleButton {
                                                                    objectName: project ? "planning-board-new-task-add-" + project.id : ""
                                                                    tone: "ghost"
                                                                    compact: true
                                                                    text: "Add"
                                                                    enabled: project ? root.taskDraft(project.id).trim().length > 0 : false
                                                                    onClicked: {
                                                                        if (!project) {
                                                                            return
                                                                        }

                                                                        const title = root.taskDraft(project.id).trim()
                                                                        if (title.length === 0) {
                                                                            return
                                                                        }

                                                                        engineController.createPlanningTask(project.id, title)
                                                                        root.closeTaskComposer(project.id)
                                                                    }
                                                                }

                                                                ConsoleButton {
                                                                    tone: "ghost"
                                                                    compact: true
                                                                    text: "Cancel"
                                                                    onClicked: root.closeTaskComposer(project ? project.id : "")
                                                                }

                                                                Item {
                                                                    Layout.fillWidth: true
                                                                }
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
}
