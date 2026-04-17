.pragma library

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum)
}

function compareFixtures(left, right) {
    const addressDelta = Number(left && left.dmxStartAddress ? left.dmxStartAddress : 0)
                         - Number(right && right.dmxStartAddress ? right.dmxStartAddress : 0)
    if (addressDelta !== 0) {
        return addressDelta
    }

    return String(left && left.name ? left.name : "").localeCompare(String(right && right.name ? right.name : ""))
}

function sortedFixtures(fixtures) {
    const items = (fixtures || []).slice()
    items.sort(compareFixtures)
    return items
}

function groupNameById(groups, groupId) {
    if (!groupId) {
        return "Ungrouped"
    }

    const items = groups || []
    for (let index = 0; index < items.length; index += 1) {
        if (items[index].id === groupId) {
            return items[index].name
        }
    }

    return groupId
}

function fixtureSections(fixtures, groups) {
    const sections = []
    const groupedFixtures = {}
    const orderedFixtures = sortedFixtures(fixtures)
    for (let index = 0; index < orderedFixtures.length; index += 1) {
        const fixture = orderedFixtures[index]
        const key = fixture.groupId ? fixture.groupId : "__ungrouped__"
        if (!groupedFixtures[key]) {
            groupedFixtures[key] = []
        }
        groupedFixtures[key].push(fixture)
    }

    const groupItems = groups || []
    for (let groupIndex = 0; groupIndex < groupItems.length; groupIndex += 1) {
        const group = groupItems[groupIndex]
        const groupFixtures = groupedFixtures[group.id] || []
        if (!groupFixtures.length) {
            continue
        }

        sections.push({
            "id": group.id,
            "name": group.name,
            "fixtures": groupFixtures,
            "fixtureCount": groupFixtures.length,
            "liveCount": liveFixtureCount(groupFixtures)
        })
    }

    const ungroupedFixtures = groupedFixtures.__ungrouped__ || []
    if (ungroupedFixtures.length) {
        sections.push({
            "id": "__ungrouped__",
            "name": "Ungrouped",
            "fixtures": ungroupedFixtures,
            "fixtureCount": ungroupedFixtures.length,
            "liveCount": liveFixtureCount(ungroupedFixtures)
        })
    }

    return sections
}

function liveFixtureCount(fixtures) {
    let count = 0
    const items = fixtures || []
    for (let index = 0; index < items.length; index += 1) {
        if (items[index].on) {
            count += 1
        }
    }
    return count
}

function firstUnplacedFixtureId(fixtures) {
    const items = sortedFixtures(fixtures)
    for (let index = 0; index < items.length; index += 1) {
        const fixture = items[index]
        if (fixture.spatialX === undefined || fixture.spatialX === null
                || fixture.spatialY === undefined || fixture.spatialY === null) {
            return fixture.id
        }
    }

    return ""
}

function nextFixtureId(fixtures, currentId, step) {
    const items = sortedFixtures(fixtures)
    if (!items.length) {
        return ""
    }

    let currentIndex = 0
    if (currentId) {
        for (let index = 0; index < items.length; index += 1) {
            if (items[index].id === currentId) {
                currentIndex = index
                break
            }
        }
    }

    const direction = step < 0 ? -1 : 1
    const nextIndex = (currentIndex + direction + items.length) % items.length
    return items[nextIndex].id
}

function clampContextMenuPosition(x, y, viewportWidth, viewportHeight, menuWidth, menuHeight, padding) {
    const safePadding = padding === undefined ? 12 : padding
    return {
        "x": clamp(x, safePadding, Math.max(safePadding, viewportWidth - menuWidth - safePadding)),
        "y": clamp(y, safePadding, Math.max(safePadding, viewportHeight - menuHeight - safePadding))
    }
}

function resolvedFixtures(fixtures) {
    const items = sortedFixtures(fixtures)
    const unresolved = []
    for (let index = 0; index < items.length; index += 1) {
        const fixture = items[index]
        if (fixture.spatialX === undefined || fixture.spatialX === null
                || fixture.spatialY === undefined || fixture.spatialY === null) {
            unresolved.push(fixture.id)
        }
    }

    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(Math.max(unresolved.length, 1)))))
    const rows = Math.max(1, Math.ceil(unresolved.length / columns))
    const suggestions = {}
    for (let index = 0; index < unresolved.length; index += 1) {
        const column = index % columns
        const row = Math.floor(index / columns)
        suggestions[unresolved[index]] = {
            "x": columns === 1 ? 0.5 : 0.18 + (column / Math.max(columns - 1, 1)) * 0.64,
            "y": rows === 1 ? 0.52 : 0.28 + (row / Math.max(rows - 1, 1)) * 0.34
        }
    }

    const resolved = []
    for (let fixtureIndex = 0; fixtureIndex < items.length; fixtureIndex += 1) {
        const fixture = items[fixtureIndex]
        const fallback = suggestions[fixture.id] || { "x": 0.5, "y": 0.5 }
        resolved.push({
            "id": fixture.id,
            "fixture": fixture,
            "resolvedX": fixture.spatialX === undefined || fixture.spatialX === null ? fallback.x : fixture.spatialX,
            "resolvedY": fixture.spatialY === undefined || fixture.spatialY === null ? fallback.y : fixture.spatialY
        })
    }

    return resolved
}

function fitTransform(fixtures, selectedIds, viewportWidth, viewportHeight) {
    const resolved = resolvedFixtures(fixtures)
    if (!resolved.length || viewportWidth <= 0 || viewportHeight <= 0) {
        return { "zoom": 1, "panX": 0, "panY": 0 }
    }

    const selectedLookup = {}
    const ids = selectedIds || []
    for (let idIndex = 0; idIndex < ids.length; idIndex += 1) {
        selectedLookup[ids[idIndex]] = true
    }

    const targets = []
    for (let index = 0; index < resolved.length; index += 1) {
        if (!ids.length || selectedLookup[resolved[index].id]) {
            targets.push(resolved[index])
        }
    }

    const points = targets.length ? targets : resolved
    let minX = viewportWidth
    let maxX = 0
    let minY = viewportHeight
    let maxY = 0

    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
        const point = points[pointIndex]
        const x = point.resolvedX * viewportWidth
        const y = point.resolvedY * viewportHeight
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
    }

    if (points.length === 1) {
        minX -= 90
        maxX += 90
        minY -= 70
        maxY += 70
    }

    const padding = 56
    const boundsWidth = Math.max(140, maxX - minX)
    const boundsHeight = Math.max(120, maxY - minY)
    const zoom = clamp(
        Math.min((viewportWidth - padding * 2) / boundsWidth, (viewportHeight - padding * 2) / boundsHeight),
        0.85,
        2.4
    )
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    return {
        "zoom": zoom,
        "panX": viewportWidth / 2 - centerX * zoom,
        "panY": viewportHeight / 2 - centerY * zoom
    }
}
