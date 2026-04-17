.pragma library

function normalizedText(value) {
    if (value === null || value === undefined) {
        return ""
    }

    return String(value).toLowerCase()
}

function labelsToText(labels) {
    if (!labels || labels.length === 0) {
        return ""
    }

    return labels.join(", ")
}

function planningPriorityRank(priority) {
    switch (priority) {
    case "p0":
        return 0
    case "p1":
        return 1
    case "p2":
        return 2
    case "p3":
        return 3
    default:
        return 9
    }
}

function tasksForProject(tasks, projectId) {
    const items = []
    if (!tasks || !projectId) {
        return items
    }

    for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index]
        if (task.projectId === projectId) {
            items.push(task)
        }
    }

    return items
}

function planningProjectMatchesSearch(project, query, tasks) {
    const normalizedQuery = normalizedText(query).trim()
    if (!normalizedQuery.length) {
        return true
    }

    const projectText = [
                project ? project.title : "",
                project ? project.description : "",
                project ? project.status : "",
                project ? project.priority : ""
            ].join(" ").toLowerCase()

    if (projectText.indexOf(normalizedQuery) >= 0) {
        return true
    }

    const projectTasks = tasks || []
    for (let index = 0; index < projectTasks.length; index += 1) {
        const task = projectTasks[index]
        const taskText = [
                    task.title,
                    task.description,
                    task.priority,
                    labelsToText(task.labels)
                ].join(" ").toLowerCase()
        if (taskText.indexOf(normalizedQuery) >= 0) {
            return true
        }
    }

    return false
}

function comparePlanningProjects(left, right, sortBy) {
    if (sortBy === "priority") {
        const priorityDelta = planningPriorityRank(left.priority) - planningPriorityRank(right.priority)
        if (priorityDelta !== 0) {
            return priorityDelta
        }
    } else if (sortBy === "date") {
        const leftDate = Date.parse(left.lastUpdated || "")
        const rightDate = Date.parse(right.lastUpdated || "")
        return rightDate - leftDate
    } else if (sortBy === "name") {
        return String(left.title || "").localeCompare(String(right.title || ""))
    }

    return Number(left.order || 0) - Number(right.order || 0)
}

function filteredPlanningProjects(projects, tasks, viewFilter, sortBy, query) {
    const items = []
    const planningProjects = projects || []

    for (let index = 0; index < planningProjects.length; index += 1) {
        const project = planningProjects[index]
        if (viewFilter !== "all" && project.status !== viewFilter) {
            continue
        }

        if (!planningProjectMatchesSearch(project, query, tasksForProject(tasks, project.id))) {
            continue
        }

        items.push(project)
    }

    items.sort(function(left, right) {
        return comparePlanningProjects(left, right, sortBy)
    })

    return items
}

function filteredPlanningProjectsForStatus(projects, tasks, viewFilter, sortBy, query, status) {
    return filteredPlanningProjects(projects, tasks, viewFilter, sortBy, query).filter(function(project) {
        return project.status === status
    })
}

function planningResultCount(projects, tasks, viewFilter, sortBy, query) {
    return filteredPlanningProjects(projects, tasks, viewFilter, sortBy, query).length
}

function controlSurfacePageById(pages, pageId) {
    const controlSurfacePages = pages || []
    for (let index = 0; index < controlSurfacePages.length; index += 1) {
        const page = controlSurfacePages[index]
        if (page.id === pageId) {
            return page
        }
    }

    return null
}

function controlSurfacePageControls(page) {
    const controls = []
    if (!page) {
        return controls
    }

    const buttons = page.buttons || []
    const dials = page.dials || []

    for (let buttonIndex = 0; buttonIndex < buttons.length; buttonIndex += 1) {
        controls.push(buttons[buttonIndex])
    }

    for (let dialIndex = 0; dialIndex < dials.length; dialIndex += 1) {
        controls.push(dials[dialIndex])
    }

    return controls
}

function controlSurfaceControlById(pages, pageId, controlId) {
    const page = controlSurfacePageById(pages, pageId)
    const controls = controlSurfacePageControls(page)
    for (let index = 0; index < controls.length; index += 1) {
        if (controls[index].id === controlId) {
            return controls[index]
        }
    }

    return null
}
