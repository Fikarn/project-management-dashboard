pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "planning-time-report-dialog"
    required property var rootWindow
    required property var engineController
    required property bool open
    signal closeRequested()
    parent: rootWindow && rootWindow.contentItem ? rootWindow.contentItem : null

    property var projectItems: engineController ? engineController.planningTimeByProject : []
    property var taskItems: engineController ? engineController.planningTimeByTask.slice(0, 10) : []
    readonly property real dialogWidth: Math.min(496, parent ? parent.width - 48 : 496)
    readonly property real dialogMaxHeight: Math.min(432, parent ? parent.height - 88 : 432)
    readonly property real dialogTopMargin: Math.max(38, parent ? Math.round(parent.height * 0.03) : 38)

    ConsoleTheme {
        id: theme
    }

    function formatDuration(totalSeconds) {
        if (!totalSeconds || totalSeconds <= 0) {
            return "0s"
        }

        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        if (hours > 0) {
            return hours + "h " + minutes + "m"
        }

        if (minutes > 0) {
            return minutes + "m " + seconds + "s"
        }

        return seconds + "s"
    }

    function projectBarRatio(totalSeconds) {
        let maxValue = 1
        for (let index = 0; index < projectItems.length; index += 1) {
            maxValue = Math.max(maxValue, projectItems[index].totalSeconds || 0)
        }
        return Math.max(0.08, (totalSeconds || 0) / maxValue)
    }

    function projectTaskCount(projectItem) {
        if (!projectItem) {
            return 0
        }

        if (projectItem.taskCount !== undefined && projectItem.taskCount !== null) {
            return projectItem.taskCount
        }

        let titleMatches = 0
        for (let index = 0; index < taskItems.length; index += 1) {
            if (taskItems[index].projectTitle === projectItem.title) {
                titleMatches += 1
            }
        }

        if (rootWindow && rootWindow.tasksForProject) {
            let projectId = projectItem.projectId
            if ((!projectId || projectId.length === 0) && rootWindow.projects) {
                for (let index = 0; index < rootWindow.projects.length; index += 1) {
                    if (rootWindow.projects[index].title === projectItem.title) {
                        projectId = rootWindow.projects[index].id
                        break
                    }
                }
            }

            const tasks = projectId ? rootWindow.tasksForProject(projectId) : null
            return tasks ? tasks.length : 0
        }

        return titleMatches
    }

    function taskCountLabel(projectItem) {
        const count = root.projectTaskCount(projectItem)
        return count + (count === 1 ? " task" : " tasks")
    }

    anchors.fill: parent
    visible: open
    z: 65

    onOpenChanged: {
        if (open && engineController) {
            engineController.requestPlanningTimeReport()
        }
    }

    Rectangle {
        anchors.fill: parent
        color: theme.overlayScrim
        opacity: 0.9

        TapHandler {
            onTapped: root.closeRequested()
        }
    }

    Rectangle {
        id: dialogSurface
        width: root.dialogWidth
        implicitHeight: modalLayout.implicitHeight + 18
        height: Math.min(implicitHeight, root.dialogMaxHeight)
        anchors.top: parent.top
        anchors.topMargin: root.dialogTopMargin
        anchors.horizontalCenter: parent.horizontalCenter
        radius: 14
        color: Qt.rgba(26 / 255, 26 / 255, 36 / 255, 0.985)
        border.width: 1
        border.color: Qt.rgba(theme.studio600.r, theme.studio600.g, theme.studio600.b, 0.52)
        clip: true

        gradient: Gradient {
            GradientStop { position: 0.0; color: Qt.rgba(31 / 255, 31 / 255, 44 / 255, 0.995) }
            GradientStop { position: 0.28; color: Qt.rgba(28 / 255, 28 / 255, 39 / 255, 0.992) }
            GradientStop { position: 1.0; color: Qt.rgba(24 / 255, 24 / 255, 33 / 255, 0.992) }
        }

        Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            height: 1
            color: Qt.rgba(theme.studio050.r, theme.studio050.g, theme.studio050.b, 0.06)
        }

        Rectangle {
            anchors.fill: parent
            anchors.margins: 1
            radius: parent.radius - 1
            color: "transparent"
            border.width: 1
            border.color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.34)
        }

        ColumnLayout {
            id: modalLayout
            anchors.fill: parent
            spacing: 0

            Item {
                Layout.fillWidth: true
                implicitHeight: reportHeaderLayout.implicitHeight + 22

                RowLayout {
                    id: reportHeaderLayout
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    anchors.topMargin: 11
                    anchors.bottomMargin: 11
                    spacing: 10

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1

                        Label {
                            text: "Time Report"
                            color: theme.studio050
                            font.family: theme.uiFontFamily
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: !root.engineController || !root.engineController.planningTimeReportLoaded
                            text: "Loading..."
                            color: theme.studio500
                            font.family: theme.uiFontFamily
                            font.pixelSize: theme.textXs
                        }

                        Label {
                            visible: !!root.engineController && root.engineController.planningTimeReportLoaded
                            text: root.formatDuration(root.engineController.planningTotalTrackedSeconds)
                            color: theme.studio050
                            font.family: theme.uiFontFamily
                            font.pixelSize: 31
                            font.weight: Font.DemiBold
                        }

                        Label {
                            visible: !!root.engineController && root.engineController.planningTimeReportLoaded
                            text: "Total tracked time across all projects"
                            color: Qt.rgba(theme.studio500.r, theme.studio500.g, theme.studio500.b, 0.82)
                            font.family: theme.uiFontFamily
                            font.pixelSize: 10
                        }
                    }

                    Button {
                        id: closeButton
                        objectName: "planning-time-report-close"
                        implicitWidth: 20
                        implicitHeight: 20
                        padding: 0
                        hoverEnabled: true
                        focusPolicy: Qt.StrongFocus
                        onClicked: root.closeRequested()

                        background: Rectangle {
                            radius: 6
                            color: closeButton.hovered
                                   ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.22)
                                   : "transparent"
                            border.width: closeButton.hovered || closeButton.activeFocus ? 1 : 0
                            border.color: closeButton.activeFocus
                                           ? Qt.rgba(theme.accentBlue.r, theme.accentBlue.g, theme.accentBlue.b, 0.55)
                                           : Qt.rgba(theme.studio600.r, theme.studio600.g, theme.studio600.b, 0.4)
                        }

                        contentItem: Label {
                            text: "\u00d7"
                            color: closeButton.hovered ? theme.studio200 : theme.studio500
                            font.family: theme.uiFontFamily
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 1
                color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.9)
            }

            ScrollView {
                id: reportScrollView
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.preferredHeight: implicitHeight
                clip: true
                contentWidth: availableWidth
                implicitHeight: reportSections.implicitHeight + 2

                ColumnLayout {
                    id: reportSections
                    width: parent.width
                    spacing: 0

                    Item {
                        Layout.fillWidth: true
                        implicitHeight: projectSectionLayout.implicitHeight + 20

                        ColumnLayout {
                            id: projectSectionLayout
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            anchors.topMargin: 10
                            anchors.bottomMargin: 10
                            spacing: 8

                            Label {
                                text: "By Project"
                                color: theme.studio300
                                font.family: theme.uiFontFamily
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                            }

                            Label {
                                visible: root.projectItems.length === 0
                                text: "No time tracked yet"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: 10
                                font.italic: true
                            }

                            Repeater {
                                model: root.projectItems

                                ColumnLayout {
                                    id: projectRow
                                    required property var modelData
                                    required property int index
                                    Layout.fillWidth: true
                                    spacing: 4

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6

                                        Label {
                                            text: projectRow.modelData.title
                                            color: theme.studio200
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 12
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            text: root.taskCountLabel(projectRow.modelData)
                                            color: Qt.rgba(theme.studio500.r, theme.studio500.g, theme.studio500.b, 0.88)
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 10
                                        }

                                        Label {
                                            text: root.formatDuration(projectRow.modelData.totalSeconds)
                                            color: theme.studio050
                                            font.family: theme.monoFontFamily
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                        }
                                    }

                                    Rectangle {
                                        Layout.fillWidth: true
                                        implicitHeight: 5
                                        radius: 2
                                        color: Qt.rgba(theme.studio650.r, theme.studio650.g, theme.studio650.b, 0.5)

                                        Rectangle {
                                            width: Math.max(12, parent.width * root.projectBarRatio(projectRow.modelData.totalSeconds))
                                            height: parent.height
                                            radius: parent.radius
                                            color: theme.accentBlue
                                        }
                                    }

                                    Rectangle {
                                        Layout.fillWidth: true
                                        visible: projectRow.index < root.projectItems.length - 1
                                        implicitHeight: 1
                                        color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.36)
                                        Layout.topMargin: 4
                                        Layout.bottomMargin: 1
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 1
                        color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.9)
                    }

                    Item {
                        Layout.fillWidth: true
                        implicitHeight: taskSectionLayout.implicitHeight + 18

                        ColumnLayout {
                            id: taskSectionLayout
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            anchors.topMargin: 10
                            anchors.bottomMargin: 8
                            spacing: 0

                            Label {
                                text: "By Task"
                                color: theme.studio300
                                font.family: theme.uiFontFamily
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                                bottomPadding: 8
                            }

                            Label {
                                visible: root.taskItems.length === 0
                                text: "No time tracked yet"
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: 10
                                font.italic: true
                                bottomPadding: 4
                            }

                            Repeater {
                                model: root.taskItems

                                Item {
                                    id: taskRowDelegate
                                    required property var modelData
                                    required property int index
                                    Layout.fillWidth: true
                                    implicitHeight: taskRowLayout.implicitHeight + 8

                                    RowLayout {
                                        id: taskRowLayout
                                        anchors.fill: parent
                                        anchors.topMargin: 4
                                        anchors.bottomMargin: 4
                                        spacing: 8

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 5

                                            Label {
                                                text: taskRowDelegate.modelData.taskTitle
                                                color: theme.studio200
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 11
                                                elide: Text.ElideRight
                                                Layout.fillWidth: true
                                            }

                                            Label {
                                                visible: taskRowDelegate.modelData.projectTitle && taskRowDelegate.modelData.projectTitle.length > 0
                                                text: taskRowDelegate.modelData.projectTitle
                                                color: Qt.rgba(theme.studio500.r, theme.studio500.g, theme.studio500.b, 0.84)
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 10
                                                elide: Text.ElideRight
                                                Layout.maximumWidth: 134
                                            }
                                        }

                                        Rectangle {
                                            visible: !!taskRowDelegate.modelData.isRunning
                                            implicitWidth: 5
                                            implicitHeight: 5
                                            radius: 2.5
                                            color: theme.accentGreen
                                        }

                                        Label {
                                            text: root.formatDuration(taskRowDelegate.modelData.totalSeconds)
                                            color: theme.studio050
                                            font.family: theme.monoFontFamily
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                        }
                                    }

                                    Rectangle {
                                        anchors.left: parent.left
                                        anchors.right: parent.right
                                        anchors.bottom: parent.bottom
                                        visible: taskRowDelegate.index < root.taskItems.length - 1
                                        implicitHeight: 1
                                        color: Qt.rgba(theme.surfaceBorder.r, theme.surfaceBorder.g, theme.surfaceBorder.b, 0.2)
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
