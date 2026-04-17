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
