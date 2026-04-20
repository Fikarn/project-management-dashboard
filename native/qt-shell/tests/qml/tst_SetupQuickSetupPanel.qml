import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "SetupQuickSetupPanel"
    when: windowShown
    width: 1280
    height: 720

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: panelHostComponent

        Item {
            id: host
            width: 1280
            height: 720

            property alias panel: panel
            property alias rootWindow: rootWindowStub
            property alias engine: engineControllerStub
            property var copiedEntries: []

            QtObject {
                id: rootWindowStub
                property string selectedControlSurfacePageId: "projects"

                function controlSurfacePageById(pageId) {
                    return engineControllerStub.controlSurfacePages.find(function(page) { return page.id === pageId }) || null
                }
            }

            QtObject {
                id: engineControllerStub

                property bool operatorUiReady: true
                property string controlSurfaceBaseUrl: "http://127.0.0.1:38201"
                property string companionExportPath: ""
                property int exportCalls: 0
                property string exportedBaseUrl: ""
                property int refreshCalls: 0
                property var controlSurfacePages: [
                    {
                        "id": "projects",
                        "label": "PROJECTS",
                        "buttons": [{ "id": "btn-1", "position": 1, "label": "All" }],
                        "dials": [{ "id": "dial-1", "position": 1, "type": "dial-press", "label": "Project" }]
                    },
                    {
                        "id": "audio",
                        "label": "AUDIO",
                        "buttons": [{ "id": "btn-2", "position": 1, "label": "48V 1" }],
                        "dials": [{ "id": "dial-2", "position": 1, "type": "dial-press", "label": "Ch 1" }]
                    }
                ]

                function exportCompanionConfig(baseUrlOverride) {
                    exportCalls += 1
                    exportedBaseUrl = baseUrlOverride
                    companionExportPath = "/tmp/sse-native.companionconfig"
                }

                function requestControlSurfaceSnapshot() {
                    refreshCalls += 1
                }
            }

            SetupQuickSetupPanel {
                id: panel
                anchors.fill: parent
                rootWindow: rootWindowStub
                engineController: engineControllerStub
                copyDelegate: function(text, label) {
                    host.copiedEntries.push({ "text": text, "label": label })
                }
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(panelHostComponent, container)
        verify(!!host)
        waitForRendering(host)
        return host
    }

    function findChild(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const children = item.children || []
        for (let index = 0; index < children.length; index += 1) {
            const match = findChild(children[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function clickButton(button) {
        verify(!!button)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_exportUsesNativeBridgeState() {
        const host = createHost()

        compare(findChild(host.panel, "setup-base-url-field").text, "http://localhost:3000")
        findChild(host.panel, "setup-base-url-field").text = "http://localhost:3000"
        wait(0)

        clickButton(findChild(host.panel, "setup-export-profile"))
        wait(0)
        compare(host.engine.exportCalls, 1)
        compare(host.engine.exportedBaseUrl, "http://localhost:3000")
        compare(host.engine.companionExportPath, "/tmp/sse-native.companionconfig")
        compare(findChild(host.panel, "setup-export-path").text, "Profile downloaded")
    }
}
