import QtQuick
import QtQuick.Controls
import QtTest
import "../../qml"

TestCase {
    name: "SetupControlSurfacePanel"
    when: windowShown
    width: 1500
    height: 960

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: panelHostComponent

        Item {
            id: host
            width: 1500
            height: 960

            property alias panel: panel
            property alias rootWindow: rootWindowStub
            property alias engine: engineControllerStub
            property var copiedEntries: []
            property var testedEntries: []

            QtObject {
                id: rootWindowStub

                property string selectedControlSurfacePageId: "projects"
                property string selectedControlSurfaceControlId: "proj-btn-1"
                property bool controlSurfaceOverviewVerifyMode: false

                function controlSurfacePageById(pageId) {
                    for (let index = 0; index < engineControllerStub.controlSurfacePages.length; index += 1) {
                        if (engineControllerStub.controlSurfacePages[index].id === pageId) {
                            return engineControllerStub.controlSurfacePages[index]
                        }
                    }
                    return null
                }

                function controlSurfaceControlById(pageId, controlId) {
                    const page = controlSurfacePageById(pageId)
                    if (!page) {
                        return null
                    }

                    const controls = page.buttons.concat(page.dials)
                    for (let index = 0; index < controls.length; index += 1) {
                        if (controls[index].id === controlId) {
                            return controls[index]
                        }
                    }
                    return null
                }
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "setup"
                property bool operatorUiReady: true
                property bool controlSurfaceSnapshotLoaded: true
                property string controlSurfaceBaseUrl: "http://127.0.0.1:38201"
                property var controlSurfacePages: [
                    {
                        "id": "projects",
                        "label": "PROJECTS",
                        "buttons": [
                            {
                                "id": "proj-btn-1",
                                "label": "All",
                                "description": "Set project filter to all.",
                                "type": "button",
                                "position": 1,
                                "method": "POST",
                                "url": "/api/deck/action",
                                "body": { "action": "setFilter", "value": "all" }
                            },
                            {
                                "id": "proj-btn-4",
                                "label": "TASKS >>",
                                "description": "Navigate to tasks.",
                                "type": "button",
                                "position": 4,
                                "isPageNav": true,
                                "pageNavTarget": "TASKS",
                                "lcdRefreshKeys": ["project_nav", "task_nav"]
                            }
                        ],
                        "dials": [
                            {
                                "id": "proj-dial-1-press",
                                "label": "Project",
                                "description": "Open the current project detail.",
                                "type": "dial-press",
                                "position": 1,
                                "method": "POST",
                                "url": "/api/deck/action",
                                "body": { "action": "openDetail" },
                                "lcdKey": "project_nav"
                            },
                            {
                                "id": "proj-dial-1-left",
                                "label": "Prev Project",
                                "description": "Select the previous project.",
                                "type": "dial-turn-left",
                                "position": 1,
                                "method": "POST",
                                "url": "/api/deck/action",
                                "body": { "action": "selectPrevProject" }
                            },
                            {
                                "id": "proj-dial-1-right",
                                "label": "Next Project",
                                "description": "Select the next project.",
                                "type": "dial-turn-right",
                                "position": 1,
                                "method": "POST",
                                "url": "/api/deck/action",
                                "body": { "action": "selectNextProject" }
                            }
                        ]
                    },
                    {
                        "id": "audio",
                        "label": "AUDIO",
                        "buttons": [
                            {
                                "id": "audio-btn-6",
                                "label": "48V 1",
                                "description": "Toggle 48V on channel 1.",
                                "type": "button",
                                "position": 6,
                                "method": "POST",
                                "url": "/api/deck/audio-action",
                                "body": { "action": "togglePhantom", "value": "1" }
                            }
                        ],
                        "dials": [
                            {
                                "id": "audio-dial-1-press",
                                "label": "Ch 1",
                                "description": "Toggle mute on channel 1.",
                                "type": "dial-press",
                                "position": 1,
                                "method": "POST",
                                "url": "/api/deck/audio-action",
                                "body": { "action": "toggleMute", "value": "1" },
                                "lcdKey": "audio_ch_nav"
                            }
                        ]
                    }
                ]
            }

            SetupControlSurfacePanel {
                id: panel
                width: parent.width
                height: parent.height
                rootWindow: rootWindowStub
                engineController: engineControllerStub
                copyDelegate: function(text, label) {
                    host.copiedEntries.push({ "text": text, "label": label })
                }
                actionTestDelegate: function(control) {
                    host.testedEntries.push(control.id)
                    return {
                        "status": "success",
                        "message": "Stub test succeeded for " + control.id + "."
                    }
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

    function findChildrenByObjectName(item, objectName, matches) {
        if (!item) {
            return matches
        }

        if (item.objectName === objectName) {
            matches.push(item)
        }

        const children = item.children || []
        for (let index = 0; index < children.length; index += 1) {
            findChildrenByObjectName(children[index], objectName, matches)
        }

        return matches
    }

    function objectWithText(parent, objectName, text) {
        const matches = findChildrenByObjectName(parent, objectName, [])
        for (let index = 0; index < matches.length; index += 1) {
            if (matches[index].text === text) {
                return matches[index]
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

    function test_pageTabsSwitchReplicaSelection() {
        const host = createHost()
        const audioTab = objectWithText(host.panel, "setup-control-page-tab", "AUDIO")
        verify(!!audioTab)

        clickButton(audioTab)

        compare(host.rootWindow.selectedControlSurfacePageId, "audio")
        compare(host.rootWindow.selectedControlSurfaceControlId, "audio-btn-6")
        compare(findChild(host.panel, "setup-control-page-title").text, "AUDIO Page")
        compare(findChild(host.panel, "setup-control-detail-title").text, "48V 1")
    }

    function test_detailPanelShowsDialInteractionSetAndCopyActions() {
        const host = createHost()

        host.panel.selectControl("proj-dial-1-press")
        compare(host.panel.selectedInteractionSet.length, 3)
        compare(findChild(host.panel, "setup-control-detail-payload").text, "{\n  \"action\": \"openDetail\"\n}")
        compare(findChildrenByObjectName(host.panel, "setup-control-lcd", []).length >= 1, true)

        clickButton(findChild(host.panel, "setup-control-copy-url"))
        compare(host.copiedEntries.length, 1)
        compare(host.copiedEntries[0].label, "URL")
        compare(host.copiedEntries[0].text, "http://127.0.0.1:38201/api/deck/action")
    }

    function test_pageNavigationSelectionShowsCompanionNativeAction() {
        const host = createHost()

        host.panel.selectControl("proj-btn-4")

        compare(findChild(host.panel, "setup-control-detail-title").text, "TASKS >>")
        compare(findChild(host.panel, "setup-control-detail-route").text, "Companion Native Action")
    }

    function test_runTestUsesDelegateAndShowsStatus() {
        const host = createHost()

        host.panel.selectControl("proj-dial-1-press")
        clickButton(findChild(host.panel, "setup-control-run-test"))

        compare(host.testedEntries.length, 1)
        compare(host.testedEntries[0], "proj-dial-1-press")
        compare(findChild(host.panel, "setup-control-test-status").text, "Stub test succeeded for proj-dial-1-press.")
    }
}
