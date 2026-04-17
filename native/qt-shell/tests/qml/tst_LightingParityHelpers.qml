import QtTest
import "../../qml/LightingParityHelpers.js" as LightingParityHelpers

TestCase {
    name: "LightingParityHelpers"

    function sampleGroups() {
        return [
            { "id": "group-key", "name": "Key" },
            { "id": "group-fill", "name": "Fill" }
        ]
    }

    function sampleFixtures() {
        return [
            {
                "id": "fixture-2",
                "name": "Fill Right",
                "groupId": "group-fill",
                "dmxStartAddress": 33,
                "on": false,
                "spatialX": 0.72,
                "spatialY": 0.42
            },
            {
                "id": "fixture-1",
                "name": "Key Left",
                "groupId": "group-key",
                "dmxStartAddress": 1,
                "on": true,
                "spatialX": 0.22,
                "spatialY": 0.34
            },
            {
                "id": "fixture-3",
                "name": "Back Light",
                "groupId": null,
                "dmxStartAddress": 49,
                "on": true,
                "spatialX": null,
                "spatialY": null
            }
        ]
    }

    function test_fixtureSections_keepGroupOrder_and_appendUngrouped() {
        const sections = LightingParityHelpers.fixtureSections(sampleFixtures(), sampleGroups())

        compare(sections.length, 3)
        compare(sections[0].id, "group-key")
        compare(sections[0].fixtureCount, 1)
        compare(sections[1].id, "group-fill")
        compare(sections[2].id, "__ungrouped__")
        compare(sections[2].liveCount, 1)
    }

    function test_nextFixtureId_cycles_in_sortedAddressOrder() {
        compare(LightingParityHelpers.nextFixtureId(sampleFixtures(), "fixture-1", 1), "fixture-2")
        compare(LightingParityHelpers.nextFixtureId(sampleFixtures(), "fixture-2", 1), "fixture-3")
        compare(LightingParityHelpers.nextFixtureId(sampleFixtures(), "fixture-1", -1), "fixture-3")
    }

    function test_contextMenuClamp_keeps_menu_insideViewport() {
        const position = LightingParityHelpers.clampContextMenuPosition(860, 620, 900, 640, 188, 176, 12)

        compare(position.x, 700)
        compare(position.y, 452)
    }

    function test_fitTransform_focuses_selectedFixture() {
        const fit = LightingParityHelpers.fitTransform(sampleFixtures(), ["fixture-1"], 960, 540)

        verify(fit.zoom > 1.4)
        verify(fit.panX !== 0)
        verify(fit.panY !== 0)
    }
}
