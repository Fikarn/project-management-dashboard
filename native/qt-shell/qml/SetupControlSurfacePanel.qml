import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "OperatorParityHelpers.js" as OperatorParityHelpers

Item {
    id: root
    objectName: "setup-control-surface-panel"
    required property var rootWindow
    required property var engineController
    property bool denseMode: false
    property bool preferWideRailLayout: false
    readonly property bool detailRailLayout: root.preferWideRailLayout || root.width >= (root.denseMode ? 1080 : 1120)
    readonly property int summaryCardColumns: root.detailRailLayout ? 3 : 1
    property var copyDelegate: null
    property var actionTestDelegate: null
    property string copiedLabel: ""
    property string testStatus: "idle"
    property string testMessage: ""
    property string testedControlId: ""
    readonly property color deckSelectionBlue: "#4f83e1"
    readonly property color deckSelectionShadow: "#2563eb"
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

    function displayRequestUrl(control) {
        if (!control || !control.url) {
            return ""
        }
        if (control.url.startsWith("http://") || control.url.startsWith("https://")) {
            return control.url
        }
        const baseUrl = engineController.controlSurfaceBaseUrl === "http://127.0.0.1:38201"
                        ? "http://localhost:3000"
                        : engineController.controlSurfaceBaseUrl
        return baseUrl.length > 0 ? baseUrl + control.url : ""
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

    function detailDescription() {
        if (!root.selectedControl) {
            return "Select a button or dial to inspect its exact Companion action, request path, and test result."
        }

        const description = root.selectedControl.description || "Inspect this generated slot before manual Companion changes."
        return description.replace(/\.$/, "")
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

        const fullUrl = displayRequestUrl(control)
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

    ConsoleTheme {
        id: theme
    }

    visible: !!engineController && engineController.workspaceMode === "setup"
    Layout.fillWidth: true
    implicitHeight: setupControlSurfaceLayout.implicitHeight

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
        spacing: root.denseMode ? 10 : 12

        GridLayout {
            Layout.fillWidth: true
            width: root.width
            columns: root.detailRailLayout ? 2 : 1
            columnSpacing: 12
            rowSpacing: 12

            Rectangle {
                id: replicaCard
                radius: 20
                color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
                border.color: theme.surfaceBorder
                border.width: 1
                Layout.fillWidth: true
                Layout.preferredWidth: root.detailRailLayout ? 744 : -1
                Layout.minimumHeight: 0
                implicitHeight: 820

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        Layout.alignment: Qt.AlignTop
                        spacing: 8

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            Label {
                                text: "Deck Layout"
                                color: theme.studio500
                                font.pixelSize: 10
                                font.capitalization: Font.AllUppercase
                                font.letterSpacing: 1.6
                            }

                            Label {
                                text: "Stream Deck+ replica"
                                color: "#f5f7fb"
                                font.pixelSize: 14
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: engineController.controlSurfaceSnapshotLoaded
                                      ? "Select a page, inspect the exact generated slots, and validate actions before manual Companion exceptions."
                                      : "Control-surface snapshot is loading from the engine."
                                color: theme.studio500
                                font.pixelSize: 10
                                lineHeight: 1.3
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }
                        }

                        Rectangle {
                            radius: 16
                            color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.45)
                            border.color: theme.surfaceBorder
                            border.width: 1
                            Layout.alignment: Qt.AlignTop
                            implicitWidth: 96
                            implicitHeight: 54

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 9
                                spacing: 2

                                Label {
                                    text: "Mapped Slots"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                    font.capitalization: Font.AllUppercase
                                    font.letterSpacing: 1.6
                                }

                                Label {
                                    text: root.currentPageButtons().length + root.currentPageDialPresses().length
                                    color: "#f5f7fb"
                                    font.pixelSize: 16
                                    font.weight: Font.DemiBold
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Repeater {
                            model: engineController.controlSurfacePages

                            ConsoleButton {
                                objectName: "setup-control-page-tab"
                                required property var modelData
                                text: modelData.label
                                tone: "tab"
                                dense: true
                                active: root.rootWindow.selectedControlSurfacePageId === modelData.id
                                onClicked: root.selectPage(modelData.id)
                            }
                        }

                        Item {
                            Layout.fillWidth: true
                        }

                        Label {
                            text: root.copiedLabel.length > 0 ? root.copiedLabel + " copied" : ""
                            visible: root.copiedLabel.length > 0
                            color: "#6fd3a4"
                            font.pixelSize: 11
                        }
                    }

                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        Rectangle {
                            width: Math.min(parent.width, 560)
                            height: Math.min(parent.height, 596)
                            anchors.horizontalCenter: parent.horizontalCenter
                            radius: 28
                            color: "#090d15"
                            border.color: theme.surfaceBorder
                            border.width: 1

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 18
                                spacing: 14

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 10

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2

                                        Label {
                                            text: "Active Companion Page"
                                            color: theme.studio500
                                            font.pixelSize: 10
                                            font.capitalization: Font.AllUppercase
                                            font.letterSpacing: 1.6
                                        }

                                        Label {
                                            objectName: "setup-control-page-title"
                                            text: root.currentPage ? root.currentPage.label : "No page selected"
                                            color: "#f5f7fb"
                                            font.pixelSize: 12
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
                                            color: theme.studio500
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                        }
                                    }
                                }

                                GridLayout {
                                    id: buttonGrid
                                    Layout.topMargin: 8
                                    Layout.fillWidth: true
                                    columns: 4
                                    columnSpacing: 12
                                    rowSpacing: 12

                                    Repeater {
                                        model: root.currentPageButtons()

                                        Rectangle {
                                            objectName: "setup-control-button"
                                            required property var modelData
                                            readonly property bool selected: root.rootWindow.selectedControlSurfaceControlId === modelData.id
                                            radius: 20
                                            color: selected
                                                   ? Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.12)
                                                   : Qt.rgba(0.09, 0.11, 0.15, 0.98)
                                            border.width: 1
                                            border.color: selected
                                                          ? Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.7)
                                                          : modelData.isPageNav
                                                            ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.4)
                                                            : theme.studio650
                                            Layout.fillWidth: true
                                            implicitHeight: 112

                                            Rectangle {
                                                anchors.fill: parent
                                                anchors.margins: -1
                                                radius: parent.radius + 1
                                                color: "transparent"
                                                border.width: selected ? 1 : 0
                                                border.color: selected
                                                              ? Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.34)
                                                              : "transparent"
                                            }

                                            Label {
                                                anchors.centerIn: parent
                                                width: parent.width - 14
                                                text: modelData.label
                                                color: modelData.isPageNav ? theme.accentPrimary : "#f5f7fb"
                                                font.pixelSize: 11
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
                                    color: "#00000000"
                                    gradient: Gradient {
                                        orientation: Gradient.Horizontal
                                        GradientStop { position: 0.0; color: Qt.rgba(0.118, 0.161, 0.231, 0.85) }
                                        GradientStop { position: 0.5; color: Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.22) }
                                        GradientStop { position: 1.0; color: Qt.rgba(0.118, 0.161, 0.231, 0.85) }
                                    }
                                    border.color: Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.2)
                                    border.width: 1
                                    Layout.fillWidth: true
                                    implicitHeight: 34

                                    GridLayout {
                                        anchors.fill: parent
                                        anchors.margins: 8
                                        columns: 4
                                        columnSpacing: 8
                                        rowSpacing: 8

                                        Repeater {
                                            model: root.currentPageDialPresses()

                                            Rectangle {
                                                objectName: "setup-control-lcd"
                                                required property var modelData
                                                radius: 10
                                                color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.55)
                                                border.color: theme.surfaceBorder
                                                border.width: 1
                                                Layout.fillWidth: true
                                            implicitHeight: 22

                                                Label {
                                                    anchors.centerIn: parent
                                                    width: parent.width - 8
                                                    text: modelData.label || "Empty"
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 9
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
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 16

                                    Repeater {
                                        model: root.currentPageDialPresses()

                                        Item {
                                            objectName: "setup-control-dial"
                                            required property var modelData
                                            Layout.fillWidth: true
                                            implicitHeight: 96

                                            readonly property bool selected: root.rootWindow.selectedControlSurfaceControlId === modelData.id

                                            Rectangle {
                                                width: Math.min(parent.width, parent.implicitHeight)
                                                height: width
                                                anchors.centerIn: parent
                                                radius: width / 2
                                                color: selected
                                                       ? Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.12)
                                                       : Qt.rgba(0.07, 0.1, 0.15, 0.96)
                                                border.width: 2
                                                border.color: selected
                                                              ? Qt.rgba(root.deckSelectionBlue.r, root.deckSelectionBlue.g, root.deckSelectionBlue.b, 0.72)
                                                              : theme.studio600

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
                                                        font.pixelSize: 10
                                                        font.weight: Font.DemiBold
                                                        horizontalAlignment: Text.AlignHCenter
                                                        wrapMode: Text.WordWrap
                                                    }

                                                    Label {
                                                        text: "Dial " + modelData.position
                                                        color: theme.studio500
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
                radius: 20
                color: Qt.rgba(theme.surfaceSoft.r, theme.surfaceSoft.g, theme.surfaceSoft.b, 0.96)
                border.color: theme.surfaceBorder
                border.width: 1
                Layout.alignment: Qt.AlignTop
                Layout.fillWidth: true
                Layout.preferredWidth: root.detailRailLayout ? 680 : -1
                Layout.minimumHeight: 0
                implicitHeight: 820

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 10

                    GridLayout {
                        Layout.fillWidth: true
                        columns: root.summaryCardColumns
                        columnSpacing: 12
                        rowSpacing: 12

                        Repeater {
                            model: [
                                { "label": "Selection", "value": root.selectedSummaryLabel(), "detail": root.selectedSummaryDetail() },
                                { "label": "Interaction Set", "value": root.interactionSetSummary(), "detail": root.interactionSetDetail() },
                                { "label": "Page Role", "value": root.currentPage ? root.currentPage.label : "\u2014", "detail": "Mapped for fixed workstation use" }
                            ]

                            Rectangle {
                                required property var modelData
                                radius: 16
                                color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.38)
                                border.color: theme.surfaceBorder
                                border.width: 1
                                Layout.fillWidth: true
                                implicitHeight: 96

                                ColumnLayout {
                                    anchors.fill: parent
                                    anchors.margins: 12
                                    spacing: 4

                                    Label {
                                        text: modelData.label
                                        color: theme.studio500
                                        font.pixelSize: 10
                                    }

                                    Label {
                                        text: modelData.value
                                        color: "#f5f7fb"
                                        font.pixelSize: 13
                                        font.weight: Font.Medium
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    Label {
                                        text: modelData.detail
                                        color: theme.studio500
                                        font.pixelSize: 10
                                        lineHeight: 1.4
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 999
                        color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.45)
                        border.color: theme.surfaceBorder
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: 28

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                spacing: 4

                                Label {
                                    text: "▦"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }

                                Label {
                                    text: "Button action pages"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }
                            }

                            RowLayout {
                                spacing: 4

                                Label {
                                    text: "◉"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }

                                Label {
                                    text: "Dial press details and API payloads"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }
                            }

                            Item {
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                spacing: 4

                                Label {
                                    text: "◌"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }

                                Label {
                                    text: "Built-in live test support"
                                    color: theme.studio500
                                    font.pixelSize: 10
                                }
                            }
                        }
                    }

                    Rectangle {
                        radius: 16
                        color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.38)
                        border.color: theme.surfaceBorder
                        border.width: 1
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        implicitHeight: detailContentLayout.implicitHeight + 12

                        ColumnLayout {
                            id: detailContentLayout
                            anchors.fill: parent
                            anchors.margins: 16
                            spacing: 12

                            Label {
                                text: "Detail Pane"
                                color: theme.studio500
                                font.pixelSize: 10
                            }

                            Label {
                                objectName: "setup-control-detail-title"
                                text: root.selectedControl
                                      ? root.selectedControl.label
                                      : (root.currentPage ? root.currentPage.label + " page overview" : "No slot selected")
                                color: "#f5f7fb"
                                font.pixelSize: 14
                                font.weight: Font.DemiBold
                            }

                            Label {
                                objectName: "setup-control-detail-description"
                                text: root.detailDescription()
                                color: theme.studio500
                                font.pixelSize: 10
                                lineHeight: 1.6
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
                                    spacing: 12

                                    Repeater {
                                        model: root.selectedInteractionSet

                                        Rectangle {
                                            required property var modelData
                                            readonly property bool pageNavigationAction: !!modelData.pageNavTarget && !modelData.url
                                            radius: 0
                                            color: "transparent"
                                            border.width: 0
                                            Layout.fillWidth: true
                                            implicitHeight: interactionLayout.implicitHeight

                                            ColumnLayout {
                                                id: interactionLayout
                                                anchors.fill: parent
                                                spacing: 8

                                                Label {
                                                    text: root.interactionHeadline(modelData)
                                                    color: theme.studio500
                                                    font.pixelSize: 10
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
                                                            font.pixelSize: 10
                                                            font.weight: Font.DemiBold
                                                        }

                                                        Label {
                                                            text: "Use Companion's built-in Page Jump action to navigate to "
                                                                  + modelData.pageNavTarget
                                                                  + ". No HTTP call is required for this slot."
                                                            color: "#ead7b8"
                                                            font.pixelSize: 10
                                                            lineHeight: 1.5
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                        }
                                                    }
                                                }

                                                ColumnLayout {
                                                    visible: !pageNavigationAction
                                                    Layout.fillWidth: true
                                                    spacing: 6

                                                    Label {
                                                        text: "Request"
                                                        color: theme.studio500
                                                        font.pixelSize: 10
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
                                                            implicitWidth: methodLabel.implicitWidth + 12

                                                            Label {
                                                                id: methodLabel
                                                                anchors.centerIn: parent
                                                                text: modelData.method || "Page Jump"
                                                                color: "#f5f7fb"
                                                                font.pixelSize: 10
                                                                font.weight: Font.DemiBold
                                                                font.capitalization: Font.AllUppercase
                                                                font.letterSpacing: 0.8
                                                            }
                                                        }

                                                        Rectangle {
                                                            radius: 999
                                                            color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.55)
                                                            border.color: theme.surfaceBorder
                                                            border.width: 1
                                                            implicitHeight: 20
                                                            implicitWidth: requestTypeLabel.implicitWidth + 12

                                                            Label {
                                                                id: requestTypeLabel
                                                                anchors.centerIn: parent
                                                                text: root.interactionKindLabel(modelData)
                                                                color: theme.studio300
                                                                font.pixelSize: 10
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

                                                Rectangle {
                                                    visible: !pageNavigationAction && !!modelData.url
                                                    radius: 14
                                                    color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.52)
                                                    border.color: theme.surfaceBorder
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: fullUrlText.implicitHeight + 14

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 12
                                                        spacing: 6

                                                        Label {
                                                            text: "Full URL"
                                                            color: theme.studio500
                                                            font.pixelSize: 10
                                                        }

                                                        Label {
                                                            id: fullUrlText
                                                            text: root.displayRequestUrl(modelData)
                                                            color: theme.studio200
                                                            font.pixelSize: 10
                                                            lineHeight: 1.4
                                                            wrapMode: Text.WrapAnywhere
                                                            Layout.fillWidth: true
                                                            font.family: theme.monoFontFamily
                                                        }
                                                    }
                                                }

                                                Rectangle {
                                                    visible: !pageNavigationAction && !!modelData.body
                                                    radius: 14
                                                    color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.52)
                                                    border.color: theme.surfaceBorder
                                                    border.width: 1
                                                    Layout.fillWidth: true
                                                    implicitHeight: payloadText.implicitHeight + 14

                                                    ColumnLayout {
                                                        anchors.fill: parent
                                                        anchors.margins: 12
                                                        spacing: 6

                                                        Label {
                                                            text: "JSON Body"
                                                            color: theme.studio500
                                                            font.pixelSize: 10
                                                        }

                                                        Label {
                                                            id: payloadText
                                                            objectName: modelData.id === root.rootWindow.selectedControlSurfaceControlId
                                                                        ? "setup-control-detail-payload"
                                                                        : ""
                                                            text: root.bodySummary(modelData)
                                                            color: theme.studio300
                                                            font.pixelSize: 10
                                                            lineHeight: 1.4
                                                            wrapMode: Text.WordWrap
                                                            Layout.fillWidth: true
                                                            font.family: theme.monoFontFamily
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
                                                        onClicked: root.copyText(root.displayRequestUrl(modelData), "URL")
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
                                                border.color: theme.surfaceBorder
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
                                                        color: theme.studio500
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
                                                                border.color: theme.surfaceBorder
                                                                border.width: 1
                                                                implicitHeight: 22
                                                                implicitWidth: mappedButtonLabel.implicitWidth + 12

                                                                Label {
                                                                    id: mappedButtonLabel
                                                                    anchors.centerIn: parent
                                                                    text: modelData.position + ": " + modelData.label
                                                                    color: theme.studio300
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
                                                        color: theme.accentPrimary
                                                        font.pixelSize: 10
                                                    }

                                                    Label {
                                                        text: "Start with the generated profile, then use this pane only for validation or exceptions."
                                                        color: theme.studio200
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
