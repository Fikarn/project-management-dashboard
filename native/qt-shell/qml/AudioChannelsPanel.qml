import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    objectName: "audio-channels-panel"
    required property var rootWindow
    required property var engineController
    property bool wideLayout: width >= 900
    property var selectedMixTarget: rootWindow.audioMixTargetById(rootWindow.selectedAudioMixTargetId)
    property string selectedMixLabel: selectedMixTarget ? rootWindow.audioMixLabel(selectedMixTarget) : "Main Monitors"

    function sectionSummary(role) {
        if (role === "front-preamp") {
            return "Primary live inputs feeding " + root.selectedMixLabel
        }
        if (role === "rear-line") {
            return "Secondary line sources and utility returns."
        }
        return "DAW returns and program feeds."
    }

    visible: !!engineController && engineController.workspaceMode === "audio"
    radius: 10
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true
    implicitHeight: 540

    ScrollView {
        anchors.fill: parent
        anchors.margins: 10
        clip: true
        contentWidth: availableWidth

        Item {
            width: parent.width
            implicitHeight: channelsLayout.implicitHeight

            ColumnLayout {
                id: channelsLayout
                width: parent.width
                spacing: 10

                Rectangle {
                    objectName: "audio-strip-section-front"
                    radius: 8
                    color: "#0c1320"
                    border.color: "#24344a"
                    border.width: 1
                    Layout.fillWidth: true
                    implicitHeight: frontSectionLayout.implicitHeight + 16

                    ColumnLayout {
                        id: frontSectionLayout
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 6

                        RowLayout {
                            Layout.fillWidth: true

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    text: "Front Preamps 9-12"
                                    color: "#8ea4c0"
                                    font.pixelSize: 10
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    text: root.sectionSummary("front-preamp")
                                    color: "#f5f7fb"
                                    font.pixelSize: 11
                                    font.weight: Font.DemiBold
                                    wrapMode: Text.WordWrap
                                    Layout.fillWidth: true
                                }
                            }

                            Label {
                                text: "Hold the 48V button to change phantom power."
                                color: "#8ea4c0"
                                font.pixelSize: 9
                            }
                        }

                        GridLayout {
                            Layout.fillWidth: true
                            columns: root.wideLayout ? 4 : 2
                            columnSpacing: 6
                            rowSpacing: 6

                            Repeater {
                                model: rootWindow.audioChannelsByRole("front-preamp")

                                AudioChannelCard {
                                    required property var modelData
                                    rootWindow: root.rootWindow
                                    engineController: root.engineController
                                    channelData: modelData
                                    mixTargetId: root.rootWindow.selectedAudioMixTargetId
                                    compact: false
                                }
                            }
                        }
                    }
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: root.wideLayout ? 2 : 1
                    columnSpacing: 10
                    rowSpacing: 10

                    Repeater {
                        model: [
                            {
                                "objectName": "audio-strip-section-rear",
                                "title": "Rear Line Inputs 1-8",
                                "role": "rear-line",
                                "note": "Fixed line path, trim stays in hardware.",
                                "compact": true,
                                "columns": 4
                            },
                            {
                                "objectName": "audio-strip-section-playback",
                                "title": "Software Playback",
                                "role": "playback-pair",
                                "note": "Stereo pairs send to the selected output mix.",
                                "compact": true,
                                "columns": 2
                            }
                        ]

                        Rectangle {
                            required property var modelData
                            objectName: modelData.objectName
                            radius: 8
                            color: "#0c1320"
                            border.color: "#24344a"
                            border.width: 1
                            Layout.fillWidth: true
                            implicitHeight: sectionLayout.implicitHeight + 16

                            ColumnLayout {
                                id: sectionLayout
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 6

                                RowLayout {
                                    Layout.fillWidth: true

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 2

                                        Label {
                                            text: modelData.title
                                            color: "#8ea4c0"
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                        }

                                        Label {
                                            text: root.sectionSummary(modelData.role)
                                            color: "#f5f7fb"
                                            font.pixelSize: 11
                                            font.weight: Font.DemiBold
                                            wrapMode: Text.WordWrap
                                            Layout.fillWidth: true
                                        }
                                    }

                                    Label {
                                        text: modelData.note
                                        color: "#8ea4c0"
                                        font.pixelSize: 9
                                    }
                                }

                                GridLayout {
                                    Layout.fillWidth: true
                                    columns: root.wideLayout ? modelData.columns : 2
                                    columnSpacing: 6
                                    rowSpacing: 6

                                    Repeater {
                                        model: rootWindow.audioChannelsByRole(modelData.role)

                                        AudioChannelCard {
                                            required property var modelData
                                            rootWindow: root.rootWindow
                                            engineController: root.engineController
                                            channelData: modelData
                                            mixTargetId: root.rootWindow.selectedAudioMixTargetId
                                            compact: true
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
