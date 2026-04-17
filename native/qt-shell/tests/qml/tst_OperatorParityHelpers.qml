import QtQuick
import QtTest
import "../../qml/OperatorParityHelpers.js" as OperatorParityHelpers

TestCase {
    name: "OperatorParityHelpers"

    function sampleProjects() {
        return [
            {
                "id": "proj-a",
                "title": "Run deck export review",
                "description": "Verify project labels before rehearsal.",
                "status": "todo",
                "priority": "p2",
                "order": 2,
                "lastUpdated": "2026-04-15T10:00:00.000Z"
            },
            {
                "id": "proj-b",
                "title": "Resolve lighting bridge fault",
                "description": "Bridge needs a replacement power supply.",
                "status": "blocked",
                "priority": "p0",
                "order": 1,
                "lastUpdated": "2026-04-17T08:30:00.000Z"
            },
            {
                "id": "proj-c",
                "title": "Archive rehearsal notes",
                "description": "Close the previous run cleanly.",
                "status": "done",
                "priority": "p3",
                "order": 0,
                "lastUpdated": "2026-04-14T08:30:00.000Z"
            }
        ]
    }

    function sampleTasks() {
        return [
            {
                "id": "task-a1",
                "projectId": "proj-a",
                "title": "Check LCD labels",
                "description": "Confirm Stream Deck labels and dial legends.",
                "priority": "p2",
                "labels": ["deck", "commissioning"]
            },
            {
                "id": "task-a2",
                "projectId": "proj-a",
                "title": "Review timer flow",
                "description": "Validate the operator clock and time report.",
                "priority": "p1",
                "labels": ["planning"]
            },
            {
                "id": "task-b1",
                "projectId": "proj-b",
                "title": "Probe bridge reachability",
                "description": "Check Apollo bridge network path.",
                "priority": "p0",
                "labels": ["lighting", "apollo"]
            }
        ]
    }

    function sampleControlSurfacePages() {
        return [
            {
                "id": "PROJECTS",
                "label": "Projects",
                "buttons": [
                    {
                        "id": "project-open",
                        "label": "Open Project",
                        "description": "Open the selected project.",
                        "type": "button"
                    }
                ],
                "dials": [
                    {
                        "id": "project-scroll",
                        "label": "Scroll",
                        "description": "Scroll project list.",
                        "type": "dial"
                    }
                ]
            }
        ]
    }

    function test_priorityRank_ordersCriticalBeforeRoutine() {
        compare(OperatorParityHelpers.planningPriorityRank("p0"), 0)
        compare(OperatorParityHelpers.planningPriorityRank("p2"), 2)
        compare(OperatorParityHelpers.planningPriorityRank("unknown"), 9)
    }

    function test_projectMatchesSearch_findsTaskTextAndLabels() {
        const tasks = OperatorParityHelpers.tasksForProject(sampleTasks(), "proj-a")
        verify(OperatorParityHelpers.planningProjectMatchesSearch(sampleProjects()[0], "deck", tasks))
        verify(OperatorParityHelpers.planningProjectMatchesSearch(sampleProjects()[0], "clock", tasks))
        verify(!OperatorParityHelpers.planningProjectMatchesSearch(sampleProjects()[0], "apollo", tasks))
    }

    function test_filteredProjects_respectsPrioritySorting() {
        const result = OperatorParityHelpers.filteredPlanningProjects(
            sampleProjects(),
            sampleTasks(),
            "all",
            "priority",
            ""
        )

        compare(result.length, 3)
        compare(result[0].id, "proj-b")
        compare(result[1].id, "proj-a")
        compare(result[2].id, "proj-c")
    }

    function test_filteredProjectsForStatus_scopesSearchWithinColumn() {
        const result = OperatorParityHelpers.filteredPlanningProjectsForStatus(
            sampleProjects(),
            sampleTasks(),
            "all",
            "manual",
            "deck",
            "todo"
        )

        compare(result.length, 1)
        compare(result[0].id, "proj-a")
    }

    function test_planningResultCount_respectsActiveFilter() {
        compare(
            OperatorParityHelpers.planningResultCount(
                sampleProjects(),
                sampleTasks(),
                "blocked",
                "manual",
                ""
            ),
            1
        )
    }

    function test_controlSurfaceLookup_resolvesPageAndControls() {
        const page = OperatorParityHelpers.controlSurfacePageById(sampleControlSurfacePages(), "PROJECTS")
        const control = OperatorParityHelpers.controlSurfaceControlById(
            sampleControlSurfacePages(),
            "PROJECTS",
            "project-scroll"
        )

        compare(page.label, "Projects")
        compare(OperatorParityHelpers.controlSurfacePageControls(page).length, 2)
        compare(control.label, "Scroll")
    }
}
