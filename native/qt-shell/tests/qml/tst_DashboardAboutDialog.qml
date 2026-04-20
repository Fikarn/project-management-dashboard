import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "DashboardAboutDialog"
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

            property bool aboutDialogVisible: true
            property alias dialog: dialog

            QtObject {
                id: engineControllerStub

                property string engineVersion: "1.0.0"
                property string supportLatestBackupPath: ""
            }

            DashboardAboutDialog {
                id: dialog
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                open: host.aboutDialogVisible
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

    function test_buttonsArePresentAndDisabledForCurrentNativeShellState() {
        const host = createHost()
        const openAtLoginButton = findByObjectName(host.dialog, "dashboard-about-open-at-login")
        const checkUpdatesButton = findByObjectName(host.dialog, "dashboard-about-check-updates")

        verify(findByObjectName(host.dialog, "dashboard-about-surface") !== null)
        verify(openAtLoginButton !== null)
        verify(checkUpdatesButton !== null)
        compare(openAtLoginButton.enabled, false)
        compare(checkUpdatesButton.enabled, false)
    }

    function test_backdropTapClosesDialog() {
        const host = createHost()
        host.dialog.closeDialog()

        compare(host.aboutDialogVisible, false)
    }
}
