import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "PlanningSummaryGrid"
    when: windowShown
    width: 1280
    height: 220

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: summaryHostComponent

        Item {
            id: host
            width: 1280
            height: 220

            property alias grid: summaryGrid

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "planning"
                property var planningProjects: [
                    { "id": "project-a", "status": "todo" },
                    { "id": "project-b", "status": "blocked" },
                    { "id": "project-c", "status": "done" }
                ]
                property var planningTasks: [
                    { "id": "task-a", "completed": false },
                    { "id": "task-b", "completed": false },
                    { "id": "task-c", "completed": true }
                ]
                property int planningRunningTaskCount: 2
            }

            PlanningSummaryGrid {
                id: summaryGrid
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(summaryHostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.grid)
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

    function test_summaryCardsReflectLegacyBoardStats() {
        const host = createHost()

        compare(findByObjectName(host.grid, "planning-summary-active-projects").summaryValue, 2)
        compare(findByObjectName(host.grid, "planning-summary-running-timers").summaryValue, 2)
        compare(findByObjectName(host.grid, "planning-summary-blocked").summaryValue, 1)
        compare(findByObjectName(host.grid, "planning-summary-open-tasks").summaryValue, 2)
    }
}
