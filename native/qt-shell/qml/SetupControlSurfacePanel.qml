import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "OperatorParityHelpers.js" as OperatorParityHelpers

Rectangle {
    id: root
    objectName: "setup-control-surface-panel"
    required property var rootWindow
    required property var engineController
    property bool denseMode: false
    readonly property bool detailRailLayout: root.width >= (root.denseMode ? 1120 : 1200)
    readonly property int summaryCardColumns: root.detailRailLayout ? 3 : 1
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

    function interactionKindLabel(control) {
        if (!control) {
            return "Empty Slot"
        }
        if (control.isPageNav || control.pageNavTarget) {
            return "Companion Native Action"
        }
        if (control.type === "button") {
            return "Button"
        }
        if (control.type && control.type.startsWith("dial-")) {
            return "Dial"
        }
        return "Action"
    }

    function interactionHeadline(control) {
        if (!control) {
            return "Empty Slot"
        }
        return interactionKindLabel(control) + " \u00b7 " + interactionTypeLabel(control)
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

    function selectedSummaryLabel() {
        if (!root.selectedControl) {
            return "No slot selected"
        }

        return root.selectedControl.label
    }

    function selectedSummaryDetail() {
        if (!root.selectedControl) {
            return "Choose a control to inspect"
        }

        return root.interactionTypeLabel(root.selectedControl)
    }

    function interactionSetSummary() {
        return root.selectedInteractionSet.length > 0
               ? String(root.selectedInteractionSet.length)
               : "—"
    }

    function interactionSetDetail() {
        return root.selectedInteractionSet.length > 0
               ? "Press action or full dial interaction group"
               : "Press action or full dial interaction group"
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
        rootWindow.controlSurfaceOverviewVerifyMode = false
        rootWindow.selectedControlSurfacePageId = pageId
        rootWindow.selectedControlSurfaceControlId = controls.length > 0 ? controls[0].id : ""
        root.testStatus = "idle"
        root.testMessage = ""
        root.testedControlId = ""
    }

    function selectControl(controlId) {
        rootWindow.controlSurfaceOverviewVerifyMode = false
        rootWindow.selectedControlSurfaceControlId = controlId
        root.testStatus = "idle"
        root.testMessage = ""
        root.testedControlId = ""
    }

    function showPageOverviewForVerify() {
        if (!rootWindow.selectedControlSurfacePageId.length && engineController.controlSurfacePages.length > 0) {
            rootWindow.selectedControlSurfacePageId = engineController.controlSurfacePages[0].id
        }

        rootWindow.controlSurfaceOverviewVerifyMode = true
        rootWindow.selectedControlSurfaceControlId = ""
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
    radius: 16
    color: "#0f141d"
    border.color: "#232d3b"
    border.width: 1
    Layout.fillWidth: true
    implicitHeight: setupControlSurfaceLayout.implicitHeight + (root.denseMode ? 18 : 22)

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
        id: setupControlSurfaceLayout
        anchors.fill: parent
        anchors.margins: root.denseMode ? 9 : 11
        spacing: root.denseMode ? 9 : 11

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Deck Layout"
                    color: "#8894a7"
                    font.pixelSize: 11
                }

                Label {
                    text: "Stream Deck+ replica"
                    color: "#f5f7fb"
                    font.pixelSize: root.denseMode ? 14 : 15
                    font.weight: Font.DemiBold
                }

                Label {
                    text: engineController.controlSurfaceSnapshotLoaded
                          ? "Select a page, inspect the exact generated slots, and validate actions before manual Companion exceptions."
                          : "Control-surface snapshot is loading from the engine."
                    color: "#bcc5d0"
                    font.pixelSize: root.denseMode ? 9 : 10
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }

            Rectangle {
                radius: 11
                color: "#0b1018"
                border.color: "#202c3a"
                border.width: 1
                implicitWidth: root.denseMode ? 80 : 86
                implicitHeight: root.denseMode ? 50 : 56

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: root.denseMode ? 8 : 10
                    spacing: 2

                    Label {
                        text: "Mapped Slots"
                        color: "#8894a7"
                        font.pixelSize: 9
                    }

                    Label {
                        text: root.currentPageButtons().length + root.currentPageDialPresses().length
                        color: "#f5f7fb"
                        font.pixelSize: root.denseMode ? 13 : 14
                        font.weight: Font.DemiBold
                    }
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
            spacing: 7

            Repeater {
                model: engineController.controlSurfacePages

                ConsoleButton {
                    objectName: "setup-control-page-tab"
                    required property var modelData
                    text: modelData.label
                    tone: "tab"
                    dense: root.denseMode
                    active: root.rootWindow.selectedControlSurfacePageId === modelData.id
                    onClicked: root.selectPage(modelData.id)
                }
            }
        }

        GridLayout {
            Layout.fillWidth: true
            width: root.width
            columns: root.detailRailLayout ? 2 : 1
            columnSpacing: 10
            rowSpacing: 10

            Rectangle {
                id: replicaCard
                radius: 14
                color: "#0b1018"
                border.color: "#202c3a"
                border.width: 1
                Layout.fillWidth: true
                Layout.preferredWidth: root.detailRailLayout ? (root.denseMode ? 780 : 820) : -1
                Layout.minimumHeight: 0
                implicitHeight: root.denseMode ? 396 : 438

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: root.denseMode ? 8 : 10
                    spacing: root.denseMode ? 8 : 10

                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        Rectangle {
                            width: Math.min(parent.width, root.denseMode ? 760 : 820)
                            height: parent.height
                            anchors.horizontalCenter: parent.horizontalCenter
                            radius: root.denseMode ? 24 : 28
                            color: "#090d15"
                            border.color: "#1f2b39"
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: root.denseMode ? 14 : 17
                                spacing: root.denseMode ? 10 : 12

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 10

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2

                                        Label {
                                            text: "Active Companion Page"
                                            color: "#8894a7"
                                            font.pixelSize: 9
                                        }

                                        Label {
                                            objectName: "setup-control-page-title"
                                            text: root.currentPage ? root.currentPage.label + " Page" : "No page selected"
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                        }
                                    }

                                    Rectangle {
                                        radius: 999
                                        color: "#101620"
                                        border.color: "#253141"
                                        border.width: 1
                                        implicitWidth: 96
                                        implicitHeight: 22

                                        Label {
                                            anchors.centerIn: parent
                                            text: "Stream Deck+"
                                            color: "#8894a7"
                                            font.pixelSize: 8
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                GridLayout {
                                    id: buttonGrid
                                    Layout.fillWidth: true
                                    columns: 4
                                    columnSpacing: root.denseMode ? 10 : 12
                                    rowSpacing: root.denseMode ? 10 : 12

                                    Repeater {
                                        model: root.currentPageButtons()

                                        Rectangle {
                                            objectName: "setup-control-button"
                                            required property var modelData
                                            readonly property bool selected: root.rootWindow.selectedControlSurfaceControlId === modelData.id
                                            radius: root.denseMode ? 15 : 17
                                            color: selected
                                                   ? Qt.rgba(0.23, 0.52, 0.96, 0.1)
                                                   : Qt.rgba(0.09, 0.11, 0.15, 0.98)
                                            border.width: 1
                                            border.color: selected ? "#4d7ccb" : "#293443"
                                            Layout.fillWidth: true
                                            implicitHeight: root.denseMode ? 68 : 76

                                            Label {
                                                anchors.centerIn: parent
                                                width: parent.width - 14
                                                text: modelData.label
                                                color: "#f5f7fb"
                                                font.pixelSize: root.denseMode ? 9 : 10
                                                font.weight: Font.DemiBold
                                                horizontalAlignment: Text.AlignHCenter
                                                verticalAlignment: Text.AlignVCenter
                                                wrapMode: Text.WordWrap
                                            }

                                            TapHandler {
                                                onTapped: root.selectControl(modelData.id)
                                            }
                                        }
                                    }
                                }

                                Rectangle {
                                    radius: 999
                                    color: "#142032"
                                    border.color: "#26405d"
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: root.denseMode ? 40 : 48

                                    GridLayout {
                                        anchors.fill: parent
                                        anchors.margins: root.denseMode ? 8 : 10
                                        columns: 4
                                        columnSpacing: root.denseMode ? 6 : 8
                                        rowSpacing: root.denseMode ? 6 : 8

                                        Repeater {
                                            model: root.currentPageDialPresses()

                                            Rectangle {
                                                objectName: "setup-control-lcd"
                                                required property var modelData
                                                radius: 10
                                                color: "#0b1018"
                                                border.color: "#202c3a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: root.denseMode ? 24 : 28

                                                Label {
                                                    anchors.centerIn: parent
                                                    width: parent.width - 8
                                                    text: modelData.label || "Empty"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: root.denseMode ? 8 : 9
                                                    horizontalAlignment: Text.AlignHCenter
                                                    verticalAlignment: Text.AlignVCenter
                                                    wrapMode: Text.WordWrap
                                                }
                                            }
                                        }
                                    }
                                }

                                Label {
                                    text: "Dial Press Inventory"
                                    color: "#8894a7"
                                    font.pixelSize: 9
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: root.denseMode ? 8 : 10

                                    Repeater {
                                        model: root.currentPageDialPresses()

                                        Item {
                                            objectName: "setup-control-dial"
                                            required property var modelData
                                            Layout.fillWidth: true
                                            implicitHeight: root.denseMode ? 86 : 96

                                            readonly property bool selected: root.rootWindow.selectedControlSurfaceControlId === modelData.id

                                            Rectangle {
                                                width: Math.min(parent.width, parent.implicitHeight)
                                                height: width
                                                anchors.centerIn: parent
                                                radius: width / 2
                                                color: selected
                                                       ? Qt.rgba(0.23, 0.52, 0.96, 0.1)
                                                       : Qt.rgba(0.07, 0.1, 0.15, 0.96)
                                                border.width: 2
                                                border.color: selected ? "#4d7ccb" : "#3d4e65"

                                                Rectangle {
                                                    anchors.horizontalCenter: parent.horizontalCenter
                                                    anchors.top: parent.top
                                                    anchors.topMargin: root.denseMode ? 8 : 10
                                                    width: 5
                                                    height: 12
                                                    radius: 2
                                                    color: "#c9d3df"
                                                    opacity: 0.72
                                                }

                                                ColumnLayout {
                                                    anchors.centerIn: parent
                                                    spacing: 2

                                                    Label {
                                                        text: modelData.label
                                                        color: "#f5f7fb"
                                                        font.pixelSize: root.denseMode ? 9 : 10
                                                        font.weight: Font.DemiBold
                                                        horizontalAlignment: Text.AlignHCenter
                                                        wrapMode: Text.WordWrap
                                                    }

                                                    Label {
                                                        text: "Dial " + modelData.position
                                                        color: "#8894a7"
                                                        font.pixelSize: 8
                                                        horizontalAlignment: Text.AlignHCenter
                                                    }
                                                }

                                                TapHandler {
                                                    onTapped: root.selectControl(modelData.id)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Rectangle {
                id: detailCard
                radius: 14
                color: "#0b1018"
                border.color: "#202c3a"
                border.width: 1
                Layout.alignment: Qt.AlignTop
                Layout.fillWidth: true
                Layout.preferredWidth: root.detailRailLayout ? (root.denseMode ? 552 : 594) : -1
                Layout.minimumHeight: 0
                implicitHeight: root.denseMode ? 396 : 438

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: root.denseMode ? 8 : 10
                    spacing: root.denseMode ? 8 : 10

                    GridLayout {
                        Layout.fillWidth: true
                        columns: root.summaryCardColumns
                        columnSpacing: 7
                        rowSpacing: 7

                        Repeater {
                            model: [
                                { "label": "Selection", "value": root.selectedSummaryLabel(), "detail": root.selectedSummaryDetail() },
                                { "label": "Interaction Set", "value": root.interactionSetSummary(), "detail": root.interactionSetDetail() },
                                { "label": "Page Role", "value": root.currentPage ? root.currentPage.label : "\u2014", "detail": "Mapped for fixed workstation use" }
                            ]

                            Rectangle {
                                required property var modelData
                                radius: 11
                                color: "#0e131b"
                                border.color: "#202c3a"
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: root.denseMode ? 62 : 66

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 8
                                    spacing: 3

                                    Label {
                                        text: modelData.label
                                        color: "#8894a7"
                                        font.pixelSize: 9
                                    }

                                    Label {
                                        text: modelData.value
                                        color: "#f5f7fb"
                                        font.pixelSize: 10
                                        font.weight: Font.Medium
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    Label {
                                        text: modelData.detail
                                        color: "#7f8ea4"
                                        font.pixelSize: 8
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 999
                        color: "#0e131b"
                        border.color: "#202c3a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: root.denseMode ? 26 : 30

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 8

                            Label {
                                text: "Button action pages"
                                color: "#7f8ea4"
                                font.pixelSize: 8
                            }

                            Label {
                                text: "Dial press details and API payloads"
                                color: "#7f8ea4"
                                font.pixelSize: 8
                            }

                            Item {
                                Layout.fillWidth: true
                            }

                            Label {
                                text: "Built-in live test support"
                                color: "#7f8ea4"
                                font.pixelSize: 8
                            }
                        }
                    }

                    Rectangle {
                        radius: 11
                        color: "#0e131b"
                        border.color: "#202c3a"
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        implicitHeight: detailContentLayout.implicitHeight + 16

                        ColumnLayout {
                            id: detailContentLayout
                            anchors.fill: parent
                            anchors.margins: 7
                            spacing: root.denseMode ? 4 : 5

                            Label {
                                text: "Detail Pane"
                                color: "#8894a7"
                                font.pixelSize: 10
                            }

                            Label {
                                objectName: "setup-control-detail-title"
                                text: root.selectedControl
                                      ? root.selectedControl.label
                                      : (root.currentPage ? root.currentPage.label + " page overview" : "No slot selected")
                                color: "#f5f7fb"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                            }

                            Label {
                                objectName: "setup-control-detail-description"
                                text: root.selectedControl
                                      ? (root.selectedControl.description || "Inspect this generated slot before manual Companion changes.")
                                      : "Select a button or dial to inspect its exact Companion action, request path, and test result."
                                color: "#bcc5d0"
                                font.pixelSize: root.denseMode ? 9 : 10
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
                                implicitHeight: 40

                                Label {
                                    objectName: "setup-control-test-status"
                                    anchors.fill: parent
                                    anchors.margins: 9
                                    text: root.testMessage
                                    color: "#f5f7fb"
                                    font.pixelSize: 10
                                    wrapMode: Text.WordWrap
                                }
                            }

                            ScrollView {
                                id: detailScrollView
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                clip: true

                                ColumnLayout {
                                    width: detailScrollView.availableWidth > 0
                                           ? detailScrollView.availableWidth
                                           : detailCard.width - 32
                                    spacing: 10

                                    Repeater {
                                        model: root.selectedInteractionSet

                                        Rectangle {
                                            required property var modelData
                                            readonly property bool pageNavigationAction: !!modelData.pageNavTarget && !modelData.url
                                            radius: 11
                                            color: "#0c1118"
                                            border.color: "#202c3a"
                                            border.width: 1
                                            Layout.fillWidth: true
                                            implicitHeight: interactionLayout.implicitHeight + 12

                                            ColumnLayout {
                                                id: interactionLayout
                                                anchors.fill: parent
                                                anchors.margins: 7
                                                spacing: 5

                                                Label {
                                                    text: root.interactionHeadline(modelData)
                                                    color: "#8894a7"
                                                    font.pixelSize: 9
                                                    font.capitalization: Font.AllUppercase
                                                }

                                                Rectangle {
                                                    visible: pageNavigationAction
                                                    radius: 10
                                                    color: "#251d11"
                                                    border.color: "#6d522a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: pageJumpLayout.implicitHeight + 12

                                                    ColumnLayout {
                                                        id: pageJumpLayout
                                                        anchors.fill: parent
                                                        anchors.margins: 6
                                                        spacing: 4

                                                        Label {
                                                            objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                        ? "setup-control-detail-route"
                                                                        : ""
                                                            text: "Companion Native Action"
                                                            color: "#f2d6a2"
                                                            font.pixelSize: 9
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: "Use Companion's built-in Page Jump action to navigate to "
                                                                  + modelData.pageNavTarget
                                                                  + ". No HTTP call is required for this slot."
                                                            color: "#ead7b8"
                                                            font.pixelSize: 10
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    visible: !pageNavigationAction
                                                    radius: 9
                                                    color: "#0a0f17"
                                                    border.color: "#202c3a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: requestLayout.implicitHeight + 10

                                                    ColumnLayout {
                                                        id: requestLayout
                                                        anchors.fill: parent
                                                        anchors.margins: 5
                                                        spacing: 3

                                                        Label {
                                                            text: "Request"
                                                            color: "#7f8ea4"
                                                            font.pixelSize: 8
                                                        }

                                                        RowLayout {
                                                            Layout.fillWidth: true
                                                            spacing: 8

                                                            Rectangle {
                                                                radius: 999
                                                                color: modelData.method === "GET" ? "#173222" : "#142235"
                                                                border.color: modelData.method === "GET" ? "#2b6c56" : "#33567a"
                                                                border.width: 1
                                                                implicitHeight: 20
                                                                implicitWidth: methodLabel.implicitWidth + 14

                                                                Label {
                                                                    id: methodLabel
                                                                    anchors.centerIn: parent
                                                                    text: modelData.method || "Page Jump"
                                                                    color: "#f5f7fb"
                                                                    font.pixelSize: 9
                                                                    font.weight: Font.DemiBold
                                                                }
                                                            }

                                                            Rectangle {
                                                                radius: 999
                                                                color: "#111827"
                                                                border.color: "#2f3f54"
                                                                border.width: 1
                                                                implicitHeight: 20
                                                                implicitWidth: requestTypeLabel.implicitWidth + 14

                                                                Label {
                                                                    id: requestTypeLabel
                                                                    anchors.centerIn: parent
                                                                    text: root.interactionKindLabel(modelData)
                                                                    color: "#d6dce5"
                                                                    font.pixelSize: 9
                                                                }
                                                            }

                                                            Item {
                                                                Layout.fillWidth: true
                                                            }

                                                            ConsoleButton {
                                                                objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                            ? "setup-control-run-test"
                                                                            : ""
                                                                text: root.testStatus === "loading" && root.testedControlId === modelData.id
                                                                      ? "Testing..."
                                                                      : "Test"
                                                                dense: true
                                                                enabled: root.testStatus !== "loading"
                                                                onClicked: root.runActionTest(modelData)
                                                            }
                                                        }

                                                    }
                                                }

                                                Rectangle {
                                                    visible: !pageNavigationAction && !!modelData.url
                                                    radius: 9
                                                    color: "#0a0f17"
                                                    border.color: "#202c3a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: fullUrlText.implicitHeight + 12

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 5
                                                        spacing: 3

                                                        Label {
                                                            text: "Full URL"
                                                            color: "#7f8ea4"
                                                            font.pixelSize: 8
                                                        }

                                                        Label {
                                                            id: fullUrlText
                                                            text: root.requestUrl(modelData)
                                                            color: "#d6dce5"
                                                            font.pixelSize: 10
                                                            wrapMode: Text.WrapAnywhere
                                                            Layout.fillWidth: true
                                                            font.family: "Menlo"
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    visible: !pageNavigationAction && !!modelData.body
                                                    radius: 9
                                                    color: "#0a0f17"
                                                    border.color: "#202c3a"
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: payloadText.implicitHeight + 12

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 5
                                                        spacing: 3

                                                        Label {
                                                            text: "JSON Body"
                                                            color: "#7f8ea4"
                                                            font.pixelSize: 8
                                                        }

                                                        Label {
                                                            id: payloadText
                                                            objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                        ? "setup-control-detail-payload"
                                                                        : ""
                                                            text: root.bodySummary(modelData)
                                                            color: "#d6dce5"
                                                            font.pixelSize: 10
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                            font.family: "Menlo"
                                                        }
                                                    }
                                                }

                                                RowLayout {
                                                    visible: !pageNavigationAction
                                                    Layout.fillWidth: true
                                                    spacing: 8

                                                    ConsoleButton {
                                                        objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                    ? "setup-control-copy-url"
                                                                    : ""
                                                        text: root.copiedLabel === "URL" && root.testedControlId !== modelData.id
                                                              ? "Copied"
                                                              : "Copy URL"
                                                        dense: true
                                                        enabled: root.requestUrl(modelData).length > 0
                                                        onClicked: root.copyText(root.requestUrl(modelData), "URL")
                                                    }

                                                    ConsoleButton {
                                                        visible: !!modelData.body
                                                        objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                    ? "setup-control-copy-body"
                                                                    : ""
                                                        text: root.copiedLabel === "Body" && root.testedControlId !== modelData.id
                                                              ? "Copied"
                                                              : "Copy Body"
                                                        dense: true
                                                        enabled: !!modelData.body
                                                        onClicked: root.copyText(root.bodySummary(modelData), "Body")
                                                    }

                                                    ConsoleButton {
                                                        objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                    ? "setup-control-copy-curl"
                                                                    : ""
                                                        text: root.copiedLabel === "curl" && root.testedControlId !== modelData.id
                                                              ? "Copied"
                                                              : "Copy curl"
                                                        dense: true
                                                        onClicked: root.copyText(root.curlSummary(modelData), "curl")
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    Item {
                                        visible: root.selectedInteractionSet.length === 0
                                        Layout.fillWidth: true
                                        implicitHeight: overviewLayout.implicitHeight

                                        ColumnLayout {
                                            id: overviewLayout
                                            width: parent.width
                                            spacing: 10

                                            Rectangle {
                                                radius: 8
                                                color: "#0c1320"
                                                border.color: "#24344a"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: mappedButtonsLayout.implicitHeight + 16

                                                ColumnLayout {
                                                    id: mappedButtonsLayout
                                                    anchors.fill: parent
                                                    anchors.margins: 8
                                                    spacing: 6

                                                    Label {
                                                        text: "Mapped Buttons"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                    }

                                                    Flow {
                                                        Layout.fillWidth: true
                                                        spacing: 6

                                                        Repeater {
                                                            model: root.currentPageButtons()

                                                            Rectangle {
                                                                required property var modelData
                                                                radius: 10
                                                                color: "#0a0f18"
                                                                border.color: "#24344a"
                                                                border.width: 1
                                                                implicitHeight: 22
                                                                implicitWidth: mappedButtonLabel.implicitWidth + 12

                                                                Label {
                                                                    id: mappedButtonLabel
                                                                    anchors.centerIn: parent
                                                                    text: modelData.position + ": " + modelData.label
                                                                    color: "#d6dce5"
                                                                    font.pixelSize: 10
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            Rectangle {
                                                radius: 8
                                                color: "#132032"
                                                border.color: "#28415d"
                                                border.width: 1
                                                Layout.fillWidth: true
                                                implicitHeight: hintLayout.implicitHeight + 16

                                                ColumnLayout {
                                                    id: hintLayout
                                                    anchors.fill: parent
                                                    anchors.margins: 8
                                                    spacing: 4

                                                    Label {
                                                        text: "Commissioning Hint"
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                    }

                                                    Label {
                                                        text: "Start with the generated profile, then use this pane only for validation or exceptions."
                                                        color: "#d6dce5"
                                                        font.pixelSize: 11
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
