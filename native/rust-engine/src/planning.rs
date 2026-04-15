use crate::planning_settings::{
    DASHBOARD_VIEW_KEY, DEFAULT_DASHBOARD_VIEW, DEFAULT_DECK_MODE, DEFAULT_SORT_BY,
    DEFAULT_VIEW_FILTER, DECK_MODE_KEY, PLANNING_SETTINGS_PREFIX, SELECTED_PROJECT_ID_KEY,
    SELECTED_TASK_ID_KEY, SORT_BY_KEY, VIEW_FILTER_KEY,
};
use crate::storage::{open_connection, EngineResult};
use serde::Serialize;
use std::collections::HashMap;
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

#[derive(Debug, Serialize)]
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

#[derive(Debug, Serialize)]
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

#[derive(Debug, Serialize)]
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

#[derive(Debug, Serialize)]
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

#[derive(Debug, Serialize)]
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
            checklist: checklist_by_task
                .get(&task.id)
                .cloned()
                .unwrap_or_default(),
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
        settings: PlanningSettingsSnapshot {
            settings_prefix: PLANNING_SETTINGS_PREFIX,
            view_filter: planning_settings
                .get(VIEW_FILTER_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_VIEW_FILTER)),
            sort_by: planning_settings
                .get(SORT_BY_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_SORT_BY)),
            dashboard_view: planning_settings
                .get(DASHBOARD_VIEW_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_DASHBOARD_VIEW)),
            deck_mode: planning_settings
                .get(DECK_MODE_KEY)
                .cloned()
                .unwrap_or_else(|| String::from(DEFAULT_DECK_MODE)),
            selected_project_id: planning_settings.get(SELECTED_PROJECT_ID_KEY).cloned(),
            selected_task_id: planning_settings.get(SELECTED_TASK_ID_KEY).cloned(),
        },
        projects,
        tasks,
        activity_log,
    })
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

    #[test]
    fn read_planning_snapshot_returns_imported_planning_state() {
        let test_dir = TestDir::new("planning-snapshot");
        let db_path = test_dir.path().join("native.sqlite3");
        let source_path = test_dir.path().join("legacy-db.json");
        initialize_database(&db_path).expect("database should initialize");

        fs::write(
            &source_path,
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
                    }
                ],
                "settings": {
                    "viewFilter": "in-progress",
                    "dashboardView": "lighting"
                }
            }))
            .expect("legacy payload should serialize"),
        )
        .expect("legacy db should be written");

        import_legacy_db(
            &db_path,
            &LegacyImportRequest {
                source_path,
                force: false,
            },
        )
        .expect("legacy import should succeed");

        let planning_settings = list_settings_by_prefix(&db_path, PLANNING_SETTINGS_PREFIX)
            .expect("planning settings should load");
        let snapshot =
            read_planning_snapshot(&db_path, &planning_settings).expect("snapshot should load");

        assert_eq!(snapshot.counts.project_count, 1);
        assert_eq!(snapshot.counts.task_count, 1);
        assert_eq!(snapshot.projects[0].title, "Website Redesign");
        assert_eq!(snapshot.tasks[0].labels, vec![String::from("frontend")]);
        assert_eq!(snapshot.tasks[0].checklist.len(), 1);
        assert_eq!(snapshot.activity_log[0].action, "created");
        assert_eq!(snapshot.settings.view_filter, "in-progress");
        assert_eq!(snapshot.settings.dashboard_view, "lighting");
    }
}
