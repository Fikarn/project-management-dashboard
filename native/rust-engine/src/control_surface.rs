use crate::audio::{parse_audio_snapshot_recall_request, read_audio_snapshot, recall_audio_snapshot};
use crate::app_state::APP_SETTINGS_PREFIX;
use crate::bootstrap::RuntimeContext;
use crate::diagnostics::append_log;
use crate::lighting::{
    parse_lighting_scene_recall_request, read_lighting_snapshot, recall_lighting_scene,
};
use crate::planning::{
    apply_planning_project_create, apply_planning_project_delete, apply_planning_project_reorder,
    apply_planning_project_update, apply_planning_selection,
    apply_planning_task_timer, apply_planning_task_toggle_complete,
    parse_planning_project_create_request, parse_planning_project_delete_request,
    parse_planning_project_reorder_request, parse_planning_project_update_request,
    parse_planning_selection_request, parse_planning_settings_update,
    parse_planning_task_timer_request, parse_planning_task_toggle_complete_request,
    read_planning_context, update_planning_settings, PlanningCommandError,
    PlanningContextSnapshot,
};
use crate::planning_settings::{
    PLANNING_SETTINGS_PREFIX, SORT_BY_KEY,
};
use crate::storage::{list_settings_by_prefix, open_connection, set_settings_owned};
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::thread;
use std::time::Duration;

pub const DEFAULT_CONTROL_SURFACE_HOST: &str = "127.0.0.1";
pub const DEFAULT_CONTROL_SURFACE_PORT: u16 = 38201;

const SELECTED_LIGHT_ID_KEY: &str = "app.control_surface.selected_light_id";
const SELECTED_SCENE_ID_KEY: &str = "app.control_surface.selected_scene_id";

const PROJECT_STATUS_CYCLE: &[&str] = &["todo", "in-progress", "blocked", "done"];
const PROJECT_PRIORITY_CYCLE: &[&str] = &["p0", "p1", "p2", "p3"];
const SORT_CYCLE: &[&str] = &["manual", "priority", "date", "name"];

#[derive(Debug, Clone, Serialize)]
pub struct ControlSurfaceBridgeInfo {
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub port: u16,
    pub available: bool,
    pub status: String,
    pub summary: String,
    pub error: Option<String>,
}

#[derive(Debug)]
pub enum ControlSurfaceError {
    InvalidParams(String),
    Unsupported(String),
    Rejected(String),
    Storage(String),
}

impl ControlSurfaceError {
    fn status_code(&self) -> u16 {
        match self {
            Self::InvalidParams(_) => 400,
            Self::Unsupported(_) => 501,
            Self::Rejected(_) => 409,
            Self::Storage(_) => 500,
        }
    }

    fn message(&self) -> &str {
        match self {
            Self::InvalidParams(message)
            | Self::Unsupported(message)
            | Self::Rejected(message)
            | Self::Storage(message) => message,
        }
    }
}

pub fn resolve_control_surface_port() -> u16 {
    std::env::var("SSE_CONTROL_SURFACE_PORT")
        .ok()
        .and_then(|value| value.trim().parse::<u16>().ok())
        .unwrap_or(DEFAULT_CONTROL_SURFACE_PORT)
}

pub fn start_control_surface_bridge(
    db_path: &Path,
    log_file_path: &Path,
    requested_port: u16,
) -> ControlSurfaceBridgeInfo {
    match bind_control_surface_listener(requested_port) {
        Ok(listener) => {
            let port = listener
                .local_addr()
                .map(|address| address.port())
                .unwrap_or(requested_port);
            let base_url = format!("http://{DEFAULT_CONTROL_SURFACE_HOST}:{port}");
            let db_path = db_path.to_path_buf();
            let log_file_path = log_file_path.to_path_buf();
            let summary = format!(
                "Native control-surface bridge is serving deck actions and LCD payloads at {base_url}."
            );

            let _ = append_log(log_file_path.as_path(), "INFO", &summary);

            thread::spawn(move || run_control_surface_bridge(listener, db_path, log_file_path));

            ControlSurfaceBridgeInfo {
                base_url,
                port,
                available: true,
                status: String::from("ready"),
                summary,
                error: None,
            }
        }
        Err(message) => ControlSurfaceBridgeInfo {
            base_url: format!("http://{DEFAULT_CONTROL_SURFACE_HOST}:{requested_port}"),
            port: requested_port,
            available: false,
            status: String::from("unavailable"),
            summary: format!(
                "Native control-surface bridge is unavailable because the listener could not bind: {message}"
            ),
            error: Some(message),
        },
    }
}

