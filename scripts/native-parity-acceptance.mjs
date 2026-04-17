import { assert } from "./native-runtime-harness.mjs";

export async function assertCoreParityContracts(harness, requestIdPrefix, runtimeLabel) {
  const planningTimeReport = await harness.request(`${requestIdPrefix}-planning-time-report`, "planning.report.time");
  assert(
    typeof planningTimeReport.totalSeconds === "number",
    `${runtimeLabel} planning.report.time is missing totalSeconds.`
  );
  assert(
    Array.isArray(planningTimeReport.byProject) && planningTimeReport.byProject.length > 0,
    `${runtimeLabel} planning.report.time must expose at least one project aggregate.`
  );
  assert(Array.isArray(planningTimeReport.byTask), `${runtimeLabel} planning.report.time is missing byTask.`);
  assert(Array.isArray(planningTimeReport.timerEvents), `${runtimeLabel} planning.report.time is missing timerEvents.`);

  const firstProject = planningTimeReport.byProject[0];
  assert(
    typeof firstProject.projectId === "string" &&
      typeof firstProject.title === "string" &&
      typeof firstProject.totalSeconds === "number" &&
      typeof firstProject.taskCount === "number",
    `${runtimeLabel} planning.report.time returned an invalid byProject entry.`
  );

  if (planningTimeReport.byTask.length > 0) {
    const firstTask = planningTimeReport.byTask[0];
    assert(
      typeof firstTask.taskId === "string" &&
        typeof firstTask.taskTitle === "string" &&
        typeof firstTask.projectId === "string" &&
        typeof firstTask.projectTitle === "string" &&
        typeof firstTask.totalSeconds === "number",
      `${runtimeLabel} planning.report.time returned an invalid byTask entry.`
    );
  }

  const controlSurfaceSnapshot = await harness.request(`${requestIdPrefix}-control-surface`, "controlSurface.snapshot");
  assert(
    Array.isArray(controlSurfaceSnapshot.pages) && controlSurfaceSnapshot.pages.length === 4,
    `${runtimeLabel} controlSurface.snapshot must expose the four legacy page groups.`
  );
  assert(
    controlSurfaceSnapshot.pages.some((page) => page.label === "PROJECTS") &&
      controlSurfaceSnapshot.pages.some((page) => page.label === "AUDIO"),
    `${runtimeLabel} controlSurface.snapshot is missing expected page labels.`
  );

  const projectsPage = controlSurfaceSnapshot.pages.find((page) => page.label === "PROJECTS");
  assert(
    projectsPage && Array.isArray(projectsPage.buttons) && Array.isArray(projectsPage.dials),
    `${runtimeLabel} controlSurface.snapshot returned an invalid PROJECTS page.`
  );
  assert(
    projectsPage.buttons.length > 0 && projectsPage.dials.length > 0,
    `${runtimeLabel} controlSurface.snapshot must expose PROJECTS buttons and dials.`
  );

  const lightingDmxMonitor = await harness.request(
    `${requestIdPrefix}-lighting-dmx-monitor`,
    "lighting.dmxMonitor.snapshot"
  );
  assert(
    Array.isArray(lightingDmxMonitor.channels),
    `${runtimeLabel} lighting.dmxMonitor.snapshot is missing channels.`
  );

  if (lightingDmxMonitor.channels.length > 0) {
    const firstChannel = lightingDmxMonitor.channels[0];
    assert(
      typeof firstChannel.channel === "number" &&
        typeof firstChannel.value === "number" &&
        typeof firstChannel.lightName === "string" &&
        typeof firstChannel.label === "string",
      `${runtimeLabel} lighting.dmxMonitor.snapshot returned an invalid channel entry.`
    );
  }
}

function projectById(snapshot, projectId) {
  return (snapshot.projects ?? []).find((project) => project.id === projectId) ?? null;
}

function taskById(snapshot, taskId) {
  return (snapshot.tasks ?? []).find((task) => task.id === taskId) ?? null;
}

function projectsForStatus(snapshot, status) {
  return (snapshot.projects ?? [])
    .filter((project) => project.status === status)
    .sort((left, right) => left.order - right.order);
}

