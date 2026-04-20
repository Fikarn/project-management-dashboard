import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "PlanningToolbarPanel"
    when: windowShown
    width: 1320
    height: 720

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: toolbarHostComponent

        Item {
            id: host
            width: 1320
            height: 720

            property alias toolbar: toolbarPanel
            property alias engine: engineControllerStub
            property string planningSearchQuery: "restore board flow"
            property bool planningTimeReportVisible: false
            property bool keyboardHelpVisible: false

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "planning"
                property string planningSortBy: "manual"
                property string planningViewFilter: "all"
                property bool planningTimeReportLoaded: true
                property int planningTotalTrackedSeconds: 1380
                property var planningTimeByProject: [
                    {
                        "title": "Restore native planning parity",
                        "totalSeconds": 900
                    }
                ]
                property var planningTimeByTask: [
                    {
                        "taskTitle": "Verify board modal flow",
                        "projectTitle": "Restore native planning parity",
                        "totalSeconds": 480
                    }
                ]
                property var lastPlanningSettingsUpdate: null
                property int planningTimeReportRequests: 0

                function updatePlanningSettings(changes) {
                    lastPlanningSettingsUpdate = changes
                }

                function requestPlanningTimeReport() {
                    planningTimeReportRequests += 1
                }
            }

            function planningResultCount() {
                return 5
            }

            function formatSeconds(totalSeconds) {
                return totalSeconds + "s"
            }

            PlanningToolbarPanel {
                id: toolbarPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(toolbarHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.toolbar)
        return host
    }

    function findByObjectName(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const childItems = item.children || []
        for (let index = 0; index < childItems.length; index += 1) {
            const match = findByObjectName(childItems[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function pressButton(button) {
        verify(button !== null)
        button.forceActiveFocus()
        wait(0)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_focusSearchTargetsSearchField() {
        const host = createHost()
        const searchField = findByObjectName(host.toolbar, "planning-search-field")

        verify(searchField !== null)
        host.toolbar.focusSearch()
        wait(0)
        wait(0)

        compare(searchField.activeFocus, true)
    }

    function test_searchFieldEditsUpdateRootWindowQuery() {
        const host = createHost()
        const searchField = findByObjectName(host.toolbar, "planning-search-field")

        verify(searchField !== null)
        searchField.text = "fresh query"
        searchField.textEdited()
        wait(0)

        compare(host.planningSearchQuery, "fresh query")
    }

    function test_searchFieldMirrorsRootWindowQueryWhenInactive() {
        const host = createHost()
        const searchField = findByObjectName(host.toolbar, "planning-search-field")

        verify(searchField !== null)
        compare(searchField.activeFocus, false)

        host.planningSearchQuery = "synced from root"
        wait(0)

        compare(searchField.text, "synced from root")
    }

    function test_filterButtonUpdatesPlanningSettings() {
        const host = createHost()
        const filterButton = findByObjectName(host.toolbar, "planning-filter-blocked")

        verify(filterButton !== null)
        pressButton(filterButton)

        compare(host.engine.lastPlanningSettingsUpdate.viewFilter, "blocked")
    }

    function test_sortComboDispatchesSelectedSortMode() {
        const host = createHost()
        const sortCombo = findByObjectName(host.toolbar, "planning-sort-combo")

        verify(sortCombo !== null)
        sortCombo.currentIndex = 1
        sortCombo.activated(1)
        wait(0)

        compare(host.engine.lastPlanningSettingsUpdate.sortBy, "priority")
    }
}
