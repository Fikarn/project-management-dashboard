import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "LightingParityHelpers.js" as LightingParityHelpers

Rectangle {
    id: root
    objectName: "lighting-content-panel"
    required property var rootWindow
    required property var engineController
    required property string viewMode
    property var collapsedSections: ({})
    signal viewModeSelected(string nextViewMode)

    function toggleSection(sectionId) {
        const next = Object.assign({}, collapsedSections)
        next[sectionId] = !next[sectionId]
        collapsedSections = next
    }

    function sectionCollapsed(sectionId) {
        return !!collapsedSections[sectionId]
    }

    visible: !!engineController && engineController.workspaceMode === "lighting"
    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true

    ScrollView {
        anchors.fill: parent
        anchors.margins: root.viewMode === "spatial" ? 0 : 12
        clip: true
        contentWidth: availableWidth
        visible: root.viewMode !== "spatial"

        Item {
            width: parent.width
            implicitHeight: contentLayout.implicitHeight

            ColumnLayout {
                id: contentLayout
                width: parent.width
                spacing: 10

                Label {
                    text: root.viewMode === "compact" ? "Fixture List" : "Fixture Grid"
                    color: "#f5f7fb"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    text: "Work directly from the list, then jump into Studio when placement and framing matter."
                    color: "#8ea4c0"
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

                Repeater {
                    model: LightingParityHelpers.fixtureSections(
                               engineController ? engineController.lightingFixtures : [],
                               engineController ? engineController.lightingGroups : []
                           )

                    Rectangle {
                        required property var modelData
                        radius: 10
                        color: "#0c1320"
                        border.color: "#24344a"
                        border.width: 1
                        Layout.fillWidth: true
                        implicitHeight: sectionLayout.implicitHeight + 20

                        ColumnLayout {
                            id: sectionLayout
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true

                                Button {
                                    text: root.sectionCollapsed(modelData.id) ? "+" : "-"
                                    onClicked: root.toggleSection(modelData.id)
                                }

                                Label {
                                    text: modelData.name
                                    color: "#f5f7fb"
                                    font.pixelSize: 12
                                    font.weight: Font.DemiBold
                                }

                                Label {
                                    text: modelData.fixtureCount + " fixtures"
                                    color: "#8ea4c0"
                                    font.pixelSize: 10
                                }

                                Label {
                                    text: modelData.liveCount + " live"
                                    color: modelData.liveCount > 0 ? "#6fd3a8" : "#8ea4c0"
                                    font.pixelSize: 10
                                }

                                Item { Layout.fillWidth: true }

                                Button {
                                    text: "Studio"
                                    onClicked: root.viewModeSelected("spatial")
                                }
                            }

                            Label {
                                visible: !modelData.fixtureCount
                                text: "No fixtures in this section."
                                color: "#8ea4c0"
                            }

                            GridLayout {
                                visible: !root.sectionCollapsed(modelData.id) && root.viewMode === "expanded"
                                Layout.fillWidth: true
                                columns: width >= 720 ? 2 : 1
                                columnSpacing: 8
                                rowSpacing: 8

                                Repeater {
                                    model: modelData.fixtures

                                    Rectangle {
                                        required property var modelData
                                        radius: 10
                                        color: "#111a28"
                                        border.color: engineController.lightingSelectedFixtureId === modelData.id ? "#6aa9ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: 132

                                        MouseArea {
                                            anchors.fill: parent
                                            onClicked: engineController.updateLightingSettings({ "selectedFixtureId": modelData.id })
                                        }

                                        ColumnLayout {
                                            anchors.fill: parent
                                            anchors.margins: 10
                                            spacing: 6

                                            RowLayout {
                                                Layout.fillWidth: true

                                                ColumnLayout {
                                                    Layout.fillWidth: true
                                                    spacing: 1

                                                    Label {
                                                        text: modelData.name
                                                        color: "#f5f7fb"
                                                        font.pixelSize: 12
                                                        font.weight: Font.DemiBold
                                                    }
                                                    Label {
                                                        text: "DMX " + modelData.dmxStartAddress + "  |  "
                                                              + rootWindow.lightingFixtureTypeName(modelData.type)
                                                        color: "#8ea4c0"
                                                        font.pixelSize: 10
                                                        wrapMode: Text.WordWrap
                                                        Layout.fillWidth: true
                                                    }
                                                }

                                                Rectangle {
                                                    radius: 999
                                                    color: modelData.on ? "#163a2c" : "#2a3345"
                                                    border.color: modelData.on ? "#2ba36a" : "#405471"
                                                    border.width: 1
                                                    implicitWidth: badgeLabel.implicitWidth + 18
                                                    implicitHeight: 24

                                                    Label {
                                                        id: badgeLabel
                                                        anchors.centerIn: parent
                                                        text: modelData.on ? "LIVE" : "STANDBY"
                                                        color: modelData.on ? "#d7ffea" : "#b9c6d8"
                                                        font.pixelSize: 10
                                                        font.weight: Font.DemiBold
                                                    }
                                                }
                                            }

                                            Label {
                                                text: "Intensity " + modelData.intensity + "%  |  CCT " + modelData.cct
                                                      + "K  |  " + rootWindow.lightingEffectName(modelData.effect)
                                                color: "#b9c6d8"
                                                font.pixelSize: 10
                                            }

                                            RowLayout {
                                                Layout.fillWidth: true
                                                spacing: 6

                                                Button {
                                                    text: modelData.on ? "Turn Off" : "Turn On"
                                                    onClicked: engineController.setLightingFixturePower(modelData.id, !modelData.on)
                                                }
                                                Button {
                                                    text: "Select"
                                                    onClicked: engineController.updateLightingSettings({ "selectedFixtureId": modelData.id })
                                                }
                                                Item { Layout.fillWidth: true }
                                                Button {
                                                    text: "Studio"
                                                    onClicked: {
                                                        engineController.updateLightingSettings({ "selectedFixtureId": modelData.id })
                                                        root.viewModeSelected("spatial")
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            ColumnLayout {
                                visible: !root.sectionCollapsed(modelData.id) && root.viewMode === "compact"
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: modelData.fixtures

                                    Rectangle {
                                        required property var modelData
                                        radius: 8
                                        color: "#111a28"
                                        border.color: engineController.lightingSelectedFixtureId === modelData.id ? "#6aa9ff" : "#24344a"
                                        border.width: 1
                                        Layout.fillWidth: true
                                        implicitHeight: 54

                                        RowLayout {
                                            anchors.fill: parent
                                            anchors.margins: 8
                                            spacing: 8

                                            Rectangle {
                                                width: 10
                                                height: 10
                                                radius: 5
                                                color: modelData.on ? "#6fd3a8" : "#405471"
                                            }

                                            ColumnLayout {
                                                Layout.fillWidth: true
                                                spacing: 1

                                                Label {
                                                    text: modelData.name
                                                    color: "#f5f7fb"
                                                    font.pixelSize: 11
                                                    font.weight: Font.DemiBold
                                                }
                                                Label {
                                                    text: "DMX " + modelData.dmxStartAddress + "  |  "
                                                          + modelData.intensity + "%  |  "
                                                          + modelData.cct + "K"
                                                    color: "#8ea4c0"
                                                    font.pixelSize: 10
                                                }
                                            }

                                            Button {
                                                text: "Select"
                                                onClicked: engineController.updateLightingSettings({ "selectedFixtureId": modelData.id })
                                            }
                                            Button {
                                                text: modelData.on ? "Off" : "On"
                                                onClicked: engineController.setLightingFixturePower(modelData.id, !modelData.on)
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

    LightingSpatialPlotPanel {
        id: spatialPlot
        objectName: "lighting-spatial-view"
        anchors.fill: parent
        anchors.margins: 12
        visible: root.viewMode === "spatial"
        rootWindow: root.rootWindow
        engineController: root.engineController
    }
}
