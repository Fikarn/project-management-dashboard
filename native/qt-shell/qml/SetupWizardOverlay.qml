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
        width: Math.min(parent.width - 160, 1080)
        height: Math.min(parent.height - 140, 700)
        tone: "modal"
        padding: 0

        RowLayout {
            anchors.fill: parent
            spacing: 0

            Rectangle {
                Layout.fillHeight: true
                Layout.preferredWidth: 248
                color: "#11131b"
                border.width: 1
                border.color: "#233246"

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 18
                    spacing: 14

                    Label {
                        text: "SSE ExEd Studio\nControl"
                        color: "#d7e0ec"
                        font.pixelSize: 11
                        font.weight: Font.DemiBold
                        font.letterSpacing: 0.9
                    }

                    Label {
                        text: "Step " + (root.currentStep + 1) + " of " + root.totalSteps + " | " + root.currentStepLabel()
                        color: "#8ea4c0"
                        font.pixelSize: 11
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 4
                        radius: 2
                        color: "#182330"

                        Rectangle {
                            width: Math.max(24, parent.width * ((root.currentStep + 1) / root.totalSteps))
                            height: parent.height
                            radius: parent.radius
                            color: "#a9c497"
                        }
                    }

                    Repeater {
                        model: root.stepLabels

                        Rectangle {
                            required property string modelData
                            radius: 11
                            color: index === root.currentStep
                                   ? "#1b222c"
                                   : index < root.currentStep
                                     ? "#16241d"
                                     : "#11151d"
                            border.width: 1
                            border.color: index === root.currentStep
                                          ? "#32475f"
                                          : index < root.currentStep
                                            ? "#2f5a46"
                                            : "#1d2938"
                            Layout.fillWidth: true
                            implicitHeight: 42

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 8

                                Rectangle {
                                    radius: 10
                                    color: index === root.currentStep
                                           ? "#a9c497"
                                           : index < root.currentStep
                                             ? "#274a39"
                                             : "#1d2938"
                                    implicitWidth: 20
                                    implicitHeight: 20

                                    Label {
                                        anchors.centerIn: parent
                                        text: index + 1
                                        color: index === root.currentStep ? "#0b1015" : "#d7e0ec"
                                        font.pixelSize: 10
                                        font.weight: Font.DemiBold
                                    }
                                }

                                Label {
                                    text: modelData
                                    color: index === root.currentStep ? "#f5f7fb" : "#b9c3d2"
                                    font.pixelSize: 12
                                    font.weight: Font.Medium
                                    Layout.fillWidth: true
                                }
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }

                    Label {
                        text: "Configure only what this workstation needs today. The rest can be revisited later from the main console."
                        color: "#6f8097"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#171821"

                ConsoleButton {
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.topMargin: 14
                    anchors.rightMargin: 14
                    tone: "ghost"
                    text: "Close"
                    onClicked: root.skipToSetupWorkspace()
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 28
                    anchors.topMargin: 26
                    spacing: 18

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Label {
                            text: "Current Step"
                            color: "#8ea4c0"
                            font.pixelSize: 11
                        }

                        Label {
                            text: root.currentStepLabel()
                            color: "#f5f7fb"
                            font.pixelSize: 20
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
                                color: "#f5f7fb"
                                font.pixelSize: 22
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "This workstation runs your live lighting control, audio snapshots, Stream Deck actions, and a planning board for prep work."
                                color: "#c7d0db"
                                font.pixelSize: 13
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 12

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
                                        padding: 14

                                        ColumnLayout {
                                            anchors.fill: parent
                                            spacing: 6

                                            Rectangle {
                                                radius: 16
                                                color: "#1d2938"
                                                implicitWidth: 32
                                                implicitHeight: 32

                                                Label {
                                                    anchors.centerIn: parent
                                                    text: modelData.icon
                                                    color: "#a9c497"
                                                    font.pixelSize: 13
                                                    font.weight: Font.DemiBold
                                                }
                                            }

                                            Label {
                                                text: modelData.title
                                                color: "#f5f7fb"
                                                font.pixelSize: 13
                                                font.weight: Font.DemiBold
                                            }

                                            Label {
                                                text: modelData.summary
                                                color: "#8ea4c0"
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
