import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "OperatorParityHelpers.js" as OperatorParityHelpers

Rectangle {
    id: root
    objectName: "setup-control-surface-panel"
    required property var rootWindow
    required property var engineController
    property var copyDelegate: null
    property var actionTestDelegate: null
    property string copiedLabel: ""
    property string testStatus: "idle"
    property string testMessage: ""
    property string testedControlId: ""
    property var currentPage: rootWindow.controlSurfacePageById(rootWindow.selectedControlSurfacePageId)
    property var selectedControl: rootWindow.controlSurfaceControlById(
                                      rootWindow.selectedControlSurfacePageId,
                                      rootWindow.selectedControlSurfaceControlId
                                  )
    property var selectedInteractionSet: interactionSet(root.selectedControl)

    function controlListByPosition(controls) {
        const items = (controls || []).slice()
        items.sort(function(left, right) { return (left.position || 0) - (right.position || 0) })
        return items
    }

    function currentPageButtons() {
        return controlListByPosition(root.currentPage ? root.currentPage.buttons : [])
    }

    function currentPageDialPresses() {
        return controlListByPosition(
                    root.currentPage
                    ? root.currentPage.dials.filter(function(control) { return control.type === "dial-press" })
                    : []
                )
    }

    function interactionSet(control) {
        if (!control || !root.currentPage) {
            return []
        }

        if (!control.type || !control.type.startsWith("dial-")) {
            return [control]
        }

        return controlListByPosition(
                    (root.currentPage.dials || []).filter(function(candidate) {
                        return candidate.position === control.position
                    })
                )
    }

    function interactionTypeLabel(control) {
        if (!control) {
            return ""
        }

        switch (control.type) {
        case "button":
            return "Button " + control.position
        case "dial-press":
            return "Dial " + control.position + " Press"
        case "dial-turn-left":
            return "Dial " + control.position + " Left"
        case "dial-turn-right":
            return "Dial " + control.position + " Right"
        default:
            return control.type
        }
    }

    function actionSummary(control) {
        if (!control) {
            return "Select a slot to inspect its exact Companion action."
        }
        if (control.url && control.method) {
            return control.method + " " + control.url
        }
        if (control.pageNavTarget) {
            return "Navigate to " + control.pageNavTarget
        }
        return "No HTTP action"
    }

    function requestUrl(control) {
        if (!control || !control.url || engineController.controlSurfaceBaseUrl.length === 0) {
            return ""
        }
        if (control.url.startsWith("http://") || control.url.startsWith("https://")) {
            return control.url
        }
        return engineController.controlSurfaceBaseUrl + control.url
    }

    function bodySummary(control) {
        if (!control || !control.body) {
            return "No request body"
        }
        return JSON.stringify(control.body, null, 2)
    }

    function curlSummary(control) {
        if (!control || !control.url || !control.method) {
            return "No HTTP request"
        }

        const fullUrl = requestUrl(control)
        if (control.method === "GET") {
            return "curl \"" + fullUrl + "\""
        }

        const payload = control.body ? JSON.stringify(control.body) : "{}"
        return "curl -X " + control.method + " \"" + fullUrl
               + "\" -H \"Content-Type: application/json\" -d '" + payload + "'"
    }

    function selectPage(pageId) {
        const page = rootWindow.controlSurfacePageById(pageId)
        const controls = OperatorParityHelpers.controlSurfacePageControls(page)
        rootWindow.selectedControlSurfacePageId = pageId
        rootWindow.selectedControlSurfaceControlId = controls.length > 0 ? controls[0].id : ""
        root.testStatus = "idle"
        root.testMessage = ""
        root.testedControlId = ""
    }

    function selectControl(controlId) {
        rootWindow.selectedControlSurfaceControlId = controlId
        root.testStatus = "idle"
        root.testMessage = ""
        root.testedControlId = ""
    }

    function copyText(text, label) {
        if (!text || text.length === 0) {
            return
        }

        if (typeof root.copyDelegate === "function") {
            root.copyDelegate(text, label)
        } else {
            clipboardBuffer.text = text
            clipboardBuffer.selectAll()
            clipboardBuffer.copy()
            clipboardBuffer.deselect()
        }

        root.copiedLabel = label
        copyResetTimer.restart()
    }

    function applyTestResult(control, result) {
        root.testedControlId = control ? control.id : ""

        if (result && result.status) {
            root.testStatus = result.status
            root.testMessage = result.message || ""
            return
        }

        root.testStatus = "error"
        root.testMessage = "Unable to run the selected action test."
    }

    function runActionTest(control) {
        if (!control) {
            return
        }

        if (control.isPageNav || control.pageNavTarget) {
            root.applyTestResult(control, {
                "status": "success",
                "message": "Page jump actions stay inside Companion. No HTTP request is sent for this slot."
            })
            return
        }

        if (!control.url || !control.method) {
            root.applyTestResult(control, {
                "status": "error",
                "message": "This slot does not define a testable HTTP action."
            })
            return
        }

        if (typeof root.actionTestDelegate === "function") {
            root.applyTestResult(control, root.actionTestDelegate(control))
            return
        }

        const fullUrl = requestUrl(control)
        if (fullUrl.length === 0) {
            root.applyTestResult(control, {
                "status": "error",
                "message": "The local control-surface base URL is unavailable."
            })
            return
        }

        root.testedControlId = control.id
        root.testStatus = "loading"
        root.testMessage = "Running action test..."

        const request = new XMLHttpRequest()
        request.onreadystatechange = function() {
            if (request.readyState !== XMLHttpRequest.DONE) {
                return
            }

            if (request.status >= 200 && request.status < 300) {
                root.applyTestResult(control, {
                    "status": "success",
                    "message": "Action test succeeded."
                })
            } else {
                root.applyTestResult(control, {
                    "status": "error",
                    "message": "Action test failed with HTTP " + request.status + "."
                })
            }
        }
        request.onerror = function() {
            root.applyTestResult(control, {
                "status": "error",
                "message": "Action test could not reach the local control-surface bridge."
            })
        }
        request.open(control.method, fullUrl)
        if (control.method !== "GET") {
            request.setRequestHeader("Content-Type", "application/json")
            request.send(control.body ? JSON.stringify(control.body) : "{}")
        } else {
            request.send()
        }
    }

    visible: !!engineController && engineController.workspaceMode === "setup"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true

    TextEdit {
        id: clipboardBuffer
        visible: false
    }

    Timer {
        id: copyResetTimer
        interval: 1600
        repeat: false
        onTriggered: root.copiedLabel = ""
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Deck Layout"
                    color: "#8ea4c0"
                    font.pixelSize: 12
                }

                Label {
                    text: "Stream Deck+ replica"
                    color: "#f5f7fb"
                    font.pixelSize: 15
                    font.weight: Font.DemiBold
                }

                Label {
                    text: engineController.controlSurfaceSnapshotLoaded
                          ? "Select a page, inspect the exact generated slots, and validate actions before manual Companion exceptions."
                          : "Control-surface snapshot is loading from the engine."
                    color: "#b4c0cf"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Label {
                text: root.copiedLabel.length > 0 ? root.copiedLabel + " copied" : ""
                visible: root.copiedLabel.length > 0
                color: "#6fd3a4"
                font.pixelSize: 11
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Repeater {
                model: engineController.controlSurfacePages

                Button {
                    objectName: "setup-control-page-tab"
                    required property var modelData
                    text: modelData.label
                    highlighted: root.rootWindow.selectedControlSurfacePageId === modelData.id
                    onClicked: root.selectPage(modelData.id)
                }
            }
        }

        GridLayout {
            Layout.fillWidth: true
            columns: width >= 1300 ? 2 : 1
            columnSpacing: 12
            rowSpacing: 12

            Rectangle {
                id: replicaCard
                radius: 10
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                Layout.minimumHeight: 0
                implicitHeight: 452

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 10

                    Label {
                        objectName: "setup-control-page-title"
                        text: root.currentPage ? root.currentPage.label + " Page" : "No page selected"
                        color: "#f5f7fb"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }

                    GridLayout {
                        id: buttonGrid
                        Layout.fillWidth: true
                        columns: 4
                        columnSpacing: 8
                        rowSpacing: 8

                        Repeater {
                            model: root.currentPageButtons()

                            Button {
                                objectName: "setup-control-button"
                                required property var modelData
                                text: modelData.label
                                highlighted: root.rootWindow.selectedControlSurfaceControlId === modelData.id
                                Layout.fillWidth: true
                                onClicked: root.selectControl(modelData.id)
                            }
                        }
                    }

                    Rectangle {
                        radius: 20
                        color: "#132032"
                        border.color: "#28415d"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 68

                        GridLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            columns: 4
                            columnSpacing: 8
                            rowSpacing: 8

                            Repeater {
                                model: root.currentPageDialPresses()

                                Rectangle {
                                    objectName: "setup-control-lcd"
                                    required property var modelData
                                    radius: 8
                                    color: "#0c1320"
                                    border.color: "#24344a"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 44

                                    Label {
                                        anchors.centerIn: parent
                                        width: parent.width - 10
                                        text: modelData.label || "Empty"
                                        color: "#f5f7fb"
                                        font.pixelSize: 10
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                        wrapMode: Text.WordWrap
                                    }
                                }
                            }
                        }
                    }

                    Label {
                        text: "Dial Press Actions"
                        color: "#8ea4c0"
                        font.pixelSize: 11
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Repeater {
                            model: root.currentPageDialPresses()

                            Button {
                                objectName: "setup-control-dial"
                                required property var modelData
                                Layout.fillWidth: true
                                text: modelData.label
                                highlighted: root.rootWindow.selectedControlSurfaceControlId === modelData.id
                                onClicked: root.selectControl(modelData.id)
                            }
                        }
                    }
                }
            }

            Rectangle {
                id: detailCard
                radius: 10
                color: "#0c1320"
                border.color: "#24344a"
                border.width: 1
                Layout.fillWidth: true
                Layout.minimumHeight: 0
                implicitHeight: 452

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    Label {
                        text: "Detail Pane"
                        color: "#8ea4c0"
                        font.pixelSize: 11
                    }

                    Label {
                        objectName: "setup-control-detail-title"
                        text: root.selectedControl ? root.selectedControl.label : "Select a slot"
                        color: "#f5f7fb"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                    }

                    Label {
                        objectName: "setup-control-detail-description"
                        text: root.selectedControl
                              ? (root.selectedControl.description || "Inspect this generated slot before manual Companion changes.")
                              : "Inspect, copy, and test the exact generated action before making manual Companion changes."
                        color: "#d6dce5"
                        font.pixelSize: 11
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        visible: root.testStatus !== "idle" && root.testMessage.length > 0
                        radius: 8
                        color: root.testStatus === "success"
                               ? "#11261e"
                               : root.testStatus === "error"
                                 ? "#2b1718"
                                 : "#142235"
                        border.color: root.testStatus === "success"
                                      ? "#2b6c56"
                                      : root.testStatus === "error"
                                        ? "#7c3f43"
                                        : "#33567a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 44

                        Label {
                            objectName: "setup-control-test-status"
                            anchors.fill: parent
                            anchors.margins: 10
                            text: root.testMessage
                            color: "#f5f7fb"
                            font.pixelSize: 11
                            wrapMode: Text.WordWrap
                        }
                    }

                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true

                        ColumnLayout {
                            width: detailCard.width - 32
                            spacing: 10

                            Repeater {
                                model: root.selectedInteractionSet

                                Rectangle {
                                    required property var modelData
                                    radius: 8
                                    color: "#101826"
                                    border.color: "#24344a"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: interactionLayout.implicitHeight + 16

                                    ColumnLayout {
                                        id: interactionLayout
                                        anchors.fill: parent
                                        anchors.margins: 8
                                        spacing: 6

                                        Label {
                                            text: root.interactionTypeLabel(modelData)
                                            color: "#8ea4c0"
                                            font.pixelSize: 10
                                        }

                                        Label {
                                            objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                        ? "setup-control-detail-route"
                                                        : ""
                                            text: root.actionSummary(modelData)
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            wrapMode: Text.WrapAnywhere
                                            Layout.fillWidth: true
                                            font.family: "monospace"
                                        }

                                        Rectangle {
                                            radius: 6
                                            color: "#0c1320"
                                            border.color: "#24344a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: payloadText.implicitHeight + 14

                                            Label {
                                                id: payloadText
                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                            ? "setup-control-detail-payload"
                                                            : ""
                                                anchors.fill: parent
                                                anchors.margins: 7
                                                text: root.bodySummary(modelData)
                                                color: "#d6dce5"
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                font.family: "monospace"
                                            }
                                        }

                                        Label {
                                            visible: !!modelData.lcdKey
                                            text: modelData.lcdKey ? "LCD key: " + modelData.lcdKey : ""
                                            color: "#8ea4c0"
                                            font.pixelSize: 11
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        Label {
                                            visible: !!modelData.lcdRefreshKeys && modelData.lcdRefreshKeys.length > 0
                                            text: modelData.lcdRefreshKeys
                                                  ? "Refresh keys: " + modelData.lcdRefreshKeys.join(", ")
                                                  : ""
                                            color: "#8ea4c0"
                                            font.pixelSize: 11
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }

                                        RowLayout {
                                            Layout.fillWidth: true
                                            spacing: 8

                                            Button {
                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                            ? "setup-control-copy-url"
                                                            : ""
                                                text: root.copiedLabel === "URL" && root.testedControlId !== modelData.id
                                                      ? "Copied"
                                                      : "Copy URL"
                                                enabled: root.requestUrl(modelData).length > 0
                                                onClicked: root.copyText(root.requestUrl(modelData), "URL")
                                            }

                                            Button {
                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                            ? "setup-control-copy-body"
                                                            : ""
                                                text: root.copiedLabel === "Body" && root.testedControlId !== modelData.id
                                                      ? "Copied"
                                                      : "Copy Body"
                                                enabled: !!modelData.body
                                                onClicked: root.copyText(root.bodySummary(modelData), "Body")
                                            }

                                            Button {
                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                            ? "setup-control-copy-curl"
                                                            : ""
                                                text: root.copiedLabel === "curl" && root.testedControlId !== modelData.id
                                                      ? "Copied"
                                                      : "Copy curl"
                                                onClicked: root.copyText(root.curlSummary(modelData), "curl")
                                            }

                                            Button {
                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                            ? "setup-control-run-test"
                                                            : ""
                                                text: root.testStatus === "loading" && root.testedControlId === modelData.id
                                                      ? "Testing..."
                                                      : "Test"
                                                enabled: root.testStatus !== "loading"
                                                onClicked: root.runActionTest(modelData)
                                            }
                                        }
                                    }
                                }
                            }

                            Item {
                                visible: root.selectedInteractionSet.length === 0
                                Layout.fillWidth: true
                                implicitHeight: 48

                                Label {
                                    anchors.fill: parent
                                    text: "Select a button or dial to inspect its exact route, payload, copy actions, and live test result."
                                    color: "#b4c0cf"
                                    wrapMode: Text.WordWrap
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