pub fn read_control_surface_context(db_path: &Path) -> Result<Value, ControlSurfaceError> {
    let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    let context = read_planning_context(db_path, &planning_settings)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;

    Ok(json!({
        "selectedProject": context.selected_project,
        "projectIndex": context.project_index,
        "projectCount": context.project_count,
        "selectedTaskId": context.selected_task_id,
        "selectedTask": context.selected_task,
        "taskIndex": context.task_index,
        "tasks": context.tasks,
        "taskCount": context.task_count,
        "runningTask": context.running_task,
        "viewFilter": context.settings.view_filter,
        "sortBy": context.settings.sort_by,
    }))
}

pub fn read_control_surface_lcd_text(
    db_path: &Path,
    key: &str,
) -> Result<String, ControlSurfaceError> {
    let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    let app_settings = list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    let context = read_planning_context(db_path, &planning_settings)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    let lighting_snapshot = read_lighting_snapshot(&app_settings);
    let audio_snapshot = read_audio_snapshot(&app_settings);

    match key {
        "project_nav" => {
            if let Some(project) = &context.selected_project {
                Ok(format!(
                    "PROJECT\\n{}\\n{}/{}",
                    truncate(&project.title, 12),
                    context.project_index + 1,
                    context.project_count
                ))
            } else {
                Ok(String::from("PROJECT\\n(none)\\n--"))
            }
        }
        "project_status" => {
            if let Some(project) = &context.selected_project {
                Ok(format!("STATUS\\n{}", status_label(&project.status)))
            } else {
                Ok(String::from("STATUS\\n--"))
            }
        }
        "project_priority" => {
            if let Some(project) = &context.selected_project {
                Ok(format!("PRIORITY\\n{}", priority_label(&project.priority)))
            } else {
                Ok(String::from("PRIORITY\\n--"))
            }
        }
        "sort_mode" => Ok(format!(
            "SORT\\n{}",
            sort_label(&context.settings.sort_by)
        )),
        "task_nav" => {
            if let Some(task) = &context.selected_task {
                Ok(format!(
                    "TASK\\n{}\\n{}/{}",
                    truncate(&task.title, 12),
                    context.task_index + 1,
                    context.task_count
                ))
            } else {
                Ok(String::from("TASK\\n(none)\\n--"))
            }
        }
        "light_nav" => {
            let selected_light_id = resolve_selected_inventory_id(
                &app_settings,
                SELECTED_LIGHT_ID_KEY,
                lighting_snapshot.fixtures.iter().map(|fixture| fixture.id.as_str()),
            );
            if let Some(selected_light_id) = selected_light_id {
                if let Some((index, fixture)) = lighting_snapshot
                    .fixtures
                    .iter()
                    .enumerate()
                    .find(|(_, fixture)| fixture.id == selected_light_id)
                {
                    return Ok(format!(
                        "LIGHT\\n{}\\n{}/{}",
                        truncate(&fixture.name, 12),
                        index + 1,
                        lighting_snapshot.fixtures.len()
                    ));
                }
            }
            Ok(String::from("LIGHT\\n(none)\\n--"))
        }
        "light_intensity" => Ok(String::from("INTENSITY\\n100%")),
        "light_cct" => Ok(String::from("CCT\\n4500K")),
        "scene_nav" => {
            let selected_scene_id = resolve_selected_inventory_id(
                &app_settings,
                SELECTED_SCENE_ID_KEY,
                lighting_snapshot.scenes.iter().map(|scene| scene.id.as_str()),
            );
            if let Some(selected_scene_id) = selected_scene_id {
                if let Some((index, scene)) = lighting_snapshot
                    .scenes
                    .iter()
                    .enumerate()
                    .find(|(_, scene)| scene.id == selected_scene_id)
                {
                    return Ok(format!(
                        "SCENE\\n{}\\n{}/{}",
                        truncate(&scene.name, 12),
                        index + 1,
                        lighting_snapshot.scenes.len()
                    ));
                }
            }
            Ok(String::from("SCENE\\n(none)\\n--"))
        }
        "audio_ch_nav" | "audio_gain1" | "audio_gain2" | "audio_gain3" => {
            let channel_index = match key {
                "audio_ch_nav" => 0,
                "audio_gain1" => 1,
                "audio_gain2" => 2,
                "audio_gain3" => 3,
                _ => 0,
            };

            if let Some(channel) = audio_snapshot.channels.get(channel_index) {
                Ok(format!("{}\\n0dB", truncate(&channel.name, 12)))
            } else {
                Ok(format!("CH {}\\n(none)", channel_index + 1))
            }
        }
        _ => Err(ControlSurfaceError::InvalidParams(format!(
            "Unsupported LCD key: {key}"
        ))),
    }
}

