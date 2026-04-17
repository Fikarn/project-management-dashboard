import QtQuick
import QtTest
import "../../qml"

TestCase {
    name: "LightingSpatialPlotPanel"
    when: windowShown
    width: 960
    height: 620

    Item {
        id: container
        width: parent.width
        height: parent.height
    }

    Component {
        id: spatialHostComponent

        FocusScope {
            id: host
            width: 960
            height: 620
            focus: true
            property bool persistState: false
            property string settingsScope: "testLightingSpatialPlot"

            property alias panel: spatialPanel
            property alias engine: engineControllerStub

            function lightingFixtureById(fixtureId) {
                for (let index = 0; index < engineControllerStub.lightingFixtures.length; index += 1) {
                    if (engineControllerStub.lightingFixtures[index].id === fixtureId) {
                        return engineControllerStub.lightingFixtures[index]
                    }
                }

                return null
            }

            function lightingHasMarker(marker) {
                return !!marker && marker.x !== undefined && marker.x !== null && marker.y !== undefined && marker.y !== null
            }

            function lightingMarkerPayload(markerKey, markerValue) {
                if (markerKey === "cameraMarker") {
                    return { "cameraMarker": markerValue }
                }

                return { "subjectMarker": markerValue }
            }

            function lightingMarkerPercent(marker, axis, fallbackPercent) {
                if (!lightingHasMarker(marker)) {
                    return fallbackPercent
                }

                return marker[axis] * 100
            }

            function lightingMarkerRotation(marker) {
                return lightingHasMarker(marker) ? marker.rotation : 0
            }

            function lightingGroupName(groupId) {
                if (groupId === "group-key") {
                    return "Key"
                }
                return "Ungrouped"
            }

            function formatEnumLabel(value) {
                return value.charAt(0).toUpperCase() + value.slice(1)
            }

            QtObject {
                id: engineControllerStub

                property string workspaceMode: "lighting"
                property string lightingSelectedFixtureId: "fixture-1"
                property var lightingFixtures: [
                    {
                        "id": "fixture-1",
                        "name": "Key Left",
                        "groupId": "group-key",
                        "dmxStartAddress": 1,
                        "type": "astra-bicolor",
                        "on": true,
                        "intensity": 72,
                        "cct": 5600,
                        "spatialX": 0.24,
                        "spatialY": 0.32,
                        "spatialRotation": 0
                    },
                    {
                        "id": "fixture-2",
                        "name": "Key Right",
                        "groupId": "group-key",
                        "dmxStartAddress": 17,
                        "type": "astra-bicolor",
                        "on": false,
                        "intensity": 44,
                        "cct": 4300,
                        "spatialX": 0.72,
                        "spatialY": 0.34,
                        "spatialRotation": 0
                    },
                    {
                        "id": "fixture-3",
                        "name": "Back Light",
                        "groupId": "",
                        "dmxStartAddress": 33,
                        "type": "infinibar-pb12",
                        "on": true,
                        "intensity": 100,
                        "cct": 3200,
                        "spatialX": null,
                        "spatialY": null,
                        "spatialRotation": 0
                    }
                ]
                property var lightingCameraMarker: { "x": 0.5, "y": 0.84, "rotation": 0 }
                property var lightingSubjectMarker: { "x": 0.5, "y": 0.46, "rotation": 0 }
                property var lastLightingSettingsUpdate: null
                property var lastLightingFixtureUpdate: null
                property var lightingFixtureUpdates: []
                property var lastLightingPowerChange: null
                property var allPowerChanges: []

                function updateLightingSettings(changes) {
                    lastLightingSettingsUpdate = changes
                    if (changes.selectedFixtureId !== undefined) {
                        lightingSelectedFixtureId = changes.selectedFixtureId ? changes.selectedFixtureId : ""
                    }
                    if (changes.cameraMarker !== undefined) {
                        lightingCameraMarker = changes.cameraMarker
                    }
                    if (changes.subjectMarker !== undefined) {
                        lightingSubjectMarker = changes.subjectMarker
                    }
                }

                function updateLightingFixture(fixtureId, changes) {
                    lastLightingFixtureUpdate = { "fixtureId": fixtureId, "changes": changes }
                    lightingFixtureUpdates.push(lastLightingFixtureUpdate)
                }

                function setLightingFixturePower(fixtureId, on) {
                    lastLightingPowerChange = { "fixtureId": fixtureId, "on": on }
                }

                function setLightingAllPower(on) {
                    allPowerChanges.push(on)
                }
            }

            LightingSpatialPlotPanel {
                id: spatialPanel
                anchors.fill: parent
                rootWindow: host
                engineController: engineControllerStub
                persistState: host.persistState
                settingsScope: host.settingsScope
            }
        }
    }

    function createHost(properties) {
        const host = createTemporaryObject(spatialHostComponent, container, properties || {})
        verify(host !== null)
        waitForRendering(host)
        waitForRendering(findChild(host.panel, "lighting-plot-viewport"))
        wait(0)
        host.panel.forceActiveFocus()
        wait(0)
        return host
    }

    function findChild(item, objectName) {
        if (!item) {
            return null
        }

        if (item.objectName === objectName) {
            return item
        }

        const childItems = item.children || []
        for (let index = 0; index < childItems.length; index += 1) {
            const match = findChild(childItems[index], objectName)
            if (match) {
                return match
            }
        }

        return null
    }

    function pressButton(button) {
        verify(button !== null)
        if (button.clicked) {
            button.clicked()
        } else {
            mouseClick(button, button.width / 2, button.height / 2, Qt.LeftButton)
        }
        wait(0)
    }

    function test_keyboardSelection_cycles_betweenFixtures() {
        const host = createHost()

        host.panel.selectRelative(1)
        compare(host.engine.lightingSelectedFixtureId, "fixture-2")

        host.panel.selectRelative(-1)
        compare(host.engine.lightingSelectedFixtureId, "fixture-1")
    }

    function test_fitSelection_and_contextMenu_use_clampedViewportState() {
        const host = createHost()
        const viewport = findChild(host.panel, "lighting-plot-viewport")

        host.panel.fitSelection()
        verify(host.panel.viewportZoom >= 0.85)

        host.panel.showContextMenuForFixture("fixture-2", 920, 610)
        compare(host.panel.contextMenuVisible, true)
        verify(host.panel.contextMenuX <= viewport.width - host.panel.contextMenuWidth)
        verify(host.panel.contextMenuY <= viewport.height - host.panel.contextMenuHeight)
    }

    function test_markerToggle_updates_engineSettings() {
        const host = createHost()

        host.panel.toggleMarker("cameraMarker", 0.5, 0.84)
        compare(host.engine.lastLightingSettingsUpdate.cameraMarker, null)

        host.panel.toggleMarker("cameraMarker", 0.5, 0.84)
        compare(host.engine.lastLightingSettingsUpdate.cameraMarker.x, 0.5)
        compare(host.engine.lastLightingSettingsUpdate.cameraMarker.y, 0.84)
    }

    function test_keyboardShortcuts_restore_operator_flow() {
        const host = createHost()

        compare(host.panel.contextMenuVisible, false)
        host.panel.showContextMenuForSelectedFixture()
        compare(host.panel.contextMenuVisible, true)

        host.panel.viewportZoom = 1.35
        host.panel.resetView()
        compare(host.panel.viewportZoom, 1.0)
    }

    function test_contextMenu_quickActions_match_legacy_presets() {
        const host = createHost()

        host.panel.showContextMenuForFixture("fixture-1", 120, 140)
        pressButton(findChild(host.panel, "lighting-context-intensity-75"))
        compare(host.engine.lastLightingFixtureUpdate.fixtureId, "fixture-1")
        compare(host.engine.lastLightingFixtureUpdate.changes.intensity, 75)
        compare(host.engine.lastLightingFixtureUpdate.changes.on, true)

        host.panel.showContextMenuForFixture("fixture-1", 120, 140)
        pressButton(findChild(host.panel, "lighting-context-cct-tungsten"))
        compare(host.engine.lastLightingFixtureUpdate.changes.cct, 3200)

        host.panel.showContextMenuForFixture("fixture-1", 120, 140)
        pressButton(findChild(host.panel, "lighting-context-solo"))
        compare(host.engine.allPowerChanges.length, 1)
        compare(host.engine.allPowerChanges[0], false)
        compare(host.engine.lastLightingPowerChange.fixtureId, "fixture-1")
        compare(host.engine.lastLightingPowerChange.on, true)
    }

    function test_arrangeMissing_and_clearSelection_restore_operator_flow() {
        const host = createHost()

        compare(host.panel.unplacedFixtureCount(), 1)
        pressButton(findChild(host.panel, "lighting-arrange-missing"))
        compare(host.engine.lightingFixtureUpdates.length, 1)
        compare(host.engine.lightingFixtureUpdates[0].fixtureId, "fixture-3")
        verify(host.engine.lightingFixtureUpdates[0].changes.spatialX !== null)
        verify(host.engine.lightingFixtureUpdates[0].changes.spatialY !== null)

        compare(host.engine.lightingSelectedFixtureId, "fixture-1")
        host.panel.showContextMenuForSelectedFixture()
        compare(host.panel.contextMenuVisible, true)
        pressButton(findChild(host.panel, "lighting-clear-selection"))
        compare(host.engine.lightingSelectedFixtureId, "")
        compare(host.panel.contextMenuVisible, false)
    }

    function test_viewportState_persists_when_enabled() {
        const scope = "testLightingSpatialPlot-" + Date.now() + "-" + Math.round(Math.random() * 100000)
        const firstHost = createHost({
            "persistState": true,
            "settingsScope": scope
        })

        firstHost.panel.viewportZoom = 1.3
        firstHost.panel.viewportPanX = 42
        firstHost.panel.viewportPanY = -18
        firstHost.panel.showGrid = false
        firstHost.panel.snapToGrid = false
        firstHost.panel.panMode = true
        firstHost.panel.cameraFrame = "tight"
        wait(0)
        firstHost.destroy()
        wait(0)

        const restoredHost = createHost({
            "persistState": true,
            "settingsScope": scope
        })
        compare(restoredHost.panel.viewportZoom, 1.3)
        compare(restoredHost.panel.viewportPanX, 42)
        compare(restoredHost.panel.viewportPanY, -18)
        compare(restoredHost.panel.showGrid, false)
        compare(restoredHost.panel.snapToGrid, false)
        compare(restoredHost.panel.panMode, true)
        compare(restoredHost.panel.cameraFrame, "tight")
    }
}
