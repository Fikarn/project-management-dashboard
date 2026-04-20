import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "OperatorShortcutsDialog"
    when: windowShown
    width: 1280
    height: 900

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: hostComponent

        Item {
            id: host
            width: 1280
            height: 900

            property bool keyboardHelpVisible: true
            property alias dialog: dialog
            property alias engine: engineControllerStub

            QtObject {
                id: engineControllerStub
                property string lastWorkspaceMode: ""

                function setWorkspaceMode(workspaceMode) {
                    lastWorkspaceMode = workspaceMode
                }
            }

            OperatorShortcutsDialog {
                id: dialog
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                open: host.keyboardHelpVisible
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(hostComponent, container)
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(host.dialog)
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

    function test_setupLinkRoutesToSetupAndClosesDialog() {
        const host = createHost()
        host.dialog.openSetup()

        compare(host.engine.lastWorkspaceMode, "setup")
        compare(host.keyboardHelpVisible, false)
    }

    function test_homeLinkRoutesToPlanningAndClosesDialog() {
        const host = createHost()
        host.dialog.returnHome()

        compare(host.engine.lastWorkspaceMode, "planning")
        compare(host.keyboardHelpVisible, false)
    }
}