pub fn handle_control_surface_http_action(
    db_path: &Path,
    path: &str,
    body: &Value,
) -> Result<Value, ControlSurfaceError> {
    let action = body
        .get("action")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| ControlSurfaceError::InvalidParams(String::from("action is required")))?;
    let value = body.get("value").and_then(Value::as_str);

    match path {
        "/api/deck/action" => handle_planning_action(db_path, action, value),
        "/api/deck/light-action" => handle_light_action(db_path, action, value),
        "/api/deck/audio-action" => handle_audio_action(db_path, action, value),
        _ => Err(ControlSurfaceError::InvalidParams(format!(
            "Unsupported action route: {path}"
        ))),
    }
}

fn bind_control_surface_listener(requested_port: u16) -> Result<TcpListener, String> {
    TcpListener::bind((DEFAULT_CONTROL_SURFACE_HOST, requested_port))
        .map_err(|error| error.to_string())
}

fn run_control_surface_bridge(listener: TcpListener, db_path: std::path::PathBuf, log_file_path: std::path::PathBuf) {
    let _ = listener.set_nonblocking(false);
    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => {
                let db_path = db_path.clone();
                let log_file_path = log_file_path.clone();
                thread::spawn(move || {
                    if let Err(error) = handle_control_surface_connection(stream, &db_path) {
                        let _ = append_log(
                            log_file_path.as_path(),
                            "WARN",
                            &format!("Control-surface bridge request failed: {}", error.message()),
                        );
                    }
                });
            }
            Err(error) => {
                let _ = append_log(
                    log_file_path.as_path(),
                    "WARN",
                    &format!("Control-surface bridge accept failed: {error}"),
                );
                thread::sleep(Duration::from_millis(50));
            }
        }
    }
}

fn handle_control_surface_connection(
    mut stream: TcpStream,
    db_path: &Path,
) -> Result<(), ControlSurfaceError> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let request = read_http_request(&mut stream)?;
    let response = route_control_surface_request(db_path, &request);
    write_http_response(&mut stream, response.status_code, &response.body)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))
}

struct HttpRequest {
    method: String,
    target: String,
    body: Vec<u8>,
}

