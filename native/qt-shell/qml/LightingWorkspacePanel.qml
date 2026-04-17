import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtCore

Item {
    id: root
    objectName: "lighting-workspace-panel"
    required property var rootWindow
    required property var engineController
    property bool persistState: true
    property string settingsScope: "nativeLightingWorkspace"
    property real scaleFactor: 1.0
    property string viewMode: "expanded"
    property bool showDmxMonitor: false
    property real sidebarPreferredWidth: width >= 1680 ? 460 : 400
    property bool workspaceStateRestored: false

    Settings {
        id: workspaceSettings
        category: root.settingsScope

        property string storedViewMode: "expanded"
        property bool storedShowDmxMonitor: false
        property real storedSidebarPreferredWidth: 0
    }

    function restoreWorkspaceState() {
        if (!root.persistState || root.workspaceStateRestored) {
            return
        }

        if (workspaceSettings.storedViewMode === "expanded"
                || workspaceSettings.storedViewMode === "compact"
                || workspaceSettings.storedViewMode === "spatial") {
            root.viewMode = workspaceSettings.storedViewMode
        }

        root.showDmxMonitor = workspaceSettings.storedShowDmxMonitor

        if (workspaceSettings.storedSidebarPreferredWidth >= 340) {
            root.sidebarPreferredWidth = workspaceSettings.storedSidebarPreferredWidth
        }

        root.workspaceStateRestored = true
    }

    function persistWorkspaceState() {
        if (!root.persistState || !root.workspaceStateRestored) {
            return
        }

        workspaceSettings.storedViewMode = root.viewMode
        workspaceSettings.storedShowDmxMonitor = root.showDmxMonitor
        workspaceSettings.storedSidebarPreferredWidth = root.sidebarPreferredWidth
    }

    function contentFitsViewport() {
        return lightingToolbarPanel.height + lightingSplitView.height + lightingRootLayout.spacing <= height + 1
               && lightingSplitView.height > 0
    }

    Component.onCompleted: restoreWorkspaceState()
    onViewModeChanged: persistWorkspaceState()
    onShowDmxMonitorChanged: persistWorkspaceState()
    onSidebarPreferredWidthChanged: persistWorkspaceState()

    visible: !!engineController && engineController.workspaceMode === "lighting"
    Layout.fillWidth: true
    Layout.fillHeight: true

    Item {
        anchors.fill: parent

        Item {
            width: parent.width / root.scaleFactor
            height: parent.height / root.scaleFactor
            scale: root.scaleFactor
            transformOrigin: Item.TopLeft

            ColumnLayout {
                id: lightingRootLayout
                anchors.fill: parent
                spacing: 12

                LightingToolbarPanel {
                    id: lightingToolbarPanel
                    rootWindow: root.rootWindow
                    engineController: root.engineController
                    Layout.fillWidth: true
                }

                SplitView {
                    id: lightingSplitView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    orientation: Qt.Horizontal

                    LightingContentPanel {
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        viewMode: root.viewMode
                        SplitView.fillWidth: true
                        SplitView.minimumWidth: 460
                        onViewModeSelected: function(nextViewMode) {
                            root.viewMode = nextViewMode
                        }
                    }

                    LightingSidebarPanel {
                        id: lightingSidebarPanel
                        rootWindow: root.rootWindow
                        engineController: root.engineController
                        viewMode: root.viewMode
                        showDmxMonitor: root.showDmxMonitor
                        SplitView.preferredWidth: root.sidebarPreferredWidth
                        SplitView.minimumWidth: 340
                        onWidthChanged: {
                            if (width >= 340) {
                                root.sidebarPreferredWidth = width
                            }
                        }
                        onViewModeSelected: function(nextViewMode) {
                            root.viewMode = nextViewMode
                        }
                        onDmxMonitorToggled: {
                            root.showDmxMonitor = !root.showDmxMonitor
                            if (root.showDmxMonitor) {
                                engineController.requestLightingDmxMonitorSnapshot()
                            }
                        }
                    }
                }
            }
        }
    }
}