export async function assertPlanningWorkflowParity(harness, requestIdPrefix, runtimeLabel) {
  const prioritySettings = await harness.request(`${requestIdPrefix}-planning-settings-priority`, "planning.settings.update", {
    viewFilter: "todo",
    sortBy: "priority",
  });
  assert(
    prioritySettings.settings?.viewFilter === "todo" && prioritySettings.settings?.sortBy === "priority",
    `${runtimeLabel} planning.settings.update did not persist the todo/priority board view.`
  );

  const manualSettings = await harness.request(`${requestIdPrefix}-planning-settings-manual`, "planning.settings.update", {
    viewFilter: "all",
    sortBy: "manual",
  });
  assert(
    manualSettings.settings?.viewFilter === "all" && manualSettings.settings?.sortBy === "manual",
    `${runtimeLabel} planning.settings.update did not restore the all/manual board view.`
  );

  const blockedProject = await harness.request(`${requestIdPrefix}-planning-project-reorder-blocked`, "planning.project.reorder", {
    projectId: "sample-proj-2",
    newStatus: "blocked",
    newIndex: 0,
  });
  assert(
    blockedProject.project?.status === "blocked" && blockedProject.project?.order === 0,
    `${runtimeLabel} planning.project.reorder did not move the sample todo project into the blocked lane.`
  );

  const todoProjectA = await harness.request(`${requestIdPrefix}-planning-project-a`, "planning.project.create", {
    title: "Parity Flow A",
    description: "First temporary project used to verify board ordering parity.",
    status: "todo",
    priority: "p2",
  });
  const todoProjectB = await harness.request(`${requestIdPrefix}-planning-project-b`, "planning.project.create", {
    title: "Parity Flow B",
    description: "Second temporary project used to verify board ordering parity.",
    status: "todo",
    priority: "p2",
  });

  const sameLaneReorder = await harness.request(`${requestIdPrefix}-planning-project-reorder-manual`, "planning.project.reorder", {
    projectId: todoProjectB.project.id,
    newStatus: "todo",
    newIndex: 0,
  });
  assert(
    sameLaneReorder.project?.id === todoProjectB.project.id && sameLaneReorder.project?.order === 0,
    `${runtimeLabel} planning.project.reorder did not move the temporary todo project to the top of its lane.`
  );

  const selectProject = await harness.request(`${requestIdPrefix}-planning-select-project`, "planning.settings.update", {
    selectedProjectId: todoProjectB.project.id,
  });
  assert(
    selectProject.settings?.selectedProjectId === todoProjectB.project.id,
    `${runtimeLabel} planning.settings.update did not select the temporary project for detail work.`
  );

  const taskOne = await harness.request(`${requestIdPrefix}-planning-task-one`, "planning.task.create", {
    projectId: todoProjectB.project.id,
    title: "Parity Task 1",
    description: "Initial task created through the native planning parity gate.",
    priority: "p1",
    dueDate: "2026-04-30",
    labels: ["planning", "native"],
  });
  const taskTwo = await harness.request(`${requestIdPrefix}-planning-task-two`, "planning.task.create", {
    projectId: todoProjectB.project.id,
    title: "Parity Task 2",
    description: "Secondary task used to verify manual task ordering.",
    priority: "p2",
    labels: ["board"],
  });

  assert(
    taskOne.context?.settings?.selectedTaskId === taskOne.task.id && taskTwo.context?.settings?.selectedTaskId === taskTwo.task.id,
    `${runtimeLabel} planning.task.create did not advance selection to the newly created task.`
  );

  const updatedTask = await harness.request(`${requestIdPrefix}-planning-task-update`, "planning.task.update", {
    taskId: taskOne.task.id,
    title: "Parity Task 1 Updated",
    description: "Updated through the native parity acceptance lane.",
    priority: "p0",
    dueDate: "2026-05-01",
    labels: ["planning", "native", "accepted"],
  });
  assert(
    updatedTask.task?.title === "Parity Task 1 Updated" &&
      updatedTask.task?.priority === "p0" &&
      updatedTask.task?.dueDate === "2026-05-01" &&
      Array.isArray(updatedTask.task?.labels) &&
      updatedTask.task.labels.includes("accepted"),
    `${runtimeLabel} planning.task.update did not persist the expected task edits.`
  );

  const reorderedTask = await harness.request(`${requestIdPrefix}-planning-task-reorder`, "planning.task.update", {
    taskId: taskTwo.task.id,
    order: 0,
  });
  assert(
    reorderedTask.task?.id === taskTwo.task.id && reorderedTask.task?.order === 0,
    `${runtimeLabel} planning.task.update did not move the secondary task to the top of the task list.`
  );

  const checklistAdded = await harness.request(
    `${requestIdPrefix}-planning-checklist-add`,
    "planning.task.checklist.add",
    {
      taskId: taskOne.task.id,
      text: "Verify task checklist parity",
    }
  );
  const checklistItem = checklistAdded.task?.checklist?.find((item) => item.text === "Verify task checklist parity");
  assert(checklistItem, `${runtimeLabel} planning.task.checklist.add did not append the new checklist item.`);

  const checklistUpdated = await harness.request(
    `${requestIdPrefix}-planning-checklist-update`,
    "planning.task.checklist.update",
    {
      taskId: taskOne.task.id,
      itemId: checklistItem.id,
      done: true,
    }
  );
  assert(
    checklistUpdated.task?.checklist?.some((item) => item.id === checklistItem.id && item.done),
    `${runtimeLabel} planning.task.checklist.update did not persist checklist completion.`
  );

  const checklistDeleted = await harness.request(
    `${requestIdPrefix}-planning-checklist-delete`,
    "planning.task.checklist.delete",
    {
      taskId: taskOne.task.id,
      itemId: checklistItem.id,
    }
  );
  assert(
    !checklistDeleted.task?.checklist?.some((item) => item.id === checklistItem.id),
    `${runtimeLabel} planning.task.checklist.delete did not remove the checklist item.`
  );

  const timerStarted = await harness.request(`${requestIdPrefix}-planning-task-timer-start`, "planning.task.timer", {
    taskId: taskOne.task.id,
    action: "toggle",
  });
  assert(
    timerStarted.resolvedAction === "start" && timerStarted.task?.isRunning,
    `${runtimeLabel} planning.task.timer did not start the selected task timer.`
  );

  const timerStopped = await harness.request(`${requestIdPrefix}-planning-task-timer-stop`, "planning.task.timer", {
    taskId: taskOne.task.id,
    action: "toggle",
  });
  assert(
    timerStopped.resolvedAction === "stop" && !timerStopped.task?.isRunning,
    `${runtimeLabel} planning.task.timer did not stop the selected task timer.`
  );

  const taskCompleted = await harness.request(
    `${requestIdPrefix}-planning-task-toggle-complete`,
    "planning.task.toggleComplete",
    {
      taskId: taskOne.task.id,
    }
  );
  assert(
    taskCompleted.task?.completed === true,
    `${runtimeLabel} planning.task.toggleComplete did not mark the selected task complete.`
  );

  const taskDeleted = await harness.request(`${requestIdPrefix}-planning-task-delete`, "planning.task.delete", {
    taskId: taskTwo.task.id,
  });
  assert(taskDeleted.deleted === true, `${runtimeLabel} planning.task.delete did not report a successful delete.`);

  const planningSnapshot = await harness.request(`${requestIdPrefix}-planning-snapshot-operator-flow`, "planning.snapshot");
  const blockedSnapshotProject = projectById(planningSnapshot, "sample-proj-2");
  const temporaryProject = projectById(planningSnapshot, todoProjectB.project.id);
  const updatedSnapshotTask = taskById(planningSnapshot, taskOne.task.id);
  const deletedSnapshotTask = taskById(planningSnapshot, taskTwo.task.id);
  const todoProjectIds = projectsForStatus(planningSnapshot, "todo").map((project) => project.id);

  assert(
    blockedSnapshotProject?.status === "blocked",
    `${runtimeLabel} planning snapshot did not retain the cross-lane project move.`
  );
  assert(
    temporaryProject && todoProjectIds[0] === todoProjectB.project.id && todoProjectIds.includes(todoProjectA.project.id),
    `${runtimeLabel} planning snapshot did not retain the temporary todo lane ordering.`
  );
  assert(
    updatedSnapshotTask?.title === "Parity Task 1 Updated" &&
      updatedSnapshotTask?.completed === true &&
      updatedSnapshotTask?.isRunning === false &&
      updatedSnapshotTask?.projectId === todoProjectB.project.id,
    `${runtimeLabel} planning snapshot did not retain the updated selected task state.`
  );
  assert(
    deletedSnapshotTask === null,
    `${runtimeLabel} planning snapshot still contains the deleted temporary task.`
  );
  assert(
    planningSnapshot.settings?.selectedProjectId === todoProjectB.project.id &&
      planningSnapshot.settings?.sortBy === "manual" &&
      planningSnapshot.settings?.viewFilter === "all",
    `${runtimeLabel} planning snapshot did not retain the expected board settings and selection.`
  );

  return {
    temporaryProjectIds: [todoProjectA.project.id, todoProjectB.project.id],
    temporaryTaskIds: [taskOne.task.id, taskTwo.task.id],
  };
}