struct HttpResponse {
    status_code: u16,
    body: Vec<u8>,
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, ControlSurfaceError> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 1024];

    loop {
        let bytes_read = stream
            .read(&mut chunk)
            .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
        if bytes_read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..bytes_read]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
        if buffer.len() > 64 * 1024 {
            return Err(ControlSurfaceError::InvalidParams(String::from(
                "HTTP request header exceeded the native bridge limit",
            )));
        }
    }

    let Some(header_end) = buffer.windows(4).position(|window| window == b"\r\n\r\n") else {
        return Err(ControlSurfaceError::InvalidParams(String::from(
            "Malformed HTTP request",
        )));
    };
    let header_end = header_end + 4;
    let header_text = String::from_utf8_lossy(&buffer[..header_end]).to_string();
    let mut lines = header_text.lines();
    let request_line = lines
        .next()
        .ok_or_else(|| ControlSurfaceError::InvalidParams(String::from("Missing request line")))?;
    let mut parts = request_line.split_whitespace();
    let method = parts
        .next()
        .ok_or_else(|| ControlSurfaceError::InvalidParams(String::from("Missing HTTP method")))?
        .to_string();
    let target = parts
        .next()
        .ok_or_else(|| ControlSurfaceError::InvalidParams(String::from("Missing HTTP target")))?
        .to_string();

    let content_length = header_text
        .lines()
        .skip(1)
        .filter_map(|line| line.split_once(':'))
        .find_map(|(name, value)| {
            if name.trim().eq_ignore_ascii_case("content-length") {
                value.trim().parse::<usize>().ok()
            } else {
                None
            }
        })
        .unwrap_or(0);

    while buffer.len() < header_end + content_length {
        let bytes_read = stream
            .read(&mut chunk)
            .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
        if bytes_read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..bytes_read]);
    }

    let mut body = buffer.split_off(header_end);
    if body.len() > content_length {
        body.truncate(content_length);
    }

    Ok(HttpRequest {
        method,
        target,
        body,
    })
}

fn route_control_surface_request(db_path: &Path, request: &HttpRequest) -> HttpResponse {
    let (path, query) = split_target(&request.target);

    let result = match (request.method.as_str(), path) {
        ("GET", "/api/deck/context") => read_control_surface_context(db_path),
        ("GET", "/api/deck/lcd") => {
            let key = query_parameter(query, "key").ok_or_else(|| {
                ControlSurfaceError::InvalidParams(String::from("Missing ?key= parameter"))
            });
            key.and_then(|key| read_control_surface_lcd_text(db_path, &key).map(Value::String))
        }
        ("POST", "/api/deck/action")
        | ("POST", "/api/deck/light-action")
        | ("POST", "/api/deck/audio-action") => parse_json_body(&request.body)
            .and_then(|body| handle_control_surface_http_action(db_path, path, &body)),
        _ => Err(ControlSurfaceError::InvalidParams(format!(
            "Unsupported bridge endpoint: {} {}",
            request.method, path
        ))),
    };

    match result {
        Ok(value) => HttpResponse {
            status_code: 200,
            body: serde_json::to_vec(&value).unwrap_or_else(|_| b"{}".to_vec()),
        },
        Err(error) => HttpResponse {
            status_code: error.status_code(),
            body: serde_json::to_vec(&json!({ "error": error.message() }))
                .unwrap_or_else(|_| b"{\"error\":\"bridge failure\"}".to_vec()),
        },
    }
}

fn write_http_response(
    stream: &mut TcpStream,
    status_code: u16,
    body: &[u8],
) -> Result<(), std::io::Error> {
    let status_text = match status_code {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        409 => "Conflict",
        500 => "Internal Server Error",
        501 => "Not Implemented",
        _ => "Error",
    };
    let headers = format!(
        "HTTP/1.1 {status_code} {status_text}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(headers.as_bytes())?;
    stream.write_all(body)?;
    stream.flush()
}

fn split_target(target: &str) -> (&str, &str) {
    target.split_once('?').unwrap_or((target, ""))
}

fn query_parameter(query: &str, name: &str) -> Option<String> {
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(key, value)| {
            if key == name {
                Some(value.replace("%20", " "))
            } else {
                None
            }
        })
}

fn parse_json_body(body: &[u8]) -> Result<Value, ControlSurfaceError> {
    if body.is_empty() {
        return Ok(json!({}));
    }

    serde_json::from_slice(body)
        .map_err(|error| ControlSurfaceError::InvalidParams(error.to_string()))
}

