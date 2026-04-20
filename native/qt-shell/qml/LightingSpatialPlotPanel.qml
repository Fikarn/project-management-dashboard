import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtCore
import "LightingParityHelpers.js" as LightingParityHelpers

Rectangle {
    id: root
    objectName: "lighting-spatial-plot-panel"
    required property var rootWindow
    required property var engineController
    property bool persistState: true
    property string settingsScope: "nativeLightingSpatialPlot"
    property real viewportZoom: 1.0
    property real viewportPanX: 0
    property real viewportPanY: 0
    property bool showGrid: true
    property bool snapToGrid: true
    property bool panMode: false
    property string cameraFrame: "medium"
    property bool viewportStateRestored: false
    property bool contextMenuVisible: false
    property string contextMenuFixtureId: ""
    property real contextMenuX: 12
    property real contextMenuY: 12
    readonly property int contextMenuWidth: 196
    readonly property int contextMenuHeight: 248
    readonly property var resolvedFixtures: LightingParityHelpers.resolvedFixtures(
                                                engineController ? engineController.lightingFixtures : []
                                            )

    ConsoleTheme {
        id: theme
    }

    Settings {
        id: viewportSettings
        category: root.settingsScope

        property real storedViewportZoom: NaN
        property real storedViewportPanX: NaN
        property real storedViewportPanY: NaN
        property bool storedShowGrid: true
        property bool storedSnapToGrid: true
        property bool storedPanMode: false
        property string storedCameraFrame: "medium"
    }

    function selectedIds() {
        if (!engineController || !engineController.lightingSelectedFixtureId.length) {
            return []
        }

        return [engineController.lightingSelectedFixtureId]
    }

    function updateFixtureSelection(fixtureId) {
        engineController.updateLightingSettings({
            "selectedFixtureId": fixtureId && fixtureId.length ? fixtureId : null
        })
    }

    function clearSelection() {
        root.hideContextMenu()
        root.updateFixtureSelection("")
    }

    function unplacedFixtureCount() {
        if (!engineController) {
            return 0
        }

        let count = 0
        for (let index = 0; index < engineController.lightingFixtures.length; index += 1) {
            const fixture = engineController.lightingFixtures[index]
            if (fixture.spatialX === undefined || fixture.spatialX === null
                    || fixture.spatialY === undefined || fixture.spatialY === null) {
                count += 1
            }
        }

        return count
    }

    function arrangeMissingFixtures() {
        if (!engineController) {
            return false
        }

        let updated = false
        for (let index = 0; index < root.resolvedFixtures.length; index += 1) {
            const resolvedFixture = root.resolvedFixtures[index]
            const fixture = resolvedFixture.fixture
            if (fixture.spatialX === undefined || fixture.spatialX === null
                    || fixture.spatialY === undefined || fixture.spatialY === null) {
                engineController.updateLightingFixture(fixture.id, {
                    "spatialX": resolvedFixture.resolvedX,
                    "spatialY": resolvedFixture.resolvedY
                })
                updated = true
            }
        }

        return updated
    }

    function selectRelative(step) {
        const nextId = LightingParityHelpers.nextFixtureId(
            engineController ? engineController.lightingFixtures : [],
            engineController ? engineController.lightingSelectedFixtureId : "",
            step
        )
        if (nextId.length) {
            updateFixtureSelection(nextId)
        }
    }

    function fitAll() {
        const fit = LightingParityHelpers.fitTransform(
            engineController ? engineController.lightingFixtures : [],
            [],
            plotViewport.width,
            plotViewport.height
        )
        viewportZoom = fit.zoom
        viewportPanX = fit.panX
        viewportPanY = fit.panY
    }

    function fitSelection() {
        const fit = LightingParityHelpers.fitTransform(
            engineController ? engineController.lightingFixtures : [],
            selectedIds(),
            plotViewport.width,
            plotViewport.height
        )
        viewportZoom = fit.zoom
        viewportPanX = fit.panX
        viewportPanY = fit.panY
    }

    function resetView() {
        viewportZoom = 1.0
        viewportPanX = 0
        viewportPanY = 0
    }

    function toggleMarker(markerKey, defaultX, defaultY) {
        const isCamera = markerKey === "cameraMarker"
        const marker = isCamera ? engineController.lightingCameraMarker : engineController.lightingSubjectMarker
        if (rootWindow.lightingHasMarker(marker)) {
            engineController.updateLightingSettings(rootWindow.lightingMarkerPayload(markerKey, null))
        } else {
            engineController.updateLightingSettings(
                rootWindow.lightingMarkerPayload(markerKey, {
                    "x": defaultX,
                    "y": defaultY,
                    "rotation": 0
                })
            )
        }
    }

    function showContextMenuForFixture(fixtureId, requestedX, requestedY) {
        const position = LightingParityHelpers.clampContextMenuPosition(
            requestedX,
            requestedY,
            plotViewport.width,
            plotViewport.height,
            contextMenuWidth,
            contextMenuHeight,
            12
        )
        contextMenuFixtureId = fixtureId
        contextMenuX = position.x
        contextMenuY = position.y
        contextMenuVisible = true
        updateFixtureSelection(fixtureId)
    }

    function hideContextMenu() {
        contextMenuVisible = false
        contextMenuFixtureId = ""
    }

    function contextMenuFixture() {
        return rootWindow.lightingFixtureById(contextMenuFixtureId)
    }

    function resolvedFixtureById(fixtureId) {
        for (let index = 0; index < resolvedFixtures.length; index += 1) {
            if (resolvedFixtures[index].id === fixtureId) {
                return resolvedFixtures[index]
            }
        }

        return null
    }

    function showContextMenuForSelectedFixture() {
        if (!engineController) {
            return false
        }

        let fixtureId = engineController.lightingSelectedFixtureId
        if (!fixtureId.length && engineController.lightingFixtures.length) {
            fixtureId = engineController.lightingFixtures[0].id
            root.updateFixtureSelection(fixtureId)
        }

        if (!fixtureId.length) {
            return false
        }

        const resolvedFixture = root.resolvedFixtureById(fixtureId)
        const requestedX = resolvedFixture
                           ? resolvedFixture.resolvedX * plotViewport.width * root.viewportZoom + root.viewportPanX + 28
                           : plotViewport.width / 2
        const requestedY = resolvedFixture
                           ? resolvedFixture.resolvedY * plotViewport.height * root.viewportZoom + root.viewportPanY + 20
                           : plotViewport.height / 2

        root.showContextMenuForFixture(
            fixtureId,
            requestedX,
            requestedY
        )
        return true
    }

    function zoomBy(delta) {
        viewportZoom = Math.max(0.85, Math.min(2.4, viewportZoom + delta))
    }

    function restoreViewportState() {
        if (!root.persistState || root.viewportStateRestored) {
            return
        }

        root.showGrid = viewportSettings.storedShowGrid
        root.snapToGrid = viewportSettings.storedSnapToGrid
        root.panMode = viewportSettings.storedPanMode

        if (viewportSettings.storedCameraFrame === "wide"
                || viewportSettings.storedCameraFrame === "medium"
                || viewportSettings.storedCameraFrame === "tight") {
            root.cameraFrame = viewportSettings.storedCameraFrame
        }

        if (isFinite(viewportSettings.storedViewportZoom)) {
            root.viewportZoom = Math.max(0.85, Math.min(2.4, viewportSettings.storedViewportZoom))
            root.viewportPanX = isFinite(viewportSettings.storedViewportPanX) ? viewportSettings.storedViewportPanX : 0
            root.viewportPanY = isFinite(viewportSettings.storedViewportPanY) ? viewportSettings.storedViewportPanY : 0
        } else if (plotViewport.width > 0 && plotViewport.height > 0) {
            root.fitAll()
        }

        root.viewportStateRestored = true
    }

    function persistViewportState() {
        if (!root.persistState || !root.viewportStateRestored) {
            return
        }

        viewportSettings.storedViewportZoom = root.viewportZoom
        viewportSettings.storedViewportPanX = root.viewportPanX
        viewportSettings.storedViewportPanY = root.viewportPanY
        viewportSettings.storedShowGrid = root.showGrid
        viewportSettings.storedSnapToGrid = root.snapToGrid
        viewportSettings.storedPanMode = root.panMode
        viewportSettings.storedCameraFrame = root.cameraFrame
    }

    function handleOperatorKey(key) {
        if (!visible) {
            return false
        }

        if (key === Qt.Key_Left || key === Qt.Key_Up) {
            root.selectRelative(-1)
            return true
        }
        if (key === Qt.Key_Right || key === Qt.Key_Down) {
            root.selectRelative(1)
            return true
        }
        if (key === Qt.Key_F) {
            root.fitSelection()
            return true
        }
        if (key === Qt.Key_Enter || key === Qt.Key_Return || key === Qt.Key_Space) {
            return root.showContextMenuForSelectedFixture()
        }
        if (key === Qt.Key_Escape) {
            root.clearSelection()
            return true
        }
        if (key === Qt.Key_Plus || key === Qt.Key_Equal) {
            root.zoomBy(0.15)
            return true
        }
        if (key === Qt.Key_Minus || key === Qt.Key_Underscore) {
            root.zoomBy(-0.15)
            return true
        }
        if (key === Qt.Key_0) {
            root.resetView()
            return true
        }
        if (key === Qt.Key_G) {
            root.showGrid = !root.showGrid
            return true
        }
        if (key === Qt.Key_S) {
            root.snapToGrid = !root.snapToGrid
            return true
        }
        if (key === Qt.Key_C) {
            root.toggleMarker("cameraMarker", 0.5, 0.84)
            return true
        }
        if (key === Qt.Key_T) {
            root.toggleMarker("subjectMarker", 0.5, 0.46)
            return true
        }

        return false
    }

    Component.onCompleted: restoreViewportState()
    onViewportZoomChanged: persistViewportState()
    onViewportPanXChanged: persistViewportState()
    onViewportPanYChanged: persistViewportState()
    onShowGridChanged: persistViewportState()
    onSnapToGridChanged: persistViewportState()
    onPanModeChanged: persistViewportState()
    onCameraFrameChanged: persistViewportState()

    focus: visible
    Keys.onPressed: function(event) {
        if (root.handleOperatorKey(event.key)) {
            event.accepted = true
        }
    }

    radius: 12
    color: "#101826"
    border.color: "#2a3b55"
    border.width: 1
    Layout.fillWidth: true
    Layout.fillHeight: true

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Label {
                    text: "Studio Plot"
                    color: "#f5f7fb"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                Label {
                    text: resolvedFixtures.length + " fixtures  |  "
                          + root.selectedIds().length + " selected  |  "
                          + (root.unplacedFixtureCount()
                             ? root.unplacedFixtureCount() + " awaiting placement"
                             : "All placed")
                    color: "#8ea4c0"
                    font.pixelSize: 11
                }
            }

            RowLayout {
                spacing: 6

                Button { objectName: "lighting-zoom-out"; text: "-" ; onClicked: root.zoomBy(-0.15) }
                Button { objectName: "lighting-zoom-in"; text: "+" ; onClicked: root.zoomBy(0.15) }
                Rectangle {
                    objectName: "lighting-zoom-badge"
                    radius: 999
                    color: "#09101a"
                    border.color: "#24344a"
                    border.width: 1
                    implicitWidth: zoomBadgeLabel.implicitWidth + 18
                    implicitHeight: 28

                    Label {
                        id: zoomBadgeLabel
                        anchors.centerIn: parent
                        text: Math.round(root.viewportZoom * 100) + "%"
                        color: "#d6dce5"
                        font.family: theme.monoFontFamily
                        font.pixelSize: 11
                        font.weight: Font.DemiBold
                    }
                }
                Button { objectName: "lighting-fit-all"; text: "Fit All"; onClicked: root.fitAll() }
                Button {
                    objectName: "lighting-fit-selection"
                    text: "Fit Selection"
                    enabled: root.selectedIds().length > 0
                    onClicked: root.fitSelection()
                }
                Button { objectName: "lighting-reset-view"; text: "Reset"; onClicked: root.resetView() }
                Button {
                    objectName: "lighting-pan-mode"
                    text: root.panMode ? "Pan On" : "Pan Off"
                    highlighted: root.panMode
                    onClicked: root.panMode = !root.panMode
                }
                Button {
                    objectName: "lighting-grid-toggle"
                    text: root.showGrid ? "Grid On" : "Grid Off"
                    highlighted: root.showGrid
                    onClicked: root.showGrid = !root.showGrid
                }
                Button {
                    objectName: "lighting-snap-toggle"
                    text: root.snapToGrid ? "Snap On" : "Snap Off"
                    highlighted: root.snapToGrid
                    onClicked: root.snapToGrid = !root.snapToGrid
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            Button {
                objectName: "lighting-arrange-missing"
                text: root.unplacedFixtureCount() ? "Arrange Missing (" + root.unplacedFixtureCount() + ")" : "Arrange Missing"
                enabled: root.unplacedFixtureCount() > 0
                onClicked: root.arrangeMissingFixtures()
            }
            Button {
                objectName: "lighting-clear-selection"
                text: "Clear"
                enabled: root.selectedIds().length > 0 || root.contextMenuVisible
                onClicked: root.clearSelection()
            }

            Button {
                objectName: "lighting-camera-toggle"
                text: rootWindow.lightingHasMarker(engineController.lightingCameraMarker) ? "Hide Camera" : "Show Camera"
                onClicked: root.toggleMarker("cameraMarker", 0.5, 0.84)
            }
            Button {
                objectName: "lighting-subject-toggle"
                text: rootWindow.lightingHasMarker(engineController.lightingSubjectMarker) ? "Hide Subject" : "Show Subject"
                onClicked: root.toggleMarker("subjectMarker", 0.5, 0.46)
            }

            Item { Layout.fillWidth: true }

            Repeater {
                model: ["wide", "medium", "tight"]

                Button {
                    required property string modelData
                    objectName: "lighting-frame-" + modelData
                    text: rootWindow.formatEnumLabel(modelData)
                    highlighted: root.cameraFrame === modelData
                    onClicked: root.cameraFrame = modelData
                }
            }
        }

        Rectangle {
            id: plotViewport
            objectName: "lighting-plot-viewport"
            radius: 12
            color: "#0c1320"
            border.color: "#24344a"
            border.width: 1
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            property real panStartX: 0
            property real panStartY: 0

            DragHandler {
                id: panDragHandler
                target: null
                onActiveChanged: {
                    if (active) {
                        plotViewport.panStartX = root.viewportPanX
                        plotViewport.panStartY = root.viewportPanY
                    }
                }
                onTranslationChanged: {
                    if (active && (root.panMode || root.viewportZoom > 1.05)) {
                        root.viewportPanX = plotViewport.panStartX + activeTranslation.x
                        root.viewportPanY = plotViewport.panStartY + activeTranslation.y
                    }
                }
            }

            MouseArea {
                anchors.fill: parent
                acceptedButtons: Qt.LeftButton
                onPressed: root.forceActiveFocus()
                onClicked: {
                    root.clearSelection()
                }
            }

            Item {
                id: plotStage
                width: plotViewport.width
                height: plotViewport.height
                x: root.viewportPanX
                y: root.viewportPanY
                scale: root.viewportZoom
                transformOrigin: Item.TopLeft

                Repeater {
                    model: root.showGrid ? 20 : 0

                    Rectangle {
                        required property int index
                        x: (index / 19) * plotStage.width
                        y: 0
                        width: 1
                        height: plotStage.height
                        color: "#172235"
                        opacity: 0.7
                    }
                }

                Repeater {
                    model: root.showGrid ? 12 : 0

                    Rectangle {
                        required property int index
                        x: 0
                        y: (index / 11) * plotStage.height
                        width: plotStage.width
                        height: 1
                        color: "#172235"
                        opacity: 0.7
                    }
                }

                Item {
                    anchors.fill: parent

                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.top: parent.top
                        anchors.topMargin: 18
                        radius: 999
                        color: "#09101a"
                        border.color: "#24344a"
                        border.width: 1
                        implicitWidth: backWallLabel.implicitWidth + 22
                        implicitHeight: 28

                        Label {
                            id: backWallLabel
                            anchors.centerIn: parent
                            text: "Back Wall / Key Side"
                            color: "#b9c6d8"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }

                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: 18
                        radius: 999
                        color: "#09101a"
                        border.color: "#24344a"
                        border.width: 1
                        implicitWidth: operatorLineLabel.implicitWidth + 22
                        implicitHeight: 28

                        Label {
                            id: operatorLineLabel
                            anchors.centerIn: parent
                            text: "Camera Line / Operator Side"
                            color: "#b9c6d8"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }

                    Label {
                        anchors.left: parent.left
                        anchors.leftMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        rotation: -90
                        text: "Stage Left"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                    }

                    Label {
                        anchors.right: parent.right
                        anchors.rightMargin: 14
                        anchors.verticalCenter: parent.verticalCenter
                        rotation: 90
                        text: "Stage Right"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                    }

                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.verticalCenterOffset: -22
                        radius: 999
                        color: "#0d1725"
                        border.color: "#28445f"
                        border.width: 1
                        implicitWidth: subjectZoneLabel.implicitWidth + 22
                        implicitHeight: 28

                        Label {
                            id: subjectZoneLabel
                            anchors.centerIn: parent
                            text: "Subject Zone"
                            color: "#d6dce5"
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }
                }

                Repeater {
                    model: root.resolvedFixtures

                    Item {
                        required property var modelData
                        width: 84
                        height: 56
                        x: modelData.resolvedX * plotStage.width - width / 2
                        y: modelData.resolvedY * plotStage.height - 24
                        z: engineController.lightingSelectedFixtureId === modelData.id ? 4 : 2

                        Rectangle {
                            id: fixtureNode
                            anchors.horizontalCenter: parent.horizontalCenter
                            width: 28
                            height: 28
                            radius: 14
                            color: modelData.fixture.on ? "#6aa9ff" : "#253449"
                            border.color: engineController.lightingSelectedFixtureId === modelData.id ? "#f7d47c" : "#8ea4c0"
                            border.width: engineController.lightingSelectedFixtureId === modelData.id ? 2 : 1
                        }

                        ColumnLayout {
                            anchors.top: fixtureNode.bottom
                            anchors.topMargin: 4
                            anchors.horizontalCenter: fixtureNode.horizontalCenter
                            spacing: 1

                            Label {
                                text: modelData.fixture.name
                                color: "#f5f7fb"
                                font.pixelSize: 10
                                font.weight: Font.DemiBold
                                horizontalAlignment: Text.AlignHCenter
                            }

                            Label {
                                text: "DMX " + modelData.fixture.dmxStartAddress
                                color: "#8ea4c0"
                                font.pixelSize: 9
                                horizontalAlignment: Text.AlignHCenter
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            acceptedButtons: Qt.LeftButton | Qt.RightButton
                            onPressed: root.forceActiveFocus()
                            onClicked: function(mouse) {
                                root.hideContextMenu()
                                root.updateFixtureSelection(modelData.id)
                                if (mouse.button === Qt.RightButton) {
                                    root.showContextMenuForFixture(modelData.id, mouse.x + parent.x, mouse.y + parent.y)
                                }
                            }
                        }
                    }
                }

                Repeater {
                    model: [
                        {
                            "label": "Camera",
                            "color": "#6aa9ff",
                            "marker": engineController ? engineController.lightingCameraMarker : null
                        },
                        {
                            "label": "Talent",
                            "color": "#f7d47c",
                            "marker": engineController ? engineController.lightingSubjectMarker : null
                        }
                    ]

                    Item {
                        required property var modelData
                        visible: rootWindow.lightingHasMarker(modelData.marker)
                        width: 88
                        height: 42
                        x: rootWindow.lightingMarkerPercent(modelData.marker, "x", 50) / 100 * plotStage.width - 44
                        y: rootWindow.lightingMarkerPercent(modelData.marker, "y", 50) / 100 * plotStage.height - 21
                        z: 5

                        Rectangle {
                            anchors.centerIn: parent
                            width: 16
                            height: 16
                            radius: 8
                            color: modelData.color
                            border.color: "#0c1320"
                            border.width: 2
                        }

                        Label {
                            anchors.top: parent.verticalCenter
                            anchors.topMargin: 10
                            anchors.horizontalCenter: parent.horizontalCenter
                            text: modelData.label + "  " + Math.round(rootWindow.lightingMarkerRotation(modelData.marker)) + "deg"
                            color: modelData.color
                            font.pixelSize: 10
                            font.weight: Font.DemiBold
                        }
                    }
                }
            }

            Rectangle {
                anchors.left: parent.left
                anchors.leftMargin: 12
                anchors.top: parent.top
                anchors.topMargin: 12
                radius: 999
                color: "#09101a"
                border.color: "#24344a"
                border.width: 1
                implicitWidth: frameBadgeLabel.implicitWidth + 18
                implicitHeight: 26

                Label {
                    id: frameBadgeLabel
                    anchors.centerIn: parent
                    text: "Frame " + root.cameraFrame.toUpperCase() + "  |  F to fit selection"
                    color: "#b9c6d8"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                }
            }

            Rectangle {
                anchors.right: parent.right
                anchors.rightMargin: 12
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 12
                radius: 12
                color: "#09101a"
                border.color: "#24344a"
                border.width: 1
                implicitWidth: quickHintLayout.implicitWidth + 20
                implicitHeight: quickHintLayout.implicitHeight + 20

                ColumnLayout {
                    id: quickHintLayout
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 4

                    Label {
                        text: "Operator Shortcuts"
                        color: "#d6dce5"
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                    }
                    Label {
                        text: "Arrows select  |  Enter opens quick actions"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                    }
                    Label {
                        text: "F fit selection  |  G grid  |  S snap  |  Esc clear"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                objectName: "lighting-context-menu"
                visible: root.contextMenuVisible && !!root.contextMenuFixture()
                x: root.contextMenuX
                y: root.contextMenuY
                width: root.contextMenuWidth
                height: root.contextMenuHeight
                radius: 12
                color: "#101826"
                border.color: "#35506b"
                border.width: 1
                z: 20

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    Label {
                        text: "Quick Actions"
                        color: "#8ea4c0"
                        font.pixelSize: 10
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: root.contextMenuFixture() ? root.contextMenuFixture().name : ""
                        color: "#f5f7fb"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }

                    Label {
                        text: root.contextMenuFixture()
                              ? rootWindow.lightingGroupName(root.contextMenuFixture().groupId)
                                + "  |  DMX "
                                + root.contextMenuFixture().dmxStartAddress
                              : ""
                        color: "#8ea4c0"
                        font.pixelSize: 10
                        wrapMode: Text.WordWrap
                        Layout.fillWidth: true
                    }

                    GridLayout {
                        Layout.fillWidth: true
                        columns: 2
                        columnSpacing: 6
                        rowSpacing: 6

                        Button {
                            objectName: "lighting-context-toggle-power"
                            text: root.contextMenuFixture() && root.contextMenuFixture().on ? "Turn Off" : "Turn On"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.setLightingFixturePower(fixture.id, !fixture.on)
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-solo"
                            text: "Solo"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.setLightingAllPower(false)
                                engineController.setLightingFixturePower(fixture.id, true)
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-intensity-25"
                            text: "25%"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, {
                                    "intensity": 25,
                                    "on": true
                                })
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-intensity-50"
                            text: "50%"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, {
                                    "intensity": 50,
                                    "on": true
                                })
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-intensity-75"
                            text: "75%"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, {
                                    "intensity": 75,
                                    "on": true
                                })
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-intensity-100"
                            text: "100%"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, {
                                    "intensity": 100,
                                    "on": true
                                })
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-cct-tungsten"
                            text: "Tungsten"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, { "cct": 3200 })
                                root.hideContextMenu()
                            }
                        }
                        Button {
                            objectName: "lighting-context-cct-daylight"
                            text: "Daylight"
                            onClicked: {
                                const fixture = root.contextMenuFixture()
                                engineController.updateLightingFixture(fixture.id, { "cct": 5600 })
                                root.hideContextMenu()
                            }
                        }
                    }
                }
            }
        }
    }
}
