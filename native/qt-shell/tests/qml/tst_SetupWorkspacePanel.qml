import QtQuick
import QtQuick.Layouts
import QtTest
import "../../qml"

TestCase {
    name: "SetupWorkspacePanel"
    when: windowShown
    width: 1920
    height: 1080

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: workspaceHostComponent

        Item {
            id: host
            width: 1920
            height: 1080

            property alias panel: setupPanel
            property alias engine: engineControllerStub
            property real dashboardUiScale: 1.0
            property string supportRestorePathDraft: ""
            property string selectedControlSurfacePageId: "projects"
            property string selectedControlSurfaceControlId: "proj-btn-1"
            property bool controlSurfaceOverviewVerifyMode: false

            function controlSurfacePageById(pageId) {
                return engineControllerStub.controlSurfacePages.find(function(page) { return page.id === pageId }) || null
            }

            function controlSurfaceControlById(pageId, controlId) {
                const page = controlSurfacePageById(pageId)
                if (!page) {
                    return null
                }
                return page.buttons.concat(page.dials).find(function(control) { return control.id === controlId }) || null
            }

            function commissioningCheckById(checkId) {
                return engineControllerStub.commissioningChecks.find(function(check) { return check.id === checkId }) || null
            }

            function commissioningStatusLabel(status) {
                if (status === "ok") {
                    return "Console reachable"
                }
                if (status === "error") {
                    return "Probe failed"
                }
                return "Not tested"
            }

            function commissioningStatusColor(status) {
                if (status === "ok") {
                    return "#6fd3a4"
                }
                if (status === "error") {
                    return "#ff9a7d"
                }
                return "#9bb0c9"
            }

            function formatFileSize(sizeBytes) {
                return sizeBytes + " B"
            }

            function formatUnixTimestamp(timestamp) {
                return timestamp
            }

            function hostPlatformLabel() { return "macOS Apple Silicon" }
            function hostInstallerArtifact() { return "SSE-ExEd-Studio-Control-Native-macOS-Installer.zip" }
            function hostUpdateArtifact() { return "SSE-ExEd-Studio-Control-Native-macOS-UpdateRepository.zip" }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "setup"
                property bool operatorUiReady: true
                property bool controlSurfaceSnapshotLoaded: true
                property string controlSurfaceBaseUrl: "http://127.0.0.1:38201"
                property bool controlSurfaceAvailable: true
                property string companionExportPath: "/tmp/native.companionconfig"
                property bool supportSnapshotLoaded: true
                property string supportDetails: "Native support archives protect planning, lighting, audio, and setup state."
                property string supportRestoreDetails: "Restore from a native support backup archive."
                property string supportBackupDir: "/tmp/backups"
                property string supportLatestBackupPath: "/tmp/backups/latest.json"
                property int supportBackupCount: 2
                property var supportBackupFiles: [
                    { "name": "backup-a.json", "sizeBytes": 200, "modifiedAt": "2026-04-17T12:00:00Z" },
                    { "name": "backup-b.json", "sizeBytes": 180, "modifiedAt": "2026-04-17T13:00:00Z" }
                ]
                property string shellDiagnosticsExportPath: ""
                property string appDataPath: "/tmp/appdata"
                property string databasePath: "/tmp/appdata/state.sqlite"
                property string logsPath: "/tmp/appdata/logs"
                property string engineLogPath: "/tmp/appdata/logs/engine.log"
                property string engineVersion: "0.1.0"
                property int protocolVersion: 1
                property var commissioningChecks: [
                    { "id": "control-surface", "status": "ok", "message": "Connected — 2 projects available" }
                ]
                property var controlSurfacePages: [
                    {
                        "id": "projects",
                        "label": "PROJECTS",
                        "buttons": [
                            { "id": "proj-btn-1", "label": "All", "position": 1, "type": "button", "method": "POST", "url": "/api/deck/action", "body": { "action": "setFilter", "value": "all" } }
                        ],
                        "dials": [
                            { "id": "proj-dial-1-press", "label": "Project", "position": 1, "type": "dial-press", "method": "POST", "url": "/api/deck/action", "body": { "action": "openDetail" } }
                        ]
                    },
                    {
                        "id": "audio",
                        "label": "AUDIO",
                        "buttons": [
                            { "id": "audio-btn-1", "label": "48V 1", "position": 1, "type": "button", "method": "POST", "url": "/api/deck/audio-action", "body": { "action": "togglePhantom", "value": "1" } }
                        ],
                        "dials": [
                            { "id": "audio-dial-1-press", "label": "Ch 1", "position": 1, "type": "dial-press", "method": "POST", "url": "/api/deck/audio-action", "body": { "action": "toggleMute", "value": "1" } }
                        ]
                    }
                ]

                function exportCompanionConfig() {}
                function requestControlSurfaceSnapshot() {}
                function runControlSurfaceProbe() {}
                function exportSupportBackup() {}
                function openSupportBackupDirectory() {}
                function requestSupportSnapshot() {}
                function restoreSupportBackup() {}
                function exportShellDiagnostics() {}
                function openAppDataDirectory() {}
                function openLogsDirectory() {}
                function openEngineLogFile() {}
            }

            SetupWorkspacePanel {
                id: setupPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                scaleFactor: dashboardUiScale
            }
        }
    }

    function createHost() {
        const host = createTemporaryObject(workspaceHostComponent, container)
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

    function clickButton(button) {
        verify(button !== null)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_workspaceFitsOperatorViewport() {
        const host = createHost()
        compare(host.panel.contentFitsViewport(), true)
    }

    function test_supportVerifyHelpersToggleExpandedSupportState() {
        const host = createHost()

        compare(host.panel.activeSection, "commissioning")
        host.panel.openLegacySupportPanelsForVerify()
        compare(host.panel.activeSection, "support")
        compare(findByObjectName(host.panel, "setup-guide-panel").manualVisible, true)
        compare(findByObjectName(host.panel, "setup-installer-help-panel").expanded, true)

        host.panel.resetVerifyState()
        compare(host.panel.activeSection, "commissioning")
        compare(findByObjectName(host.panel, "setup-guide-panel").manualVisible, false)
        compare(findByObjectName(host.panel, "setup-installer-help-panel").expanded, false)
    }
}