fn handle_planning_action(
    db_path: &Path,
    action: &str,
    value: Option<&str>,
) -> Result<Value, ControlSurfaceError> {
    match action {
        "selectNextProject" | "selectPrevProject" => {
            let direction = if action == "selectNextProject" {
                "next"
            } else {
                "prev"
            };
            let result = apply_planning_selection(
                db_path,
                &parse_planning_selection_request(&json!({ "projectDirection": direction }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({
                "selectedProjectId": result.settings.selected_project_id,
                "selectedTaskId": result.settings.selected_task_id,
            }))
        }
        "selectNextTask" | "selectPrevTask" => {
            let direction = if action == "selectNextTask" {
                "next"
            } else {
                "prev"
            };
            let result = apply_planning_selection(
                db_path,
                &parse_planning_selection_request(&json!({ "taskDirection": direction }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({
                "selectedTaskId": result.settings.selected_task_id,
            }))
        }
        "setStatus" => {
            let status = value.ok_or_else(|| {
                ControlSurfaceError::InvalidParams(String::from("setStatus requires value"))
            })?;
            let context = current_planning_context(db_path)?;
            let project = require_selected_project(&context)?;
            let result = apply_planning_project_reorder(
                db_path,
                &parse_planning_project_reorder_request(&json!({
                    "projectId": project.id,
                    "newStatus": status
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "project": result.project }))
        }
        "nextStatus" | "prevStatus" => {
            let context = current_planning_context(db_path)?;
            let project = require_selected_project(&context)?;
            let next_status = cycle_value(
                PROJECT_STATUS_CYCLE,
                &project.status,
                action == "nextStatus",
            );
            let result = apply_planning_project_reorder(
                db_path,
                &parse_planning_project_reorder_request(&json!({
                    "projectId": project.id,
                    "newStatus": next_status
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "project": result.project }))
        }
        "setPriority" => {
            let priority = value.ok_or_else(|| {
                ControlSurfaceError::InvalidParams(String::from("setPriority requires value"))
            })?;
            let context = current_planning_context(db_path)?;
            let project = require_selected_project(&context)?;
            let result = apply_planning_project_update(
                db_path,
                &parse_planning_project_update_request(&json!({
                    "projectId": project.id,
                    "priority": priority
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "project": result.project }))
        }
        "nextPriority" | "prevPriority" => {
            let context = current_planning_context(db_path)?;
            let project = require_selected_project(&context)?;
            let next_priority = cycle_value(
                PROJECT_PRIORITY_CYCLE,
                &project.priority,
                action == "nextPriority",
            );
            let result = apply_planning_project_update(
                db_path,
                &parse_planning_project_update_request(&json!({
                    "projectId": project.id,
                    "priority": next_priority
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "project": result.project }))
        }
        "nextSort" | "prevSort" => {
            let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
            let current_sort = planning_settings
                .get(SORT_BY_KEY)
                .cloned()
                .unwrap_or_else(|| String::from("manual"));
            let next_sort = cycle_value(SORT_CYCLE, &current_sort, action == "nextSort");
            let result = update_planning_settings(
                db_path,
                &parse_planning_settings_update(&json!({ "sortBy": next_sort }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "sortBy": result.settings.sort_by }))
        }
        "resetSort" => {
            let result = update_planning_settings(
                db_path,
                &parse_planning_settings_update(&json!({ "sortBy": "manual" }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "sortBy": result.settings.sort_by }))
        }
        "toggleTimer" => {
            let context = current_planning_context(db_path)?;
            let task_id = resolve_timer_task_id(&context)?;
            let result = apply_planning_task_timer(
                db_path,
                &parse_planning_task_timer_request(&json!({
                    "taskId": task_id,
                    "action": "toggle"
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "task": result.task }))
        }
        "toggleTaskComplete" => {
            let context = current_planning_context(db_path)?;
            let task_id = resolve_completion_task_id(&context)?;
            let result = apply_planning_task_toggle_complete(
                db_path,
                &parse_planning_task_toggle_complete_request(&json!({
                    "taskId": task_id
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "task": result.task }))
        }
        "createProject" => {
            let title = value.unwrap_or("New Project");
            let result = apply_planning_project_create(
                db_path,
                &parse_planning_project_create_request(&json!({ "title": title }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "project": result.project }))
        }
        "deleteProject" => {
            let context = current_planning_context(db_path)?;
            let project = require_selected_project(&context)?;
            let result = apply_planning_project_delete(
                db_path,
                &parse_planning_project_delete_request(&json!({ "projectId": project.id }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "deleted": result.deleted, "projectId": project.id }))
        }
        "setFilter" => {
            let filter = value.ok_or_else(|| {
                ControlSurfaceError::InvalidParams(String::from("setFilter requires value"))
            })?;
            let result = update_planning_settings(
                db_path,
                &parse_planning_settings_update(&json!({ "viewFilter": filter }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "viewFilter": result.settings.view_filter }))
        }
        "openDetail" => Ok(json!({ "action": "openDetail" })),
        _ => Err(ControlSurfaceError::Unsupported(format!(
            "Unsupported planning deck action: {action}"
        ))),
    }
}

fn handle_light_action(
    db_path: &Path,
    action: &str,
    value: Option<&str>,
) -> Result<Value, ControlSurfaceError> {
    match action {
        "switchToDeckMode" => {
            let deck_mode = value.unwrap_or("light");
            let result = update_planning_settings(
                db_path,
                &parse_planning_settings_update(&json!({ "deckMode": deck_mode }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "deckMode": result.settings.deck_mode }))
        }
        "selectNextLight" | "selectPrevLight" => {
            let app_settings = list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
            let lighting_snapshot = read_lighting_snapshot(&app_settings);
            let selected_light_id = resolve_selected_inventory_id(
                &app_settings,
                SELECTED_LIGHT_ID_KEY,
                lighting_snapshot.fixtures.iter().map(|fixture| fixture.id.as_str()),
            );
            let next_light_id = cycle_inventory_id(
                lighting_snapshot.fixtures.iter().map(|fixture| fixture.id.as_str()),
                selected_light_id.as_deref(),
                action == "selectNextLight",
            );
            persist_optional_setting(db_path, SELECTED_LIGHT_ID_KEY, next_light_id.as_deref())?;
            Ok(json!({ "selectedLightId": next_light_id }))
        }
        "selectNextScene" | "selectPrevScene" => {
            let app_settings = list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
            let lighting_snapshot = read_lighting_snapshot(&app_settings);
            let selected_scene_id = resolve_selected_inventory_id(
                &app_settings,
                SELECTED_SCENE_ID_KEY,
                lighting_snapshot.scenes.iter().map(|scene| scene.id.as_str()),
            );
            let next_scene_id = cycle_inventory_id(
                lighting_snapshot.scenes.iter().map(|scene| scene.id.as_str()),
                selected_scene_id.as_deref(),
                action == "selectNextScene",
            );
            persist_optional_setting(db_path, SELECTED_SCENE_ID_KEY, next_scene_id.as_deref())?;
            Ok(json!({ "selectedSceneId": next_scene_id }))
        }
        "recallScene" => {
            let app_settings = list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
            let lighting_snapshot = read_lighting_snapshot(&app_settings);
            let scene_id = resolve_selected_inventory_id(
                &app_settings,
                SELECTED_SCENE_ID_KEY,
                lighting_snapshot.scenes.iter().map(|scene| scene.id.as_str()),
            )
            .ok_or_else(|| ControlSurfaceError::Rejected(String::from("No lighting scene is available.")))?;
            let result = recall_lighting_scene(
                db_path,
                &parse_lighting_scene_recall_request(&json!({
                    "sceneId": scene_id,
                    "fadeDurationSeconds": 0.0
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(|error| match error {
                crate::lighting::LightingCommandError::Rejected(_, message) => {
                    ControlSurfaceError::Rejected(message)
                }
                crate::lighting::LightingCommandError::Storage(message) => {
                    ControlSurfaceError::Storage(message)
                }
            })?;
            Ok(json!({ "recalled": result.scene_name }))
        }
        _ => Err(ControlSurfaceError::Unsupported(format!(
            "Lighting deck action '{action}' is not ported yet."
        ))),
    }
}

fn handle_audio_action(
    db_path: &Path,
    action: &str,
    value: Option<&str>,
) -> Result<Value, ControlSurfaceError> {
    match action {
        "switchToDeckMode" => {
            let deck_mode = value.unwrap_or("audio");
            let result = update_planning_settings(
                db_path,
                &parse_planning_settings_update(&json!({ "deckMode": deck_mode }))
                    .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(map_planning_error)?;
            Ok(json!({ "deckMode": result.settings.deck_mode }))
        }
        "recallSnapshot" => {
            let app_settings = list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
            let audio_snapshot = read_audio_snapshot(&app_settings);
            let Some(snapshot) = audio_snapshot.snapshots.first() else {
                return Err(ControlSurfaceError::Rejected(String::from(
                    "No audio snapshot is available.",
                )));
            };
            let result = recall_audio_snapshot(
                db_path,
                &parse_audio_snapshot_recall_request(&json!({
                    "snapshotId": snapshot.id
                }))
                .map_err(ControlSurfaceError::InvalidParams)?,
            )
            .map_err(|error| match error {
                crate::audio::AudioCommandError::Rejected(_, message) => {
                    ControlSurfaceError::Rejected(message)
                }
                crate::audio::AudioCommandError::Storage(message) => {
                    ControlSurfaceError::Storage(message)
                }
            })?;
            Ok(json!({ "recalled": result.snapshot_name }))
        }
        _ => Err(ControlSurfaceError::Unsupported(format!(
            "Audio deck action '{action}' is not ported yet."
        ))),
    }
}

fn current_planning_context(db_path: &Path) -> Result<PlanningContextSnapshot, ControlSurfaceError> {
    let planning_settings = list_settings_by_prefix(db_path, PLANNING_SETTINGS_PREFIX)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    read_planning_context(db_path, &planning_settings)
        .map_err(|error| ControlSurfaceError::Storage(error.to_string()))
}

fn require_selected_project(
    context: &PlanningContextSnapshot,
) -> Result<crate::planning::PlanningProjectContext, ControlSurfaceError> {
    context.selected_project.clone().ok_or_else(|| {
        ControlSurfaceError::Rejected(String::from("No project is currently selected."))
    })
}

fn resolve_timer_task_id(context: &PlanningContextSnapshot) -> Result<String, ControlSurfaceError> {
    if let Some(task_id) = context.selected_task_id.clone() {
        return Ok(task_id);
    }

    if let Some(running_task) = &context.running_task {
        return Ok(running_task.id.clone());
    }

    context
        .tasks
        .first()
        .map(|task| task.id.clone())
        .ok_or_else(|| ControlSurfaceError::Rejected(String::from("No tasks are available for the selected project.")))
}

fn resolve_completion_task_id(
    context: &PlanningContextSnapshot,
) -> Result<String, ControlSurfaceError> {
    if let Some(task_id) = context.selected_task_id.clone() {
        return Ok(task_id);
    }

    if let Some(task) = context.tasks.iter().find(|task| !task.completed) {
        return Ok(task.id.clone());
    }

    context
        .tasks
        .last()
        .map(|task| task.id.clone())
        .ok_or_else(|| ControlSurfaceError::Rejected(String::from("No tasks are available for the selected project.")))
}

fn map_planning_error(error: PlanningCommandError) -> ControlSurfaceError {
    match error {
        PlanningCommandError::InvalidParams(message) => ControlSurfaceError::InvalidParams(message),
        PlanningCommandError::Storage(message) => ControlSurfaceError::Storage(message),
    }
}

fn resolve_selected_inventory_id<'a>(
    settings: &HashMap<String, String>,
    key: &str,
    inventory_ids: impl Iterator<Item = &'a str>,
) -> Option<String> {
    let inventory_ids = inventory_ids.map(str::to_string).collect::<Vec<_>>();
    let configured = settings.get(key).cloned();
    if let Some(configured) = configured {
        if inventory_ids.iter().any(|value| value == &configured) {
            return Some(configured);
        }
    }
    inventory_ids.into_iter().next()
}

fn cycle_inventory_id<'a>(
    inventory_ids: impl Iterator<Item = &'a str>,
    current_id: Option<&str>,
    forward: bool,
) -> Option<String> {
    let values = inventory_ids.map(str::to_string).collect::<Vec<_>>();
    if values.is_empty() {
        return None;
    }

    let index = current_id
        .and_then(|current_id| values.iter().position(|value| value == current_id))
        .unwrap_or(0);
    let next = if forward {
        (index + 1) % values.len()
    } else if index == 0 {
        values.len() - 1
    } else {
        index - 1
    };
    values.get(next).cloned()
}

fn persist_optional_setting(
    db_path: &Path,
    key: &str,
    value: Option<&str>,
) -> Result<(), ControlSurfaceError> {
    let mut updates = Vec::new();
    let mut deletes = Vec::new();
    if let Some(value) = value {
        updates.push((key.to_string(), value.to_string()));
    } else {
        deletes.push(key.to_string());
    }
    if !updates.is_empty() {
        set_settings_owned(db_path, &updates)
            .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
    }
    if !deletes.is_empty() {
        let connection = open_connection(db_path)
            .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
        for key in deletes {
            connection
                .execute("DELETE FROM settings WHERE key = ?1", [key])
                .map_err(|error| ControlSurfaceError::Storage(error.to_string()))?;
        }
    }
    Ok(())
}

fn truncate(value: &str, max_chars: usize) -> String {
    let mut chars = value.chars().collect::<Vec<_>>();
    if chars.len() <= max_chars {
        return value.to_string();
    }
    chars.truncate(max_chars);
    chars.into_iter().collect()
}

fn status_label(value: &str) -> &'static str {
    match value {
        "todo" => "To Do",
        "in-progress" => "In Progress",
        "blocked" => "Blocked",
        "done" => "Done",
        _ => "--",
    }
}

fn priority_label(value: &str) -> &'static str {
    match value {
        "p0" => "P0 Critical",
        "p1" => "P1 High",
        "p2" => "P2 Medium",
        "p3" => "P3 Low",
        _ => "--",
    }
}

fn sort_label(value: &str) -> &'static str {
    match value {
        "manual" => "Manual",
        "priority" => "Priority",
        "date" => "Date",
        "name" => "Name",
        _ => "Manual",
    }
}

fn cycle_value(values: &[&str], current: &str, forward: bool) -> String {
    let index = values.iter().position(|value| *value == current).unwrap_or(0);
    let next = if forward {
        (index + 1) % values.len()
    } else if index == 0 {
        values.len() - 1
    } else {
        index - 1
    };
    values[next].to_string()
}

pub fn build_control_surface_health_check(runtime: &RuntimeContext) -> Value {
    json!({
        "ok": runtime.control_surface_bridge.available,
        "status": runtime.control_surface_bridge.status,
        "summary": runtime.control_surface_bridge.summary,
        "baseUrl": runtime.control_surface_bridge.base_url,
        "port": runtime.control_surface_bridge.port,
        "error": runtime.control_surface_bridge.error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_preserves_short_text() {
        assert_eq!(truncate("Host Mic", 12), "Host Mic");
    }

    #[test]
    fn truncate_limits_long_text() {
        assert_eq!(truncate("Very Long Fixture Name", 12), "Very Long Fi");
    }

    #[test]
    fn cycle_value_wraps_forward() {
        assert_eq!(cycle_value(PROJECT_STATUS_CYCLE, "done", true), "todo");
    }

    #[test]
    fn cycle_value_wraps_backward() {
        assert_eq!(cycle_value(PROJECT_STATUS_CYCLE, "todo", false), "done");
    }
}
