use crate::planning_settings::{
    is_valid_dashboard_view, is_valid_deck_mode, is_valid_sort_by, is_valid_view_filter,
    DASHBOARD_VIEW_KEY, DECK_MODE_KEY, DEFAULT_DASHBOARD_VIEW, DEFAULT_DECK_MODE, DEFAULT_SORT_BY,
    DEFAULT_VIEW_FILTER, PLANNING_SETTINGS_PREFIX, SELECTED_PROJECT_ID_KEY, SELECTED_TASK_ID_KEY,
    SORT_BY_KEY, VIEW_FILTER_KEY,
};
use crate::storage::{apply_settings, list_settings_by_prefix, open_connection, EngineResult};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fmt;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct PlanningSnapshot {
    pub projects: Vec<PlanningProject>,
    pub tasks: Vec<PlanningTask>,
    #[serde(rename = "activityLog")]
    pub activity_log: Vec<PlanningActivityEntry>,
    pub settings: PlanningSettingsSnapshot,
    pub counts: PlanningCounts,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningProject {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: String,
    pub order: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningChecklistItem {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub order: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningTask {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub priority: String,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub labels: Vec<String>,
    pub checklist: Vec<PlanningChecklistItem>,
    #[serde(rename = "isRunning")]
    pub is_running: bool,
    #[serde(rename = "totalSeconds")]
    pub total_seconds: i64,
    #[serde(rename = "lastStarted")]
    pub last_started: Option<String>,
    pub completed: bool,
    pub order: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningActivityEntry {
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    #[serde(rename = "entityId")]
    pub entity_id: String,
    pub action: String,
    pub detail: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningSettingsSnapshot {
    #[serde(rename = "settingsPrefix")]
    pub settings_prefix: &'static str,
    #[serde(rename = "viewFilter")]
    pub view_filter: String,
    #[serde(rename = "sortBy")]
    pub sort_by: String,
    #[serde(rename = "dashboardView")]
    pub dashboard_view: String,
    #[serde(rename = "deckMode")]
    pub deck_mode: String,
    #[serde(rename = "selectedProjectId")]
    pub selected_project_id: Option<String>,
    #[serde(rename = "selectedTaskId")]
    pub selected_task_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningCounts {
    #[serde(rename = "projectCount")]
    pub project_count: usize,
    #[serde(rename = "taskCount")]
    pub task_count: usize,
    #[serde(rename = "runningTaskCount")]
    pub running_task_count: usize,
    #[serde(rename = "completedTaskCount")]
    pub completed_task_count: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningContextSnapshot {
    #[serde(rename = "selectedProject")]
    pub selected_project: Option<PlanningProjectContext>,
    #[serde(rename = "projectIndex")]
    pub project_index: i64,
    #[serde(rename = "projectCount")]
    pub project_count: usize,
    pub settings: PlanningSettingsSnapshot,
    #[serde(rename = "selectedTaskId")]
    pub selected_task_id: Option<String>,
    #[serde(rename = "selectedTask")]
    pub selected_task: Option<PlanningTaskContext>,
    #[serde(rename = "taskIndex")]
    pub task_index: i64,
    pub tasks: Vec<PlanningTaskContext>,
    #[serde(rename = "taskCount")]
    pub task_count: usize,
    #[serde(rename = "runningTask")]
    pub running_task: Option<PlanningRunningTaskContext>,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningProjectContext {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningTaskContext {
    pub id: String,
    pub title: String,
    #[serde(rename = "isRunning")]
    pub is_running: bool,
    pub completed: bool,
    #[serde(rename = "totalSeconds")]
    pub total_seconds: i64,
    pub priority: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningRunningTaskContext {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub title: String,
    #[serde(rename = "totalSeconds")]
    pub total_seconds: i64,
    #[serde(rename = "lastStarted")]
    pub last_started: Option<String>,
}

#[derive(Debug)]
pub enum PlanningCommandError {
    InvalidParams(String),
    Storage(String),
}

impl fmt::Display for PlanningCommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidParams(message) | Self::Storage(message) => f.write_str(message),
        }
    }
}

impl std::error::Error for PlanningCommandError {}

#[derive(Debug)]
pub struct PlanningSettingsUpdateRequest {
    view_filter: Option<String>,
    sort_by: Option<String>,
    dashboard_view: Option<String>,
    deck_mode: Option<String>,
    selected_project_id: Option<Option<String>>,
    selected_task_id: Option<Option<String>>,
}

#[derive(Debug, Clone, Copy)]
enum SelectionDirection {
    Next,
    Prev,
}

#[derive(Debug)]
enum PlanningSelectionMode {
    ProjectId(String),
    ProjectDirection(SelectionDirection),
    TaskId(String),
    TaskDirection(SelectionDirection),
}

#[derive(Debug)]
pub struct PlanningSelectionRequest {
    mode: PlanningSelectionMode,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningTaskTimerResult {
    #[serde(rename = "resolvedAction")]
    pub resolved_action: String,
    pub task: PlanningTask,
    pub context: PlanningContextSnapshot,
}

#[derive(Debug, Serialize, Clone)]
pub struct PlanningTaskToggleCompleteResult {
    pub task: PlanningTask,
    pub context: PlanningContextSnapshot,
}

#[derive(Debug, Clone, Copy)]
enum TimerAction {
    Start,
    Stop,
    Toggle,
}

#[derive(Debug)]
pub struct PlanningTaskTimerRequest {
    task_id: String,
    action: TimerAction,
}

#[derive(Debug)]
pub struct PlanningTaskToggleCompleteRequest {
    task_id: String,
}

#[derive(Debug)]
struct PlanningTaskRow {
    id: String,
    project_id: String,
    title: String,
    description: String,
    priority: String,
    due_date: Option<String>,
    labels: Vec<String>,
    is_running: bool,
    total_seconds: i64,
    last_started: Option<String>,
    completed: bool,
    order: i64,
    created_at: String,
}

impl PlanningSettingsSnapshot {
    pub fn from_settings(settings: &HashMap<String, String>) -> Self {
        Self {
            settings_prefix: PLANNING_SETTINGS_PREFIX,
            view_filter: settings
                .get(VIEW_FILTER_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_VIEW_FILTER)),
            sort_by: settings
                .get(SORT_BY_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_SORT_BY)),
            dashboard_view: settings
                .get(DASHBOARD_VIEW_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_DASHBOARD_VIEW)),
            deck_mode: settings
                .get(DECK_MODE_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_DECK_MODE)),
            selected_project_id: settings.get(SELECTED_PROJECT_ID_KEY).cloned(),
            selected_task_id: settings.get(SELECTED_TASK_ID_KEY).cloned(),
        }
    }
}

pub fn planning_data_present(db_path: &Path) -> EngineResult<bool> {
    let connection = open_connection(db_path)?;
    let count: i64 = connection.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?;
    Ok(count > 0)
}

pub fn read_planning_snapshot(
    db_path: &Path,
    planning_settings: &HashMap<String, String>,
) -> EngineResult<PlanningSnapshot> {
    let connection = open_connection(db_path)?;
    let projects = read_projects(&connection)?;
    let checklist_by_task = read_checklist_items_by_task(&connection)?;
    let task_rows = read_tasks(&connection)?;
    let activity_log = read_activity_log(&connection)?;

    let tasks = task_rows
        .into_iter()
        .map(|task| PlanningTask {
            checklist: checklist_by_task.get(&task.id).cloned().unwrap_or_default(),
            id: task.id,
            project_id: task.project_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            due_date: task.due_date,
            labels: task.labels,
            is_running: task.is_running,
            total_seconds: task.total_seconds,
            last_started: task.last_started,
            completed: task.completed,
            order: task.order,
            created_at: task.created_at,
        })
        .collect::<Vec<_>>();

    let running_task_count = tasks.iter().filter(|task| task.is_running).count();
    let completed_task_count = tasks.iter().filter(|task| task.completed).count();

    Ok(PlanningSnapshot {
        counts: PlanningCounts {
            project_count: projects.len(),
            task_count: tasks.len(),
            running_task_count,
            completed_task_count,
        },
        settings: PlanningSettingsSnapshot::from_settings(planning_settings),
        projects,
        tasks,
        activity_log,
    })
}

pub fn read_planning_context(
    db_path: &Path,
    planning_settings: &HashMap<String, String>,
) -> EngineResult<PlanningContextSnapshot> {
    Ok(build_planning_context(read_planning_snapshot(
        db_path,
        planning_settings,
    )?))
}

pub fn parse_planning_settings_update(
    params: &Value,
) -> Result<PlanningSettingsUpdateRequest, String> {
    let mut request = PlanningSettingsUpdateRequest {
        view_filter: None,
        sort_by: None,
        dashboard_view: None,
        deck_mode: None,
        selected_project_id: None,
        selected_task_id: None,
    };

    if let Some(value) = params.get("viewFilter") {
        let filter = value
            .as_str()
            .ok_or_else(|| String::from("viewFilter must be a string"))?;
        if !is_valid_view_filter(filter) {
            return Err(String::from(
                "viewFilter must be one of: all, todo, in-progress, blocked, done",
            ));
        }
        request.view_filter = Some(filter.to_string());
    }

    if let Some(value) = params.get("sortBy") {
        let sort_by = value
            .as_str()
            .ok_or_else(|| String::from("sortBy must be a string"))?;
        if !is_valid_sort_by(sort_by) {
            return Err(String::from(
                "sortBy must be one of: manual, priority, date, name",
            ));
        }
        request.sort_by = Some(sort_by.to_string());
    }

    if let Some(value) = params.get("dashboardView") {
        let dashboard_view = value
            .as_str()
            .ok_or_else(|| String::from("dashboardView must be a string"))?;
        if !is_valid_dashboard_view(dashboard_view) {
            return Err(String::from(
                "dashboardView must be one of: kanban, lighting, audio",
            ));
        }
        request.dashboard_view = Some(dashboard_view.to_string());
    }

    if let Some(value) = params.get("deckMode") {
        let deck_mode = value
            .as_str()
            .ok_or_else(|| String::from("deckMode must be a string"))?;
        if !is_valid_deck_mode(deck_mode) {
            return Err(String::from(
                "deckMode must be one of: project, light, audio",
            ));
        }
        request.deck_mode = Some(deck_mode.to_string());
    }

    if let Some(value) = params.get("selectedProjectId") {
        request.selected_project_id = Some(parse_nullable_string(value, "selectedProjectId")?);
    }

    if let Some(value) = params.get("selectedTaskId") {
        request.selected_task_id = Some(parse_nullable_string(value, "selectedTaskId")?);
    }

    if request.view_filter.is_none()
        && request.sort_by.is_none()
        && request.dashboard_view.is_none()
        && request.deck_mode.is_none()
        && request.selected_project_id.is_none()
        && request.selected_task_id.is_none()
    {
        return Err(String::from(
            "planning.settings.update requires one or more supported fields",
        ));
    }

    Ok(request)
}

pub fn update_planning_settings(
    db_path: &Path,
    request: &PlanningSettingsUpdateRequest,
) -> Result<PlanningContextSnapshot, PlanningCommandError> {
    let current_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let current_snapshot = PlanningSettingsSnapshot::from_settings(&current_settings);

    let mut updates = Vec::new();
    let mut delete_keys = Vec::new();

    if let Some(view_filter) = &request.view_filter {
        updates.push((VIEW_FILTER_KEY, view_filter.clone()));
    }
    if let Some(sort_by) = &request.sort_by {
        updates.push((SORT_BY_KEY, sort_by.clone()));
    }
    if let Some(dashboard_view) = &request.dashboard_view {
        updates.push((DASHBOARD_VIEW_KEY, dashboard_view.clone()));
    }
    if let Some(deck_mode) = &request.deck_mode {
        updates.push((DECK_MODE_KEY, deck_mode.clone()));
    }

    if request.selected_project_id.is_some() || request.selected_task_id.is_some() {
        let selection = resolve_updated_selection(db_path, &current_snapshot, request)?;
        match selection.project_id {
            Some(project_id) => updates.push((SELECTED_PROJECT_ID_KEY, project_id)),
            None => delete_keys.push(SELECTED_PROJECT_ID_KEY),
        }
        match selection.task_id {
            Some(task_id) => updates.push((SELECTED_TASK_ID_KEY, task_id)),
            None => delete_keys.push(SELECTED_TASK_ID_KEY),
        }
    }

    apply_settings(db_path, &updates, &delete_keys)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    let next_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    read_planning_context(db_path, &next_settings)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

pub fn parse_planning_selection_request(
    params: &Value,
) -> Result<PlanningSelectionRequest, String> {
    let project_id = params
        .get("projectId")
        .map(|value| {
            value
                .as_str()
                .ok_or_else(|| String::from("projectId must be a string"))
                .map(|value| value.to_string())
        })
        .transpose()?;
    let task_id = params
        .get("taskId")
        .map(|value| {
            value
                .as_str()
                .ok_or_else(|| String::from("taskId must be a string"))
                .map(|value| value.to_string())
        })
        .transpose()?;
    let project_direction = params
        .get("projectDirection")
        .map(|value| parse_selection_direction(value, "projectDirection"))
        .transpose()?;
    let task_direction = params
        .get("taskDirection")
        .map(|value| parse_selection_direction(value, "taskDirection"))
        .transpose()?;

    let selection_mode = [
        project_id.is_some(),
        task_id.is_some(),
        project_direction.is_some(),
        task_direction.is_some(),
    ]
    .into_iter()
    .filter(|value| *value)
    .count();

    if selection_mode != 1 {
        return Err(String::from(
            "planning.select requires exactly one of: projectId, taskId, projectDirection, taskDirection",
        ));
    }

    let mode = if let Some(project_id) = project_id {
        PlanningSelectionMode::ProjectId(project_id)
    } else if let Some(task_id) = task_id {
        PlanningSelectionMode::TaskId(task_id)
    } else if let Some(direction) = project_direction {
        PlanningSelectionMode::ProjectDirection(direction)
    } else {
        PlanningSelectionMode::TaskDirection(
            task_direction.expect("taskDirection should be present"),
        )
    };

    Ok(PlanningSelectionRequest { mode })
}

pub fn apply_planning_selection(
    db_path: &Path,
    request: &PlanningSelectionRequest,
) -> Result<PlanningContextSnapshot, PlanningCommandError> {
    let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let current_snapshot = PlanningSettingsSnapshot::from_settings(&planning_settings);

    let selection = match &request.mode {
        PlanningSelectionMode::ProjectId(project_id) => SelectionState {
            project_id: Some(assert_project_exists(db_path, project_id)?),
            task_id: first_task_id_for_project(db_path, project_id)?,
        },
        PlanningSelectionMode::TaskId(task_id) => {
            let project_id = project_id_for_task(db_path, task_id)?;
            SelectionState {
                project_id: Some(project_id),
                task_id: Some(task_id.clone()),
            }
        }
        PlanningSelectionMode::ProjectDirection(direction) => {
            let ordered_project_ids = ordered_project_ids(db_path)?;
            if ordered_project_ids.is_empty() {
                return read_planning_context(db_path, &planning_settings)
                    .map_err(|error| PlanningCommandError::Storage(error.to_string()));
            }

            let next_project_id = cycle_string(
                &ordered_project_ids,
                current_snapshot.selected_project_id.as_deref(),
                *direction,
            )
            .expect("project cycle should resolve a value");

            SelectionState {
                project_id: Some(next_project_id.clone()),
                task_id: first_task_id_for_project(db_path, &next_project_id)?,
            }
        }
        PlanningSelectionMode::TaskDirection(direction) => {
            let Some(selected_project_id) = current_snapshot.selected_project_id.clone() else {
                return read_planning_context(db_path, &planning_settings)
                    .map_err(|error| PlanningCommandError::Storage(error.to_string()));
            };

            let ordered_task_ids = ordered_task_ids_for_project(db_path, &selected_project_id)?;
            if ordered_task_ids.is_empty() {
                SelectionState {
                    project_id: Some(selected_project_id),
                    task_id: None,
                }
            } else {
                SelectionState {
                    project_id: Some(selected_project_id),
                    task_id: cycle_string(
                        &ordered_task_ids,
                        current_snapshot.selected_task_id.as_deref(),
                        *direction,
                    ),
                }
            }
        }
    };

    let mut updates = Vec::new();
    let mut delete_keys = Vec::new();

    match selection.project_id {
        Some(project_id) => updates.push((SELECTED_PROJECT_ID_KEY, project_id)),
        None => delete_keys.push(SELECTED_PROJECT_ID_KEY),
    }
    match selection.task_id {
        Some(task_id) => updates.push((SELECTED_TASK_ID_KEY, task_id)),
        None => delete_keys.push(SELECTED_TASK_ID_KEY),
    }

    apply_settings(db_path, &updates, &delete_keys)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    let next_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    read_planning_context(db_path, &next_settings)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

pub fn parse_planning_task_timer_request(
    params: &Value,
) -> Result<PlanningTaskTimerRequest, String> {
    let task_id = params
        .get("taskId")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("taskId is required and must be a string"))?
        .to_string();
    let action = params
        .get("action")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("action is required and must be a string"))?;

    let action = match action {
        "start" => TimerAction::Start,
        "stop" => TimerAction::Stop,
        "toggle" => TimerAction::Toggle,
        _ => {
            return Err(String::from("action must be one of: start, stop, toggle"));
        }
    };

    Ok(PlanningTaskTimerRequest { task_id, action })
}

pub fn parse_planning_task_toggle_complete_request(
    params: &Value,
) -> Result<PlanningTaskToggleCompleteRequest, String> {
    let task_id = params
        .get("taskId")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("taskId is required and must be a string"))?
        .to_string();

    Ok(PlanningTaskToggleCompleteRequest { task_id })
}

pub fn apply_planning_task_timer(
    db_path: &Path,
    request: &PlanningTaskTimerRequest,
) -> Result<PlanningTaskTimerResult, PlanningCommandError> {
    let mut connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let transaction = connection
        .transaction()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let task = load_task_row(&transaction, &request.task_id)?;
    let resolved_action = resolve_timer_action(request.action, task.is_running);
    let now = current_timestamp(&transaction)?;

    match resolved_action {
        TimerAction::Start => {
            transaction
                .execute(
                    "UPDATE tasks
                     SET is_running = 1, last_started = ?2
                     WHERE id = ?1",
                    rusqlite::params![request.task_id, now],
                )
                .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
        }
        TimerAction::Stop => {
            let elapsed = task
                .last_started
                .as_deref()
                .map(|last_started| elapsed_seconds_between(&transaction, last_started, &now))
                .transpose()?
                .unwrap_or(0);
            transaction
                .execute(
                    "UPDATE tasks
                     SET is_running = 0,
                         total_seconds = ?2,
                         last_started = NULL
                     WHERE id = ?1",
                    rusqlite::params![request.task_id, task.total_seconds.saturating_add(elapsed)],
                )
                .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
        }
        TimerAction::Toggle => unreachable!("toggle should resolve to start/stop"),
    }

    let action_name = if matches!(resolved_action, TimerAction::Start) {
        "timer_started"
    } else {
        "timer_stopped"
    };
    let detail = if matches!(resolved_action, TimerAction::Start) {
        format!("Timer started on \"{}\"", task.title)
    } else {
        format!("Timer stopped on \"{}\"", task.title)
    };
    append_activity_entry(
        &transaction,
        "task",
        &request.task_id,
        action_name,
        &detail,
        &now,
    )?;
    prune_activity_log(&transaction)?;

    transaction
        .commit()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    let (updated_task, context) = read_task_and_context(db_path, &request.task_id)?;
    Ok(PlanningTaskTimerResult {
        resolved_action: if matches!(resolved_action, TimerAction::Start) {
            String::from("start")
        } else {
            String::from("stop")
        },
        task: updated_task,
        context,
    })
}

pub fn apply_planning_task_toggle_complete(
    db_path: &Path,
    request: &PlanningTaskToggleCompleteRequest,
) -> Result<PlanningTaskToggleCompleteResult, PlanningCommandError> {
    let mut connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let transaction = connection
        .transaction()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let task = load_task_row(&transaction, &request.task_id)?;
    let new_completed = !task.completed;
    let now = current_timestamp(&transaction)?;

    transaction
        .execute(
            "UPDATE tasks SET completed = ?2 WHERE id = ?1",
            rusqlite::params![request.task_id, if new_completed { 1 } else { 0 }],
        )
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    let action_name = if new_completed {
        "completed"
    } else {
        "uncompleted"
    };
    let detail = format!(
        "Task \"{}\" marked as {}",
        task.title,
        if new_completed {
            "completed"
        } else {
            "incomplete"
        }
    );
    append_activity_entry(
        &transaction,
        "task",
        &request.task_id,
        action_name,
        &detail,
        &now,
    )?;
    prune_activity_log(&transaction)?;

    transaction
        .commit()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    let (updated_task, context) = read_task_and_context(db_path, &request.task_id)?;
    Ok(PlanningTaskToggleCompleteResult {
        task: updated_task,
        context,
    })
}

fn read_task_and_context(
    db_path: &Path,
    task_id: &str,
) -> Result<(PlanningTask, PlanningContextSnapshot), PlanningCommandError> {
    let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let snapshot = read_planning_snapshot(db_path, &planning_settings)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let task = snapshot
        .tasks
        .iter()
        .find(|task| task.id == task_id)
        .cloned()
        .ok_or_else(|| PlanningCommandError::InvalidParams(format!("Unknown taskId: {task_id}")))?;
    let context = build_planning_context(snapshot);
    Ok((task, context))
}

fn load_task_row(
    connection: &rusqlite::Connection,
    task_id: &str,
) -> Result<PlanningTaskRow, PlanningCommandError> {
    connection
        .query_row(
            "SELECT
                id,
                project_id,
                title,
                description,
                priority,
                due_date,
                labels_json,
                is_running,
                total_seconds,
                last_started,
                completed,
                sort_order,
                created_at
             FROM tasks
             WHERE id = ?1",
            [task_id],
            |row| {
                let labels_json: String = row.get(6)?;
                let labels = serde_json::from_str::<Vec<String>>(&labels_json).unwrap_or_default();
                Ok(PlanningTaskRow {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    due_date: row.get(5)?,
                    labels,
                    is_running: row.get::<_, i64>(7)? != 0,
                    total_seconds: row.get(8)?,
                    last_started: row.get(9)?,
                    completed: row.get::<_, i64>(10)? != 0,
                    order: row.get(11)?,
                    created_at: row.get(12)?,
                })
            },
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => {
                PlanningCommandError::InvalidParams(format!("Unknown taskId: {task_id}"))
            }
            _ => PlanningCommandError::Storage(error.to_string()),
        })
}

fn resolve_timer_action(action: TimerAction, is_running: bool) -> TimerAction {
    match action {
        TimerAction::Toggle => {
            if is_running {
                TimerAction::Stop
            } else {
                TimerAction::Start
            }
        }
        value => value,
    }
}

fn current_timestamp(connection: &rusqlite::Connection) -> Result<String, PlanningCommandError> {
    connection
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", [], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

fn elapsed_seconds_between(
    connection: &rusqlite::Connection,
    last_started: &str,
    stopped_at: &str,
) -> Result<i64, PlanningCommandError> {
    connection
        .query_row(
            "SELECT CAST((julianday(?2) - julianday(?1)) * 86400 AS INTEGER)",
            rusqlite::params![last_started, stopped_at],
            |row| row.get::<_, Option<i64>>(0),
        )
        .map(|value| value.unwrap_or(0).max(0))
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

fn append_activity_entry(
    transaction: &rusqlite::Transaction<'_>,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    detail: &str,
    timestamp: &str,
) -> Result<(), PlanningCommandError> {
    transaction
        .execute(
            "INSERT INTO activity_log(id, timestamp, entity_type, entity_id, action, detail)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                generate_entry_id("act"),
                timestamp,
                entity_type,
                entity_id,
                action,
                detail,
            ],
        )
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    Ok(())
}

fn prune_activity_log(transaction: &rusqlite::Transaction<'_>) -> Result<(), PlanningCommandError> {
    transaction
        .execute(
            "DELETE FROM activity_log
             WHERE id NOT IN (
               SELECT id
               FROM activity_log
               ORDER BY timestamp DESC
               LIMIT 500
             )",
            [],
        )
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    Ok(())
}

fn generate_entry_id(prefix: &str) -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static NEXT_ACTIVITY_ID: AtomicU64 = AtomicU64::new(1);

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let sequence = NEXT_ACTIVITY_ID.fetch_add(1, Ordering::Relaxed);
    format!("{prefix}-{nanos}-{sequence}")
}

fn build_planning_context(snapshot: PlanningSnapshot) -> PlanningContextSnapshot {
    let selected_project =
        snapshot
            .settings
            .selected_project_id
            .as_ref()
            .and_then(|selected_project_id| {
                snapshot
                    .projects
                    .iter()
                    .find(|project| &project.id == selected_project_id)
                    .map(|project| PlanningProjectContext {
                        id: project.id.clone(),
                        title: project.title.clone(),
                        status: project.status.clone(),
                        priority: project.priority.clone(),
                    })
            });

    let project_index = selected_project
        .as_ref()
        .and_then(|selected_project| {
            snapshot
                .projects
                .iter()
                .position(|project| project.id == selected_project.id)
        })
        .map(|index| index as i64)
        .unwrap_or(-1);

    let tasks = selected_project
        .as_ref()
        .map(|selected_project| {
            snapshot
                .tasks
                .iter()
                .filter(|task| task.project_id == selected_project.id)
                .map(|task| PlanningTaskContext {
                    id: task.id.clone(),
                    title: task.title.clone(),
                    is_running: task.is_running,
                    completed: task.completed,
                    total_seconds: task.total_seconds,
                    priority: task.priority.clone(),
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let selected_task = snapshot
        .settings
        .selected_task_id
        .as_ref()
        .and_then(|selected_task_id| {
            tasks
                .iter()
                .find(|task| &task.id == selected_task_id)
                .cloned()
        });

    let task_index = selected_task
        .as_ref()
        .and_then(|selected_task| tasks.iter().position(|task| task.id == selected_task.id))
        .map(|index| index as i64)
        .unwrap_or(-1);

    let running_task = snapshot
        .tasks
        .iter()
        .find(|task| task.is_running)
        .map(|task| PlanningRunningTaskContext {
            id: task.id.clone(),
            project_id: task.project_id.clone(),
            title: task.title.clone(),
            total_seconds: task.total_seconds,
            last_started: task.last_started.clone(),
        });

    PlanningContextSnapshot {
        selected_project,
        project_index,
        project_count: snapshot.projects.len(),
        selected_task_id: snapshot.settings.selected_task_id.clone(),
        settings: snapshot.settings,
        selected_task,
        task_index,
        task_count: tasks.len(),
        tasks,
        running_task,
    }
}

#[derive(Debug)]
struct SelectionState {
    project_id: Option<String>,
    task_id: Option<String>,
}

fn resolve_updated_selection(
    db_path: &Path,
    current_snapshot: &PlanningSettingsSnapshot,
    request: &PlanningSettingsUpdateRequest,
) -> Result<SelectionState, PlanningCommandError> {
    if let Some(Some(task_id)) = &request.selected_task_id {
        let task_project_id = project_id_for_task(db_path, task_id)?;
        if let Some(Some(project_id)) = &request.selected_project_id {
            if *project_id != task_project_id {
                return Err(PlanningCommandError::InvalidParams(String::from(
                    "selectedTaskId must belong to selectedProjectId",
                )));
            }
        }

        return Ok(SelectionState {
            project_id: Some(task_project_id),
            task_id: Some(task_id.clone()),
        });
    }

    if let Some(selected_project_id) = &request.selected_project_id {
        return match selected_project_id {
            Some(project_id) => {
                let valid_project_id = assert_project_exists(db_path, project_id)?;
                let task_id = match &request.selected_task_id {
                    Some(None) => None,
                    _ => first_task_id_for_project(db_path, &valid_project_id)?,
                };
                Ok(SelectionState {
                    project_id: Some(valid_project_id),
                    task_id,
                })
            }
            None => Ok(SelectionState {
                project_id: None,
                task_id: None,
            }),
        };
    }

    if let Some(selected_task_id) = &request.selected_task_id {
        return match selected_task_id {
            Some(task_id) => {
                let project_id = project_id_for_task(db_path, task_id)?;
                Ok(SelectionState {
                    project_id: Some(project_id),
                    task_id: Some(task_id.clone()),
                })
            }
            None => Ok(SelectionState {
                project_id: current_snapshot.selected_project_id.clone(),
                task_id: None,
            }),
        };
    }

    Ok(SelectionState {
        project_id: current_snapshot.selected_project_id.clone(),
        task_id: current_snapshot.selected_task_id.clone(),
    })
}

fn ordered_project_ids(db_path: &Path) -> Result<Vec<String>, PlanningCommandError> {
    let connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let mut statement = connection
        .prepare("SELECT id FROM projects ORDER BY sort_order ASC, created_at ASC")
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

fn ordered_task_ids_for_project(
    db_path: &Path,
    project_id: &str,
) -> Result<Vec<String>, PlanningCommandError> {
    let connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let mut statement = connection
        .prepare(
            "SELECT id
             FROM tasks
             WHERE project_id = ?1
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let rows = statement
        .query_map([project_id], |row| row.get::<_, String>(0))
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))
}

fn first_task_id_for_project(
    db_path: &Path,
    project_id: &str,
) -> Result<Option<String>, PlanningCommandError> {
    Ok(ordered_task_ids_for_project(db_path, project_id)?
        .into_iter()
        .next())
}

fn assert_project_exists(db_path: &Path, project_id: &str) -> Result<String, PlanningCommandError> {
    let connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let exists = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)",
            [project_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;

    if exists == 0 {
        return Err(PlanningCommandError::InvalidParams(format!(
            "Unknown projectId: {project_id}"
        )));
    }

    Ok(project_id.to_string())
}

fn project_id_for_task(db_path: &Path, task_id: &str) -> Result<String, PlanningCommandError> {
    let connection = open_connection(db_path)
        .map_err(|error| PlanningCommandError::Storage(error.to_string()))?;
    let project_id = connection
        .query_row(
            "SELECT project_id FROM tasks WHERE id = ?1",
            [task_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => {
                PlanningCommandError::InvalidParams(format!("Unknown taskId: {task_id}"))
            }
            _ => PlanningCommandError::Storage(error.to_string()),
        })?;

    Ok(project_id)
}

fn parse_nullable_string(value: &Value, name: &str) -> Result<Option<String>, String> {
    if value.is_null() {
        return Ok(None);
    }

    value
        .as_str()
        .map(|value| Some(value.to_string()))
        .ok_or_else(|| format!("{name} must be a string or null"))
}

fn parse_selection_direction(value: &Value, name: &str) -> Result<SelectionDirection, String> {
    let value = value
        .as_str()
        .ok_or_else(|| format!("{name} must be a string"))?;

    match value {
        "next" => Ok(SelectionDirection::Next),
        "prev" => Ok(SelectionDirection::Prev),
        _ => Err(format!("{name} must be one of: next, prev")),
    }
}

fn cycle_string(
    values: &[String],
    current: Option<&str>,
    direction: SelectionDirection,
) -> Option<String> {
    if values.is_empty() {
        return None;
    }

    let next_index = match values
        .iter()
        .position(|value| Some(value.as_str()) == current)
    {
        Some(index) => match direction {
            SelectionDirection::Next => (index + 1) % values.len(),
            SelectionDirection::Prev => (index + values.len() - 1) % values.len(),
        },
        None => 0,
    };

    values.get(next_index).cloned()
}

fn read_projects(connection: &rusqlite::Connection) -> EngineResult<Vec<PlanningProject>> {
    let mut statement = connection.prepare(
        "SELECT id, title, description, status, priority, created_at, last_updated, sort_order
         FROM projects
         ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(PlanningProject {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            created_at: row.get(5)?,
            last_updated: row.get(6)?,
            order: row.get(7)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn read_checklist_items_by_task(
    connection: &rusqlite::Connection,
) -> EngineResult<HashMap<String, Vec<PlanningChecklistItem>>> {
    let mut statement = connection.prepare(
        "SELECT id, task_id, text, done, sort_order
         FROM task_checklist_items
         ORDER BY task_id ASC, sort_order ASC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(1)?,
            PlanningChecklistItem {
                id: row.get(0)?,
                text: row.get(2)?,
                done: row.get::<_, i64>(3)? != 0,
                order: row.get(4)?,
            },
        ))
    })?;

    let mut checklist_by_task = HashMap::new();
    for row in rows {
        let (task_id, item) = row?;
        checklist_by_task
            .entry(task_id)
            .or_insert_with(Vec::new)
            .push(item);
    }

    Ok(checklist_by_task)
}

fn read_tasks(connection: &rusqlite::Connection) -> EngineResult<Vec<PlanningTaskRow>> {
    let mut statement = connection.prepare(
        "SELECT
            t.id,
            t.project_id,
            t.title,
            t.description,
            t.priority,
            t.due_date,
            t.labels_json,
            t.is_running,
            t.total_seconds,
            t.last_started,
            t.completed,
            t.sort_order,
            t.created_at
         FROM tasks t
         INNER JOIN projects p ON p.id = t.project_id
         ORDER BY p.sort_order ASC, t.sort_order ASC, t.created_at ASC",
    )?;
    let rows = statement.query_map([], |row| {
        let labels_json: String = row.get(6)?;
        let labels = serde_json::from_str::<Vec<String>>(&labels_json).unwrap_or_default();

        Ok(PlanningTaskRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            priority: row.get(4)?,
            due_date: row.get(5)?,
            labels,
            is_running: row.get::<_, i64>(7)? != 0,
            total_seconds: row.get(8)?,
            last_started: row.get(9)?,
            completed: row.get::<_, i64>(10)? != 0,
            order: row.get(11)?,
            created_at: row.get(12)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn read_activity_log(
    connection: &rusqlite::Connection,
) -> EngineResult<Vec<PlanningActivityEntry>> {
    let mut statement = connection.prepare(
        "SELECT id, timestamp, entity_type, entity_id, action, detail
         FROM activity_log
         ORDER BY timestamp DESC
         LIMIT 50",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(PlanningActivityEntry {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            entity_type: row.get(2)?,
            entity_id: row.get(3)?,
            action: row.get(4)?,
            detail: row.get(5)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::legacy_import::LegacyImportRequest;
    use crate::storage::{import_legacy_db, initialize_database, list_settings_by_prefix};
    use serde_json::json;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::process;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(label: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_nanos())
                .unwrap_or(0);
            let path = std::env::temp_dir().join(format!(
                "studio-control-engine-{label}-{}-{unique}",
                process::id()
            ));
            fs::create_dir_all(&path).expect("test dir should be created");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn seed_planning_state(db_path: &Path, source_path: &Path) {
        initialize_database(db_path).expect("database should initialize");

        fs::write(
            source_path,
            serde_json::to_vec_pretty(&json!({
                "projects": [
                    {
                        "id": "proj-1",
                        "title": "Website Redesign",
                        "description": "Marketing refresh",
                        "status": "in-progress",
                        "priority": "p1",
                        "createdAt": "2026-04-01T10:00:00.000Z",
                        "lastUpdated": "2026-04-10T10:00:00.000Z",
                        "order": 0
                    },
                    {
                        "id": "proj-2",
                        "title": "Studio Launch",
                        "description": "Commissioning prep",
                        "status": "todo",
                        "priority": "p2",
                        "createdAt": "2026-04-02T10:00:00.000Z",
                        "lastUpdated": "2026-04-09T10:00:00.000Z",
                        "order": 1
                    }
                ],
                "tasks": [
                    {
                        "id": "task-1",
                        "projectId": "proj-1",
                        "title": "Implement hero section",
                        "description": "",
                        "priority": "p1",
                        "dueDate": "2026-04-20",
                        "labels": ["frontend"],
                        "checklist": [
                            {"id": "check-1", "text": "Wire layout", "done": true}
                        ],
                        "isRunning": false,
                        "totalSeconds": 120,
                        "lastStarted": null,
                        "completed": false,
                        "order": 0,
                        "createdAt": "2026-04-11T10:00:00.000Z"
                    },
                    {
                        "id": "task-2",
                        "projectId": "proj-1",
                        "title": "Finalize copy",
                        "description": "",
                        "priority": "p2",
                        "dueDate": null,
                        "labels": ["content"],
                        "checklist": [],
                        "isRunning": false,
                        "totalSeconds": 30,
                        "lastStarted": null,
                        "completed": false,
                        "order": 1,
                        "createdAt": "2026-04-12T10:00:00.000Z"
                    },
                    {
                        "id": "task-3",
                        "projectId": "proj-2",
                        "title": "Cable patch list",
                        "description": "",
                        "priority": "p0",
                        "dueDate": null,
                        "labels": ["ops"],
                        "checklist": [],
                        "isRunning": true,
                        "totalSeconds": 60,
                        "lastStarted": "2026-04-15T00:00:00.000Z",
                        "completed": false,
                        "order": 0,
                        "createdAt": "2026-04-13T10:00:00.000Z"
                    }
                ],
                "activityLog": [
                    {
                        "id": "act-1",
                        "timestamp": "2026-04-12T10:00:00.000Z",
                        "entityType": "task",
                        "entityId": "task-1",
                        "action": "created",
                        "detail": "Task created"
                    },
                    {
                        "id": "act-2",
                        "timestamp": "2026-04-14T10:00:00.000Z",
                        "entityType": "project",
                        "entityId": "proj-2",
                        "action": "updated",
                        "detail": "Priority bumped"
                    }
                ],
                "settings": {
                    "viewFilter": "todo",
                    "sortBy": "priority",
                    "selectedProjectId": "proj-1",
                    "selectedTaskId": "task-2",
                    "dashboardView": "kanban",
                    "deckMode": "project",
                    "hasCompletedSetup": true
                }
            }))
            .expect("legacy payload should serialize"),
        )
        .expect("legacy db should be written");

        import_legacy_db(
            db_path,
            &LegacyImportRequest {
                source_path: source_path.to_path_buf(),
                force: false,
            },
        )
        .expect("legacy import should succeed");
    }

    #[test]
    fn read_planning_snapshot_returns_imported_planning_state() {
        let test_dir = TestDir::new("planning-snapshot");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let planning_settings = list_settings_by_prefix(&db_path, PLANNING_SETTINGS_PREFIX)
            .expect("planning settings should load");
        let snapshot =
            read_planning_snapshot(&db_path, &planning_settings).expect("snapshot should load");

        assert_eq!(snapshot.counts.project_count, 2);
        assert_eq!(snapshot.counts.task_count, 3);
        assert_eq!(snapshot.projects[0].title, "Website Redesign");
        assert_eq!(snapshot.tasks[0].labels, vec![String::from("frontend")]);
        assert_eq!(snapshot.tasks[0].checklist.len(), 1);
        assert_eq!(snapshot.activity_log[0].action, "updated");
        assert_eq!(snapshot.settings.view_filter, "todo");
        assert_eq!(snapshot.settings.dashboard_view, "kanban");
    }

    #[test]
    fn read_planning_context_returns_selected_project_task_and_running_summary() {
        let test_dir = TestDir::new("planning-context");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let planning_settings = list_settings_by_prefix(&db_path, PLANNING_SETTINGS_PREFIX)
            .expect("planning settings should load");
        let context =
            read_planning_context(&db_path, &planning_settings).expect("context should load");

        assert_eq!(context.project_count, 2);
        assert_eq!(context.project_index, 0);
        assert_eq!(context.task_count, 2);
        assert_eq!(context.task_index, 1);
        assert_eq!(
            context
                .selected_project
                .as_ref()
                .map(|project| project.title.as_str()),
            Some("Website Redesign")
        );
        assert_eq!(
            context
                .selected_task
                .as_ref()
                .map(|task| task.title.as_str()),
            Some("Finalize copy")
        );
        assert!(context.running_task.is_none());
        assert_eq!(context.settings.sort_by, "priority");
        assert_eq!(context.settings.view_filter, "todo");
    }

    #[test]
    fn update_planning_settings_persists_filter_sort_and_selection() {
        let test_dir = TestDir::new("planning-settings-update");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let params = json!({
            "viewFilter": "blocked",
            "sortBy": "name",
            "selectedProjectId": "proj-2"
        });
        let request =
            parse_planning_settings_update(&params).expect("settings update should parse");
        let context =
            update_planning_settings(&db_path, &request).expect("settings update should succeed");

        assert_eq!(context.settings.view_filter, "blocked");
        assert_eq!(context.settings.sort_by, "name");
        assert_eq!(
            context.settings.selected_project_id.as_deref(),
            Some("proj-2")
        );
        assert_eq!(context.settings.selected_task_id.as_deref(), Some("task-3"));
        assert_eq!(
            context
                .selected_project
                .as_ref()
                .map(|project| project.title.as_str()),
            Some("Studio Launch")
        );
        assert_eq!(
            context.selected_task.as_ref().map(|task| task.id.as_str()),
            Some("task-3")
        );
    }

    #[test]
    fn planning_select_supports_task_lookup_and_project_cycling() {
        let test_dir = TestDir::new("planning-select");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let select_task = parse_planning_selection_request(&json!({
            "taskId": "task-3"
        }))
        .expect("task selection should parse");
        let selected_context =
            apply_planning_selection(&db_path, &select_task).expect("task selection should work");

        assert_eq!(
            selected_context.settings.selected_project_id.as_deref(),
            Some("proj-2")
        );
        assert_eq!(
            selected_context.settings.selected_task_id.as_deref(),
            Some("task-3")
        );

        let cycle_project = parse_planning_selection_request(&json!({
            "projectDirection": "prev"
        }))
        .expect("project cycle should parse");
        let cycled_context = apply_planning_selection(&db_path, &cycle_project)
            .expect("project cycling should work");

        assert_eq!(
            cycled_context.settings.selected_project_id.as_deref(),
            Some("proj-1")
        );
        assert_eq!(
            cycled_context.settings.selected_task_id.as_deref(),
            Some("task-1")
        );
        assert_eq!(cycled_context.task_count, 2);
    }

    #[test]
    fn planning_task_timer_starts_and_stops_with_activity_entries() {
        let test_dir = TestDir::new("planning-task-timer");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let start_request = parse_planning_task_timer_request(&json!({
            "taskId": "task-1",
            "action": "start"
        }))
        .expect("timer request should parse");
        let started =
            apply_planning_task_timer(&db_path, &start_request).expect("timer should start");

        assert_eq!(started.resolved_action, "start");
        assert!(started.task.is_running);
        assert!(started.task.last_started.is_some());
        assert_eq!(
            started
                .context
                .running_task
                .as_ref()
                .map(|task| task.id.as_str()),
            Some("task-1")
        );

        let stop_request = parse_planning_task_timer_request(&json!({
            "taskId": "task-1",
            "action": "toggle"
        }))
        .expect("timer request should parse");
        let stopped =
            apply_planning_task_timer(&db_path, &stop_request).expect("timer should stop");

        assert_eq!(stopped.resolved_action, "stop");
        assert!(!stopped.task.is_running);
        assert!(stopped.task.last_started.is_none());
        assert!(stopped.task.total_seconds >= 120);

        let planning_settings = list_settings_by_prefix(&db_path, PLANNING_SETTINGS_PREFIX)
            .expect("planning settings should load");
        let snapshot =
            read_planning_snapshot(&db_path, &planning_settings).expect("snapshot should load");
        assert_eq!(snapshot.activity_log[0].action, "timer_stopped");
        assert_eq!(snapshot.activity_log[1].action, "timer_started");
    }

    #[test]
    fn planning_task_toggle_complete_flips_completion_and_logs_activity() {
        let test_dir = TestDir::new("planning-task-complete");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        seed_planning_state(&db_path, &source_path);

        let toggle_request = parse_planning_task_toggle_complete_request(&json!({
            "taskId": "task-2"
        }))
        .expect("toggle request should parse");
        let toggled = apply_planning_task_toggle_complete(&db_path, &toggle_request)
            .expect("task completion should toggle");

        assert!(toggled.task.completed);
        assert_eq!(toggled.task.id, "task-2");

        let planning_settings = list_settings_by_prefix(&db_path, PLANNING_SETTINGS_PREFIX)
            .expect("planning settings should load");
        let snapshot =
            read_planning_snapshot(&db_path, &planning_settings).expect("snapshot should load");
        let task = snapshot
            .tasks
            .iter()
            .find(|task| task.id == "task-2")
            .expect("task should exist");
        assert!(task.completed);
        assert_eq!(snapshot.activity_log[0].action, "completed");
    }
}
