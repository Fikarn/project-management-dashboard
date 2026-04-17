import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "LightingToolbarPanel"
    when: windowShown
    width: 1280
    height: 220

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: toolbarHostComponent

        Item {
            id: host
            width: 1280
            height: 220

            property alias panel: lightingToolbar
            property alias engine: engineControllerStub
            property int lightingGrandMasterDraft: 100

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "lighting"
                property int lightingFixtureCount: 4
                property bool lightingEnabled: true
                property bool lightingReachable: true
                property var lastLightingSettingsUpdate: null
                property var lastAllPower: null
                property int lightingRefreshCalls: 0
                property int lightingDmxRefreshCalls: 0

                function updateLightingSettings(changes) {
                    lastLightingSettingsUpdate = changes
                }

                function setLightingAllPower(on) {
                    lastAllPower = on
                }

                function requestLightingSnapshot() {
                    lightingRefreshCalls += 1
                }

                function requestLightingDmxMonitorSnapshot() {
                    lightingDmxRefreshCalls += 1
                }
            }

            LightingToolbarPanel {
                id: lightingToolbar
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
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_toolbar_restores_hold_and_gm_contract() {
        const host = createHost()
        const allOff = findByObjectName(host.panel, "lighting-all-off-button")

        verify(allOff !== null)
        compare(allOff.delay, 2000)

        host.panel.applyGrandMasterDraft(72)
        compare(host.lightingGrandMasterDraft, 72)

        host.panel.commitGrandMaster(72)
        compare(host.engine.lastLightingSettingsUpdate.grandMaster, 72)
    }

    function test_toolbar_refresh_and_hint_controls_are_wired() {
        const host = createHost()
        const refreshButton = findByObjectName(host.panel, "lighting-refresh-button")
        const statusButton = findByObjectName(host.panel, "lighting-dmx-status-button")

        pressButton(refreshButton)
        compare(host.engine.lightingRefreshCalls, 1)
        compare(host.engine.lightingDmxRefreshCalls, 1)

        compare(host.panel.dmxHintVisible, false)
        pressButton(statusButton)
        compare(host.panel.dmxHintVisible, true)
        pressButton(statusButton)
        compare(host.panel.dmxHintVisible, false)
    }
}
