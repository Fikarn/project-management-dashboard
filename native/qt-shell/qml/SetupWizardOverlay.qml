import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    required property var rootWindow
    required property var engineController
    property int currentStep: 0
    property string selectedMode: ""
    property bool seeding: false

    readonly property var stepLabels: ["Console", "Mode", "Planning", "Finish"]
    readonly property int totalSteps: stepLabels.length

    function resetWizard() {
        root.currentStep = 0
        root.selectedMode = ""
        root.seeding = false
    }

    function currentStepLabel() {
        return root.stepLabels[Math.max(0, Math.min(root.currentStep, root.stepLabels.length - 1))]
    }

    function skipToSetupWorkspace() {
        root.engineController.updateCommissioningStage("in-progress")
        root.engineController.setWorkspaceMode("setup")
    }

    function finishWizard() {
        if (root.selectedMode === "planning-only") {
            root.engineController.updateCommissioningStage("ready")
            root.engineController.setWorkspaceMode("planning")
            return
        }

        root.skipToSetupWorkspace()
    }

    function loadSamplePlanning() {
        root.seeding = true
        root.engineController.seedCommissioningSamplePlanning(false)
        Qt.callLater(function() {
            Qt.callLater(function() {
                root.seeding = false
                root.currentStep = 3
            })
        })
    }

    ConsoleTheme {
        id: theme
    }

    anchors.fill: parent

    Rectangle {
        anchors.fill: parent
        color: "#05060a"
        opacity: 0.54
    }

    ConsoleSurface {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.verticalCenter: parent.verticalCenter
        width: Math.min(parent.width - 176, 1040)
        height: Math.min(parent.height - 144, 640)
        tone: "modal"
        padding: 0

        RowLayout {
            anchors.fill: parent
            spacing: 0

            Rectangle {
                Layout.fillHeight: true
                Layout.preferredWidth: 220
                color: theme.surfaceSoft
                border.width: 1
                border.color: theme.surfaceBorder

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 12

                    Label {
                        text: "SSE ExEd Studio\nControl\nCommissioning"
                        color: theme.studio200
                        font.family: theme.uiFontFamily
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                        font.letterSpacing: 0.9
                        font.capitalization: Font.AllUppercase
                    }

                    Label {
                        text: "Step " + (root.currentStep + 1) + " of " + root.totalSteps + " | " + root.currentStepLabel()
                        color: theme.studio300
                        font.family: theme.uiFontFamily
                        font.pixelSize: 11
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 4
                        radius: 2
                        color: theme.surfaceRaised

                        Rectangle {
                            width: Math.max(24, parent.width * ((root.currentStep + 1) / root.totalSteps))
                            height: parent.height
                            radius: parent.radius
                            color: theme.accentPrimary
                        }
                    }

                    Item {
                        Layout.fillWidth: true
                        implicitHeight: stepList.implicitHeight

                        Column {
                            id: stepList
                            width: parent.width
                            spacing: 10

                            Repeater {
                                model: root.stepLabels

                                Item {
                                    id: stepDelegate
                                    required property string modelData
                                    required property int index
                                    width: stepList.width
                                    height: 40

                                    Rectangle {
                                        anchors.fill: parent
                                        radius: 11
                                        color: stepDelegate.index === root.currentStep
                                               ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.1)
                                               : stepDelegate.index < root.currentStep
                                                 ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.06)
                                                 : theme.surfaceDefault
                                        border.width: 1
                                        border.color: stepDelegate.index === root.currentStep
                                                      ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.4)
                                                      : theme.surfaceBorder
                                    }

                                    Row {
                                        anchors.fill: parent
                                        anchors.margins: 10
                                        spacing: 8

                                        Rectangle {
                                            radius: 10
                                            color: stepDelegate.index === root.currentStep
                                                   ? theme.accentPrimary
                                                   : stepDelegate.index < root.currentStep
                                                     ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.24)
                                                     : theme.surfaceRaised
                                            width: 20
                                            height: 20

                                            Label {
                                                anchors.centerIn: parent
                                                text: stepDelegate.index + 1
                                                color: stepDelegate.index === root.currentStep ? theme.studio950 : theme.studio100
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 10
                                                font.weight: Font.DemiBold
                                            }
                                        }

                                        Label {
                                            width: stepList.width - 48
                                            verticalAlignment: Text.AlignVCenter
                                            text: modelData
                                            color: stepDelegate.index === root.currentStep ? theme.studio050 : theme.studio200
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 12
                                            font.weight: Font.Medium
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }

                    Label {
                        text: "Configure only what this workstation needs today. The rest can be revisited later from the main console."
                        color: theme.studio400
                        font.family: theme.uiFontFamily
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: theme.surfaceDefault

                ConsoleButton {
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.topMargin: 12
                    anchors.rightMargin: 14
                    tone: "ghost"
                    text: "Close"
                    onClicked: root.skipToSetupWorkspace()
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    anchors.topMargin: 18
                    spacing: 16

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Label {
                            text: "Current Step"
                            color: theme.studio300
                            font.family: theme.uiFontFamily
                            font.pixelSize: 11
                            font.capitalization: Font.AllUppercase
                            font.letterSpacing: 0.8
                        }

                        Label {
                            text: root.currentStepLabel()
                            color: theme.studio050
                            font.family: theme.uiFontFamily
                            font.pixelSize: 17
                            font.weight: Font.DemiBold
                        }
                    }

                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 16
                            visible: root.currentStep === 0

                            Label {
                                text: "Welcome to SSE ExEd Studio Control"
                                color: theme.studio050
                                font.family: theme.uiFontFamily
                                font.pixelSize: 16
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "This workstation runs your live lighting control, audio snapshots, Stream Deck actions, and a planning board for prep work."
                                color: theme.studio300
                                font.family: theme.uiFontFamily
                                font.pixelSize: 12
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 10

                                Repeater {
                                    model: [
                                        { "title": "Lighting Control", "summary": "DMX patching, scenes, and fixture testing", "icon": "L" },
                                        { "title": "Audio + Hardware", "summary": "OSC snapshots and Stream Deck workflows", "icon": "A" },
                                        { "title": "Planning Board", "summary": "Prep tasks, timers, and run-of-show notes", "icon": "P" }
                                    ]

                                    ConsoleSurface {
                                        required property var modelData
                                        Layout.fillWidth: true
                                        Layout.fillHeight: true
                                        tone: "soft"
                                        padding: 12

                                        ColumnLayout {
                                            anchors.fill: parent
                                            spacing: 4

                                            Rectangle {
                                                radius: 16
                                                color: theme.surfaceRaised
                                                implicitWidth: 28
                                                implicitHeight: 28

                                                Label {
                                                    anchors.centerIn: parent
                                                    text: modelData.icon
                                                    color: theme.accentPrimary
                                                    font.family: theme.uiFontFamily
                                                    font.pixelSize: 12
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            Label {
                                                text: modelData.title
                                                color: theme.studio050
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 12
                                                font.weight: Font.DemiBold
                                            }

                                            Label {
                                                text: modelData.summary
                                                color: theme.studio300
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                            }
                                        }
                                    }
                                }
                            }

                            Item { Layout.fillHeight: true }

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "primary"
                                text: "Get Started"
                                implicitHeight: 36
                                onClicked: root.currentStep = 1
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 16
                            visible: root.currentStep === 1

                            Label {
                                text: "What do you want to configure right now?"
                                color: "#f5f7fb"
                                font.pixelSize: 22
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Keep this lightweight if you only need planning today. Full studio commissioning can happen now or later."
                                color: "#c7d0db"
                                font.pixelSize: 13
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            ConsoleSurface {
                                Layout.fillWidth: true
                                tone: "soft"
                                padding: 18
                                highlight: root.selectedMode === "planning-only"

                                ColumnLayout {
                                    anchors.fill: parent
                                    spacing: 6

                                    Label {
                                        text: "Planning board only"
                                        color: "#f5f7fb"
                                        font.pixelSize: 15
                                        font.weight: Font.DemiBold
                                    }

                                    Label {
                                        text: "Projects, tasks, timers, and backup protection without DMX setup."
                                        color: "#8ea4c0"
                                        font.pixelSize: 12
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    ConsoleButton {
                                        tone: "secondary"
                                        text: "Choose Planning"
                                        onClicked: {
                                            root.selectedMode = "planning-only"
                                            root.currentStep = 2
                                        }
                                    }
                                }
                            }

                            ConsoleSurface {
                                Layout.fillWidth: true
                                tone: "soft"
                                padding: 18
                                highlight: root.selectedMode === "studio-control"

                                ColumnLayout {
                                    anchors.fill: parent
                                    spacing: 6

                                    Label {
                                        text: "Studio control + planning board"
                                        color: "#f5f7fb"
                                        font.pixelSize: 15
                                        font.weight: Font.DemiBold
                                    }

                                    Label {
                                        text: "Lighting setup now, plus the planning board for prep and run-of-show support."
                                        color: "#8ea4c0"
                                        font.pixelSize: 12
                                        wrapMode: Text.WordWrap
                                        Layout.fillWidth: true
                                    }

                                    ConsoleButton {
                                        tone: "secondary"
                                        text: "Choose Studio Control"
                                        onClicked: {
                                            root.selectedMode = "studio-control"
                                            root.currentStep = 2
                                        }
                                    }
                                }
                            }

                            Item { Layout.fillHeight: true }

                            ConsoleButton {
                                tone: "ghost"
                                text: "Back"
                                onClicked: root.currentStep = 0
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 16
                            visible: root.currentStep === 2

                            Label {
                                text: "Load a sample planning board"
                                color: "#f5f7fb"
                                font.pixelSize: 22
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Load example projects and tasks so the planning workspace is useful immediately after commissioning."
                                color: "#c7d0db"
                                font.pixelSize: 13
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "primary"
                                text: root.seeding ? "Loading..." : "Load Sample Planning Data"
                                enabled: !root.seeding
                                onClicked: root.loadSamplePlanning()
                            }

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "secondary"
                                text: "Start Empty"
                                onClicked: root.currentStep = 3
                            }

                            Item { Layout.fillHeight: true }

                            ConsoleButton {
                                tone: "ghost"
                                text: "Back"
                                onClicked: root.currentStep = 1
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 16
                            visible: root.currentStep === 3

                            Label {
                                text: "Console ready"
                                color: "#f5f7fb"
                                font.pixelSize: 22
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "A few shortcuts to get you started:"
                                color: "#c7d0db"
                                font.pixelSize: 13
                            }

                            Repeater {
                                model: [
                                    { "shortcut": "N", "label": "Create a new project" },
                                    { "shortcut": "L", "label": "Toggle lighting view" },
                                    { "shortcut": "K", "label": "Open the planning board" },
                                    { "shortcut": "?", "label": "Show all keyboard shortcuts" }
                                ]

                                ConsoleSurface {
                                    required property var modelData
                                    Layout.fillWidth: true
                                    tone: "soft"
                                    padding: 12

                                    RowLayout {
                                        anchors.fill: parent
                                        spacing: 10

                                        Label {
                                            text: modelData.label
                                            color: "#d7e0ec"
                                            font.pixelSize: 12
                                            Layout.fillWidth: true
                                        }

                                        Rectangle {
                                            radius: 9
                                            color: "#1d2938"
                                            border.width: 1
                                            border.color: "#2d435c"
                                            implicitWidth: 28
                                            implicitHeight: 22

                                            Label {
                                                anchors.centerIn: parent
                                                text: modelData.shortcut
                                                color: "#d7e0ec"
                                                font.pixelSize: 10
                                                font.weight: Font.DemiBold
                                            }
                                        }
                                    }
                                }
                            }

                            Label {
                                text: "Your data saves automatically on every change. Backups stay available from the support surface."
                                color: "#8ea4c0"
                                font.pixelSize: 11
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            Item { Layout.fillHeight: true }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 10

                                ConsoleButton {
                                    tone: "ghost"
                                    text: "Back"
                                    onClicked: root.currentStep = 2
                                }

                                Item { Layout.fillWidth: true }

                                ConsoleButton {
                                    tone: "primary"
                                    text: root.selectedMode === "planning-only" ? "Done" : "Continue to Setup"
                                    onClicked: root.finishWizard()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
