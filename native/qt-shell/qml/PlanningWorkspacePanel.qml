import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "planning-workspace-panel"
    required property var rootWindow
    required property var engineController
    property real scaleFactor: 1.0
    property alias newProjectTitleField: planningQuickActions.newProjectTitleField
    property bool wideLayout: width >= 1660

    function focusSearch() {
        planningToolbarPanel.focusSearch()
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
            implicitHeight: planningContentLayout.implicitHeight * root.scaleFactor

            Item {
                id: planningContentHost
                width: parent.width / root.scaleFactor
                implicitHeight: planningContentLayout.implicitHeight
                height: implicitHeight
                scale: root.scaleFactor
                transformOrigin: Item.TopLeft

                GridLayout {
                    id: planningContentLayout
                    width: parent.width
                    columns: root.wideLayout ? 2 : 1
                    columnSpacing: 12
                    rowSpacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 12

                        PlanningSummaryGrid {
                            rootWindow: root.rootWindow
                            engineController: root.engineController
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

                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 12

                        PlanningQuickActionsPanel {
                            id: planningQuickActions
                            rootWindow: root.rootWindow
                            engineController: root.engineController
                        }

                        PlanningFocusPanel {
                            rootWindow: root.rootWindow
                            engineController: root.engineController
                        }
                    }
                }
            }
        }
    }
}
