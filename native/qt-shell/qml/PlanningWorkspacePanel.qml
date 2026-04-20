import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window

Item {
    id: root
    objectName: "planning-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    property bool createProjectDialogVisible: false
    property bool importDialogVisible: false
    property alias newProjectTitleField: createProjectDialog.titleField
    readonly property bool fullscreenOperatorSurface: rootWindow && rootWindow.visibility === Window.FullScreen
    readonly property bool widescreenMonitor: fullscreenOperatorSurface || width >= 1450

    ConsoleTheme {
        id: theme
    }

    function focusSearch() {
        planningToolbarPanel.focusSearch()
    }

    function openCreateProjectDialog(defaultStatus) {
        if (defaultStatus && defaultStatus.length > 0) {
            createProjectDialog.statusDraft = defaultStatus
        }
        createProjectDialogVisible = true
    }

    function openImportDialog() {
        importDialogVisible = true
    }

    function contentFitsViewport() {
        return planningContentLayout.implicitHeight * scaleFactor <= planningScrollView.height + 1
    }

    visible: !!engineController && engineController.workspaceMode === "planning"
    Layout.fillWidth: true
    Layout.fillHeight: true

    ScrollView {
        id: planningScrollView
        anchors.fill: parent
        clip: true
        contentWidth: availableWidth

        Item {
            width: planningScrollView.availableWidth
            height: Math.max(
                        planningScrollView.height,
                        planningContentHost.height * root.scaleFactor
                    )

            Item {
                id: planningContentHost
                width: parent.width / root.scaleFactor
                height: Math.max(
                            planningScrollView.height / root.scaleFactor,
                            planningContentLayout.implicitHeight
                        )
                scale: root.scaleFactor
                transformOrigin: Item.TopLeft

                ColumnLayout {
                    id: planningContentLayout
                    width: parent.width
                    spacing: root.widescreenMonitor ? theme.spacing3 : theme.spacing6

                    ConsoleSurface {
                        Layout.fillWidth: true
                        tone: "default"
                        padding: root.widescreenMonitor ? 6 : 14
                        implicitHeight: planningOverviewLayout.implicitHeight + (root.widescreenMonitor ? 12 : 28)

                        ColumnLayout {
                            id: planningOverviewLayout
                            anchors.top: parent.top
                            anchors.left: parent.left
                            anchors.right: parent.right
                            spacing: root.widescreenMonitor ? theme.spacing3 : theme.spacing6

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: root.widescreenMonitor ? theme.spacing4 : theme.spacing6

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    Layout.minimumWidth: 0
                                    Layout.alignment: Qt.AlignVCenter
                                    spacing: root.widescreenMonitor ? 1 : 4

                                    Label {
                                        text: "Planning Workspace"
                                        color: theme.studio500
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: theme.textXxs
                                        font.weight: Font.DemiBold
                                        font.capitalization: Font.AllUppercase
                                        font.letterSpacing: 1.1
                                    }

                                    Label {
                                        text: "Prep, handoffs, and timers stay visible without stealing the console."
                                        color: theme.studio100
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: root.widescreenMonitor ? theme.textSm + 1 : theme.textLg
                                        font.weight: Font.DemiBold
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                        Layout.maximumWidth: root.widescreenMonitor ? 760 : Number.POSITIVE_INFINITY
                                    }

                                    Label {
                                        text: "Use planning as an always-on sidecar: fast to scan, dense enough to monitor, and contained to its own panel."
                                        color: theme.studio400
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: root.widescreenMonitor ? theme.textXxs : theme.textSm
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                        Layout.maximumWidth: root.widescreenMonitor ? 760 : Number.POSITIVE_INFINITY
                                    }
                                }

                                ColumnLayout {
                                    visible: root.widescreenMonitor
                                    Layout.preferredWidth: 920
                                    Layout.maximumWidth: 920
                                    Layout.alignment: Qt.AlignVCenter | Qt.AlignRight
                                    spacing: theme.spacing2

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: theme.spacing2

                                        PlanningSummaryGrid {
                                            Layout.fillWidth: true
                                            compact: true
                                            rootWindow: root.rootWindow
                                            engineController: root.engineController
                                        }

                                        ConsoleButton {
                                            objectName: "planning-open-create-project"
                                            tone: "primary"
                                            text: "New Project"
                                            iconText: "+"
                                            compact: true
                                            dense: true
                                            onClicked: root.openCreateProjectDialog("todo")
                                        }

                                        Rectangle {
                                            radius: theme.radiusBadge
                                            color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.5)
                                            border.width: 1
                                            border.color: theme.surfaceBorder
                                            implicitHeight: theme.compactControlHeight
                                            implicitWidth: planningActionRail.implicitWidth + 8

                                            RowLayout {
                                                id: planningActionRail
                                                anchors.centerIn: parent
                                                spacing: 2

                                                ConsoleButton {
                                                    objectName: "planning-time-report-toggle-inline"
                                                    tone: "icon"
                                                    active: root.rootWindow.planningTimeReportVisible
                                                    text: ""
                                                    iconText: "\u2630"
                                                    compact: true
                                                    dense: true
                                                    ToolTip.visible: hovered
                                                    ToolTip.text: root.rootWindow.planningTimeReportVisible ? "Hide time report" : "Open time report"
                                                    onClicked: {
                                                        root.rootWindow.planningTimeReportVisible = !root.rootWindow.planningTimeReportVisible
                                                        if (root.rootWindow.planningTimeReportVisible) {
                                                            engineController.requestPlanningTimeReport()
                                                        }
                                                    }
                                                }

                                                ConsoleButton {
                                                    objectName: "planning-export-backup-button"
                                                    tone: "icon"
                                                    text: ""
                                                    iconText: "\u2193"
                                                    compact: true
                                                    dense: true
                                                    ToolTip.visible: hovered
                                                    ToolTip.text: "Export data"
                                                    onClicked: engineController.exportSupportBackup()
                                                }

                                                ConsoleButton {
                                                    objectName: "planning-import-button"
                                                    tone: "icon"
                                                    text: ""
                                                    iconText: "\u2191"
                                                    compact: true
                                                    dense: true
                                                    ToolTip.visible: hovered
                                                    ToolTip.text: "Import data"
                                                    onClicked: root.openImportDialog()
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            PlanningSummaryGrid {
                                visible: !root.widescreenMonitor
                                rootWindow: root.rootWindow
                                engineController: root.engineController
                            }

                            RowLayout {
                                visible: !root.widescreenMonitor
                                Layout.fillWidth: true
                                spacing: theme.spacing4

                                Item {
                                    Layout.fillWidth: true
                                }

                                ConsoleButton {
                                    objectName: "planning-open-create-project"
                                    tone: "primary"
                                    text: "New Project"
                                    onClicked: root.openCreateProjectDialog("todo")
                                }

                                ConsoleButton {
                                    objectName: "planning-export-backup-button"
                                    tone: "secondary"
                                    text: "Export"
                                    onClicked: engineController.exportSupportBackup()
                                }

                                ConsoleButton {
                                    objectName: "planning-import-button"
                                    tone: "secondary"
                                    text: "Import"
                                    onClicked: root.openImportDialog()
                                }
                            }
                        }
                    }

                    ConsoleSurface {
                        visible: !!engineController && engineController.planningProjectCount === 0
                        Layout.fillWidth: true
                        tone: "soft"
                        padding: 18
                        implicitHeight: planningEmptyStateLayout.implicitHeight + 36

                        RowLayout {
                            id: planningEmptyStateLayout
                            anchors.top: parent.top
                            anchors.left: parent.left
                            anchors.right: parent.right
                            spacing: theme.spacing6

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 4

                                Label {
                                    text: "No projects yet"
                                    color: theme.studio050
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textMd
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    text: "Click New Project or press N to build the first planning board."
                                    color: theme.studio400
                                    font.family: theme.uiFontFamily
                                    font.pixelSize: theme.textSm
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }
                            }

                            ConsoleButton {
                                tone: "primary"
                                text: "New Project"
                                onClicked: root.openCreateProjectDialog("todo")
                            }
                        }
                    }

                    PlanningToolbarPanel {
                        id: planningToolbarPanel
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                    }

                    PlanningBoardPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        Layout.fillWidth: true
                        onOpenProjectDetail: function(projectId) {
                            root.rootWindow.openPlanningProjectDetail(projectId)
                        }
                    }
                }
            }
        }
    }

    PlanningTimeReportDialog {
        anchors.fill: parent
        open: root.rootWindow.planningTimeReportVisible
        rootWindow: root.rootWindow
        engineController: root.engineController
        onCloseRequested: root.rootWindow.planningTimeReportVisible = false
    }

    PlanningCreateProjectDialog {
        id: createProjectDialog
        anchors.fill: parent
        open: root.createProjectDialogVisible
        rootWindow: root.rootWindow
        engineController: root.engineController
        onCloseRequested: root.createProjectDialogVisible = false
    }

    PlanningImportDialog {
        anchors.fill: parent
        open: root.importDialogVisible
        rootWindow: root.rootWindow
        engineController: root.engineController
        onCloseRequested: root.importDialogVisible = false
    }
}
