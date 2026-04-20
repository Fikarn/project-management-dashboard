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

    Rectangle {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.verticalCenter: parent.verticalCenter
        width: Math.min(parent.width - 320, 980)
        height: Math.min(parent.height - 200, 560)
        radius: 26
        border.width: 1
        border.color: Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.8)
        color: "#00000000"
        clip: true

        gradient: Gradient {
            GradientStop {
                position: 0.0
                color: "#16161f"
            }
            GradientStop {
                position: 0.18
                color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.08)
            }
            GradientStop {
                position: 1.0
                color: "#080a0e"
            }
        }

        Rectangle {
            anchors.fill: parent
            radius: parent.radius
            color: "#00000000"
            border.width: 1
            border.color: Qt.rgba(theme.studio050.r, theme.studio050.g, theme.studio050.b, 0.04)
        }

        RowLayout {
            anchors.fill: parent
            spacing: 0

            Rectangle {
                Layout.fillHeight: true
                Layout.preferredWidth: 220
                color: Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.55)

                Rectangle {
                    anchors.top: parent.top
                    anchors.bottom: parent.bottom
                    anchors.right: parent.right
                    width: 1
                    color: Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.7)
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    anchors.topMargin: 20
                    anchors.bottomMargin: 20
                    spacing: 0

                    Label {
                        text: "SSE ExEd Studio\nControl\nCommissioning"
                        color: Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.8)
                        font.family: theme.uiFontFamily
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                        font.letterSpacing: 1.2
                        font.capitalization: Font.AllUppercase
                    }

                    Label {
                        Layout.topMargin: 6
                        text: "Step " + (root.currentStep + 1) + " of " + root.totalSteps + " · " + root.currentStepLabel()
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: 12
                    }

                    Rectangle {
                        Layout.topMargin: 16
                        Layout.fillWidth: true
                        implicitHeight: 6
                        radius: 999
                        color: theme.studio900

                        Rectangle {
                            width: Math.max(24, parent.width * ((root.currentStep + 1) / root.totalSteps))
                            height: parent.height
                            radius: parent.radius
                            color: theme.accentPrimary
                        }
                    }

                    Item {
                        Layout.topMargin: 20
                        Layout.fillWidth: true
                        implicitHeight: stepList.implicitHeight

                        Column {
                            id: stepList
                            width: parent.width
                            spacing: 8

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
                                        radius: 14
                                        color: stepDelegate.index === root.currentStep
                                               ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.1)
                                               : stepDelegate.index < root.currentStep
                                                 ? Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.08)
                                                 : Qt.rgba(theme.studio950.r, theme.studio950.g, theme.studio950.b, 0.35)
                                        border.width: 1
                                        border.color: stepDelegate.index === root.currentStep
                                                      ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.35)
                                                      : stepDelegate.index < root.currentStep
                                                        ? Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.2)
                                                        : theme.studio800
                                    }

                                    Row {
                                        anchors.fill: parent
                                        anchors.margins: 10
                                        spacing: 8

                                        Rectangle {
                                            radius: 10
                                            color: stepDelegate.index === root.currentStep
                                                   ? Qt.rgba(theme.accentPrimary.r, theme.accentPrimary.g, theme.accentPrimary.b, 0.15)
                                                   : stepDelegate.index < root.currentStep
                                                     ? Qt.rgba(theme.accentGreen.r, theme.accentGreen.g, theme.accentGreen.b, 0.15)
                                                     : theme.studio800
                                            width: 20
                                            height: 20

                                            Label {
                                                anchors.centerIn: parent
                                                text: stepDelegate.index + 1
                                                color: stepDelegate.index === root.currentStep
                                                       ? theme.accentPrimary
                                                       : stepDelegate.index < root.currentStep
                                                         ? "#86efac"
                                                         : theme.studio400
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 11
                                                font.weight: Font.DemiBold
                                            }
                                        }

                                        Label {
                                            width: stepList.width - 48
                                            verticalAlignment: Text.AlignVCenter
                                            text: modelData
                                            color: stepDelegate.index === root.currentStep ? theme.studio050 : theme.studio300
                                            font.family: theme.uiFontFamily
                                            font.pixelSize: 14
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
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: 12
                        lineHeight: 1.45
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: "#00000000"

                Button {
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.topMargin: 12
                    anchors.rightMargin: 12
                    implicitWidth: 28
                    implicitHeight: 28
                    hoverEnabled: true
                    onClicked: root.skipToSetupWorkspace()

                    background: Rectangle {
                        radius: theme.radiusBadge
                        color: parent.hovered
                               ? Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.28)
                               : "#00000000"
                    }

                    contentItem: Label {
                        text: "\u00d7"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        color: parent.hovered ? theme.studio200 : theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: 16
                    }
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    anchors.topMargin: 20
                    anchors.rightMargin: 20
                    anchors.bottomMargin: 16
                    spacing: 0

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Label {
                            text: "Current Step"
                            color: theme.studio500
                            font.family: theme.uiFontFamily
                            font.pixelSize: 11
                            font.capitalization: Font.AllUppercase
                            font.letterSpacing: 1.0
                        }

                        Label {
                            text: root.currentStepLabel()
                            color: theme.studio050
                            font.family: theme.uiFontFamily
                            font.pixelSize: 18
                            font.weight: Font.DemiBold
                        }
                    }

                    Item {
                        Layout.topMargin: 16
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        clip: true

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 12
                            visible: root.currentStep === 0

                            Label {
                                text: "Welcome to SSE ExEd Studio Control"
                                color: theme.studio050
                                font.family: theme.uiFontFamily
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "This workstation runs your live lighting control, audio snapshots, Stream Deck actions, and a planning board for prep work."
                                color: theme.studio400
                                font.family: theme.uiFontFamily
                                font.pixelSize: 14
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

                            GridLayout {
                                Layout.fillWidth: true
                                columns: 3
                                columnSpacing: 12
                                rowSpacing: 12

                                Repeater {
                                    model: [
                                        { "title": "Lighting Control", "summary": "DMX patching, scenes, and fixture testing", "icon": "💡" },
                                        { "title": "Audio + Hardware", "summary": "OSC snapshots and Stream Deck workflows", "icon": "🎧" },
                                        { "title": "Planning Board", "summary": "Prep tasks, timers, and run-of-show notes", "icon": "📋" }
                                    ]

                                    Rectangle {
                                        required property var modelData
                                        Layout.fillWidth: true
                                        Layout.preferredHeight: 120
                                        radius: 12
                                        color: Qt.rgba(theme.surfaceDefault.r, theme.surfaceDefault.g, theme.surfaceDefault.b, 0.7)
                                        border.width: 1
                                        border.color: theme.studio700

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 12
                                            spacing: 2

                                            Label {
                                                Layout.alignment: Qt.AlignHCenter
                                                text: modelData.icon
                                                color: theme.studio300
                                                font.pixelSize: 24
                                            }

                                            Label {
                                                Layout.alignment: Qt.AlignHCenter
                                                text: modelData.title
                                                color: theme.studio300
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 12
                                                font.weight: Font.Medium
                                                horizontalAlignment: Text.AlignHCenter
                                                Layout.fillWidth: true
                                            }

                                            Label {
                                                text: modelData.summary
                                                color: theme.studio500
                                                font.family: theme.uiFontFamily
                                                font.pixelSize: 11
                                                wrapMode: Text.WordWrap
                                                Layout.fillWidth: true
                                                horizontalAlignment: Text.AlignHCenter
                                            }
                                        }
                                    }
                                }
                            }

                            ConsoleButton {
                                Layout.fillWidth: true
                                tone: "primary"
                                text: "Get Started"
                                implicitHeight: 34
                                onClicked: root.currentStep = 1
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 12
                            visible: root.currentStep === 1

                            Label {
                                text: "What do you want to configure right now?"
                                color: theme.studio100
                                font.family: theme.uiFontFamily
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Keep this lightweight if you only need planning today. Full studio commissioning can happen now or later."
                                color: theme.studio400
                                font.family: theme.uiFontFamily
                                font.pixelSize: 14
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
                                        color: theme.studio100
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: 14
                                        font.weight: Font.DemiBold
                                    }

                                    Label {
                                        text: "Projects, tasks, timers, and backup protection without DMX setup."
                                        color: theme.studio400
                                        font.family: theme.uiFontFamily
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
                                        color: theme.studio100
                                        font.family: theme.uiFontFamily
                                        font.pixelSize: 14
                                        font.weight: Font.DemiBold
                                    }

                                    Label {
                                        text: "Lighting setup now, plus the planning board for prep and run-of-show support."
                                        color: theme.studio400
                                        font.family: theme.uiFontFamily
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

                            ConsoleButton {
                                tone: "ghost"
                                text: "Back"
                                onClicked: root.currentStep = 0
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 12
                            visible: root.currentStep === 2

                            Label {
                                text: "Load a sample planning board"
                                color: theme.studio100
                                font.family: theme.uiFontFamily
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "Load example projects and tasks so the planning workspace is useful immediately after commissioning."
                                color: theme.studio400
                                font.family: theme.uiFontFamily
                                font.pixelSize: 14
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

                            ConsoleButton {
                                tone: "ghost"
                                text: "Back"
                                onClicked: root.currentStep = 1
                            }
                        }

                        ColumnLayout {
                            anchors.fill: parent
                            spacing: 12
                            visible: root.currentStep === 3

                            Label {
                                text: "Console ready"
                                color: theme.studio100
                                font.family: theme.uiFontFamily
                                font.pixelSize: 18
                                font.weight: Font.DemiBold
                            }

                            Label {
                                text: "A few shortcuts to get you started:"
                                color: theme.studio400
                                font.family: theme.uiFontFamily
                                font.pixelSize: 14
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
                                color: theme.studio500
                                font.family: theme.uiFontFamily
                                font.pixelSize: 12
                                wrapMode: Text.WordWrap
                                Layout.fillWidth: true
                            }

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

                    Rectangle {
                        Layout.topMargin: 16
                        Layout.fillWidth: true
                        implicitHeight: 1
                        color: Qt.rgba(theme.studio700.r, theme.studio700.g, theme.studio700.b, 0.7)
                    }

                    Label {
                        Layout.topMargin: 10
                        Layout.fillWidth: true
                        horizontalAlignment: Text.AlignHCenter
                        text: "You can reopen this commissioning flow later from the console if the studio hardware changes."
                        color: theme.studio500
                        font.family: theme.uiFontFamily
                        font.pixelSize: 11
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }
    }
}
