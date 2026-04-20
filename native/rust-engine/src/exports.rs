use crate::bootstrap::RuntimeContext;
use serde::Serialize;
use serde_json::{json, Map, Value};
use std::fs;

const INSTANCE_ID: &str = "projmgr";

#[derive(Debug)]
pub enum ExportCommandError {
    InvalidParams(String),
    Storage(String),
}

#[derive(Debug, Serialize)]
pub struct CompanionExportSummary {
    pub path: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(rename = "pageCount")]
    pub page_count: usize,
    #[serde(rename = "actionCount")]
    pub action_count: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct ControlSurfaceSnapshot {
    pub pages: Vec<ControlSurfacePage>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ControlSurfacePage {
    pub id: String,
    pub label: String,
    pub buttons: Vec<ControlSurfaceControl>,
    pub dials: Vec<ControlSurfaceControl>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ControlSurfaceControl {
    pub id: String,
    #[serde(rename = "type")]
    pub control_type: String,
    pub position: i64,
    pub label: String,
    pub description: String,
    #[serde(rename = "isPageNav", skip_serializing_if = "Option::is_none")]
    pub is_page_nav: Option<bool>,
    #[serde(rename = "pageNavTarget", skip_serializing_if = "Option::is_none")]
    pub page_nav_target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Value>,
    #[serde(rename = "lcdKey", skip_serializing_if = "Option::is_none")]
    pub lcd_key: Option<String>,
    #[serde(rename = "lcdRefreshKeys", skip_serializing_if = "Option::is_none")]
    pub lcd_refresh_keys: Option<Vec<String>>,
}

pub fn export_companion_config(
    runtime: &RuntimeContext,
    base_url_override: Option<&str>,
) -> Result<CompanionExportSummary, ExportCommandError> {
    if !runtime.control_surface_bridge.available {
        return Err(ExportCommandError::InvalidParams(format!(
            "Companion export is unavailable because the native control-surface bridge is not running: {}",
            runtime
                .control_surface_bridge
                .error
                .clone()
                .unwrap_or_else(|| String::from("bridge unavailable"))
        )));
    }

    let export_dir = runtime.app_data_dir.join("exports");
    fs::create_dir_all(&export_dir)
        .map_err(|error| ExportCommandError::Storage(error.to_string()))?;
    let timestamp = current_export_timestamp();
    let file_name = format!("sse-exed-studio-control-native-{timestamp}.companionconfig");
    let path = export_dir.join(&file_name);
    let base_url = base_url_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&runtime.control_surface_bridge.base_url);
    let config = generate_companion_config(base_url);
    let action_count = count_companion_actions(&config);
    let page_count = config
        .get("pages")
        .and_then(Value::as_object)
        .map(|pages| pages.len())
        .unwrap_or(0);
    let json = serde_json::to_vec_pretty(&config)
        .map_err(|error| ExportCommandError::Storage(error.to_string()))?;
    fs::write(&path, json).map_err(|error| ExportCommandError::Storage(error.to_string()))?;

    Ok(CompanionExportSummary {
        path: path.display().to_string(),
        file_name,
        base_url: String::from(base_url),
        page_count,
        action_count,
    })
}

pub fn build_control_surface_snapshot() -> ControlSurfaceSnapshot {
    ControlSurfaceSnapshot {
        pages: vec![
            control_surface_page("projects", "PROJECTS", "proj", project_controls()),
            control_surface_page("tasks", "TASKS", "tasks", task_controls()),
            control_surface_page("lights", "LIGHTS", "lights", light_controls()),
            control_surface_page("audio", "AUDIO", "audio", audio_controls()),
        ],
    }
}

fn current_export_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    now.to_string()
}

fn count_companion_actions(config: &Value) -> usize {
    config
        .get("pages")
        .and_then(Value::as_object)
        .map(|pages| {
            pages
                .values()
                .filter_map(|page| page.get("controls").and_then(Value::as_object))
                .flat_map(|rows| rows.values())
                .filter_map(Value::as_object)
                .flat_map(|columns| columns.values())
                .filter_map(|control| control.get("steps").and_then(Value::as_object))
                .flat_map(|steps| steps.values())
                .filter_map(|step| step.get("action_sets").and_then(Value::as_object))
                .map(|action_sets| {
                    action_sets
                        .values()
                        .filter_map(Value::as_array)
                        .map(Vec::len)
                        .sum::<usize>()
                })
                .sum()
        })
        .unwrap_or(0)
}

fn generate_companion_config(base_url: &str) -> Value {
    let mut pages = Map::new();
    pages.insert(
        String::from("1"),
        build_page("PROJECTS", project_controls()),
    );
    pages.insert(String::from("2"), build_page("TASKS", task_controls()));
    pages.insert(String::from("3"), build_page("LIGHTS", light_controls()));
    pages.insert(String::from("4"), build_page("AUDIO", audio_controls()));

    json!({
        "version": 6,
        "type": "full",
        "pages": pages,
        "instances": {
            INSTANCE_ID: {
                "label": "SSE ExEd Studio Control Native",
                "instance_type": "generic-http",
                "config": {
                    "prefix": base_url,
                    "proxyAddress": "",
                    "rejectUnauthorized": true
                },
                "isFirstInit": false,
                "lastUpgradeIndex": 0,
                "enabled": true,
                "sortOrder": 0
            }
        }
    })
}

#[derive(Clone)]
struct ControlDef {
    row: &'static str,
    col: &'static str,
    label: &'static str,
    is_rotary: bool,
    down: Vec<Value>,
    rotate_left: Vec<Value>,
    rotate_right: Vec<Value>,
    text_expression: Option<&'static str>,
}

fn control_surface_page(
    page_id: &str,
    label: &str,
    prefix: &str,
    controls: Vec<ControlDef>,
) -> ControlSurfacePage {
    let mut buttons = Vec::new();
    let mut dials = Vec::new();

    for control in controls {
        if control.is_rotary {
            let position = control.col.parse::<i64>().unwrap_or(0) + 1;
            dials.push(control_surface_control(
                format!("{prefix}-dial-{position}-press"),
                String::from("dial-press"),
                position,
                dial_press_label(&control),
                control_description(&control.down, control.label, "press"),
                &control.down,
                control.text_expression,
            ));
            dials.push(control_surface_control(
                format!("{prefix}-dial-{position}-left"),
                String::from("dial-turn-left"),
                position,
                dial_rotation_label(&control.rotate_left, "left"),
                control_description(&control.rotate_left, control.label, "left"),
                &control.rotate_left,
                None,
            ));
            dials.push(control_surface_control(
                format!("{prefix}-dial-{position}-right"),
                String::from("dial-turn-right"),
                position,
                dial_rotation_label(&control.rotate_right, "right"),
                control_description(&control.rotate_right, control.label, "right"),
                &control.rotate_right,
                None,
            ));
        } else {
            let row = control.row.parse::<i64>().unwrap_or(0);
            let col = control.col.parse::<i64>().unwrap_or(0);
            let position = row * 4 + col + 1;
            buttons.push(control_surface_control(
                format!("{prefix}-btn-{position}"),
                String::from("button"),
                position,
                String::from(control.label),
                control_description(&control.down, control.label, "button"),
                &control.down,
                control.text_expression,
            ));
        }
    }

    ControlSurfacePage {
        id: String::from(page_id),
        label: String::from(label),
        buttons,
        dials,
    }
}

fn control_surface_control(
    id: String,
    control_type: String,
    position: i64,
    label: String,
    description: String,
    actions: &[Value],
    text_expression: Option<&str>,
) -> ControlSurfaceControl {
    let page_nav_target = extract_page_nav_target(actions).map(String::from);
    let request = extract_primary_request(actions);
    let lcd_refresh_keys = extract_lcd_refresh_keys(actions);

    ControlSurfaceControl {
        id,
        control_type,
        position,
        label,
        description,
        is_page_nav: page_nav_target.as_ref().map(|_| true),
        page_nav_target,
        method: request.as_ref().map(|(method, _, _)| method.clone()),
        url: request.as_ref().map(|(_, url, _)| url.clone()),
        body: request.and_then(|(_, _, body)| body),
        lcd_key: text_expression.and_then(extract_lcd_key).map(String::from),
        lcd_refresh_keys: (!lcd_refresh_keys.is_empty()).then_some(lcd_refresh_keys),
    }
}

fn extract_page_nav_target(actions: &[Value]) -> Option<&'static str> {
    for action in actions {
        if action.get("instance").and_then(Value::as_str) != Some("internal") {
            continue;
        }
        if action.get("action").and_then(Value::as_str) != Some("set_page") {
            continue;
        }
        let page = action
            .get("options")
            .and_then(Value::as_object)
            .and_then(|options| options.get("page"))
            .and_then(Value::as_i64)?;
        return match page {
            1 => Some("PROJECTS"),
            2 => Some("TASKS"),
            3 => Some("LIGHTS"),
            4 => Some("AUDIO"),
            _ => None,
        };
    }

    None
}

fn extract_primary_request(actions: &[Value]) -> Option<(String, String, Option<Value>)> {
    for action in actions {
        let Some(action_name) = action.get("action").and_then(Value::as_str) else {
            continue;
        };
        let method = match action_name {
            "post" => "POST",
            "get" => "GET",
            _ => continue,
        };
        let Some(options) = action.get("options").and_then(Value::as_object) else {
            continue;
        };
        let Some(url) = options.get("url").and_then(Value::as_str) else {
            continue;
        };
        if url.starts_with("/api/deck/lcd?") {
            continue;
        }
        let body = options.get("body").and_then(|value| match value {
            Value::String(serialized) => serde_json::from_str(serialized).ok(),
            Value::Object(_) => Some(value.clone()),
            _ => None,
        });
        return Some((String::from(method), String::from(url), body));
    }

    None
}

fn extract_lcd_key(expression: &str) -> Option<&str> {
    expression.split("lcd_").nth(1)?.strip_suffix(')')
}

fn extract_lcd_refresh_keys(actions: &[Value]) -> Vec<String> {
    actions
        .iter()
        .filter_map(|action| {
            let options = action.get("options").and_then(Value::as_object)?;
            let url = options.get("url").and_then(Value::as_str)?;
            url.split("key=").nth(1).map(String::from)
        })
        .collect()
}

fn dial_press_label(control: &ControlDef) -> String {
    String::from(control.label)
}

fn dial_rotation_label(actions: &[Value], direction: &str) -> String {
    if let Some(action) = primary_payload_action(actions) {
        return match (action.as_str(), direction) {
            ("selectPrevProject", _) => String::from("Prev Project"),
            ("selectNextProject", _) => String::from("Next Project"),
            ("selectPrevTask", _) => String::from("Prev Task"),
            ("selectNextTask", _) => String::from("Next Task"),
            ("prevStatus", _) => String::from("Prev Status"),
            ("nextStatus", _) => String::from("Next Status"),
            ("prevPriority", _) => String::from("Prev Priority"),
            ("nextPriority", _) => String::from("Next Priority"),
            ("prevSort", _) => String::from("Prev Sort"),
            ("nextSort", _) => String::from("Next Sort"),
            ("selectPrevLight", _) => String::from("Prev Light"),
            ("selectNextLight", _) => String::from("Next Light"),
            ("intensityDown", _) => String::from("Intensity Down"),
            ("intensityUp", _) => String::from("Intensity Up"),
            ("cctDown", _) => String::from("CCT Down"),
            ("cctUp", _) => String::from("CCT Up"),
            ("selectPrevScene", _) => String::from("Prev Scene"),
            ("selectNextScene", _) => String::from("Next Scene"),
            ("gainDown", _) => String::from("Gain Down"),
            ("gainUp", _) => String::from("Gain Up"),
            _ => {
                if direction == "left" {
                    String::from("Previous")
                } else {
                    String::from("Next")
                }
            }
        };
    }

    if direction == "left" {
        String::from("Previous")
    } else {
        String::from("Next")
    }
}

fn control_description(actions: &[Value], fallback_label: &str, interaction: &str) -> String {
    let Some(action) = primary_payload_action(actions) else {
        if let Some(page_target) = extract_page_nav_target(actions) {
            return format!("Navigate to the {page_target} page.");
        }
        return format!("{interaction} {fallback_label}.");
    };

    let value = primary_payload_value(actions);
    match action.as_str() {
        "setFilter" => format!(
            "Set view filter to {}.",
            value
                .as_deref()
                .map(format_filter_value)
                .unwrap_or_else(|| String::from("the selected column"))
        ),
        "createProject" => String::from("Create a new project."),
        "openDetail" => String::from("Open the current project or task detail."),
        "selectPrevProject" => String::from("Select the previous project."),
        "selectNextProject" => String::from("Select the next project."),
        "setStatus" => format!(
            "Set status to {}.",
            value
                .as_deref()
                .map(format_filter_value)
                .unwrap_or_else(|| String::from("the selected value"))
        ),
        "prevStatus" => String::from("Cycle status backward."),
        "nextStatus" => String::from("Cycle status forward."),
        "prevPriority" => String::from("Cycle priority backward."),
        "nextPriority" => String::from("Cycle priority forward."),
        "resetSort" => String::from("Reset sort order to manual."),
        "prevSort" => String::from("Cycle sort order backward."),
        "nextSort" => String::from("Cycle sort order forward."),
        "toggleTimer" => String::from("Start or stop the selected task timer."),
        "toggleTaskComplete" => String::from("Toggle completion on the selected task."),
        "selectPrevTask" => String::from("Select the previous task."),
        "selectNextTask" => String::from("Select the next task."),
        "switchToDeckMode" => format!(
            "Switch deck mode to {}.",
            value
                .as_deref()
                .map(format_filter_value)
                .unwrap_or_else(|| String::from("the selected workspace"))
        ),
        "toggleLight" => String::from("Toggle the selected light."),
        "allOn" => String::from("Turn all lights on."),
        "allOff" => String::from("Turn all lights off."),
        "saveScene" => String::from("Save the current lighting scene."),
        "recallScene" => String::from("Recall the selected lighting scene."),
        "deleteScene" => String::from("Delete the selected lighting scene."),
        "selectPrevLight" => String::from("Select the previous light."),
        "selectNextLight" => String::from("Select the next light."),
        "resetIntensity" => String::from("Reset the selected light intensity."),
        "intensityDown" => String::from("Lower the selected light intensity."),
        "intensityUp" => String::from("Raise the selected light intensity."),
        "resetCct" => String::from("Reset the selected light CCT."),
        "cctDown" => String::from("Lower the selected light CCT."),
        "cctUp" => String::from("Raise the selected light CCT."),
        "toggleMute" => format!(
            "Toggle mute on channel {}.",
            value.unwrap_or_else(|| String::from("the selected"))
        ),
        "togglePhantom" => format!(
            "Toggle 48V on channel {}.",
            value.unwrap_or_else(|| String::from("the selected"))
        ),
        "recallSnapshot" => String::from("Recall the current audio snapshot."),
        "gainDown" => format!(
            "Lower gain on channel {}.",
            value.unwrap_or_else(|| String::from("the selected"))
        ),
        "gainUp" => format!(
            "Raise gain on channel {}.",
            value.unwrap_or_else(|| String::from("the selected"))
        ),
        _ => format!("{interaction} {fallback_label}."),
    }
}

fn primary_payload_action(actions: &[Value]) -> Option<String> {
    primary_payload_body(actions)?
        .get("action")
        .and_then(Value::as_str)
        .map(String::from)
}

fn primary_payload_value(actions: &[Value]) -> Option<String> {
    primary_payload_body(actions)?
        .get("value")
        .and_then(Value::as_str)
        .map(String::from)
}

fn primary_payload_body(actions: &[Value]) -> Option<Value> {
    extract_primary_request(actions).and_then(|(_, _, body)| body)
}

fn format_filter_value(value: &str) -> String {
    value.replace('-', " ")
}

fn build_page(name: &str, controls: Vec<ControlDef>) -> Value {
    let mut rows = Map::new();
    for control in controls {
        let style = if let Some(expression) = control.text_expression {
            json!({
                "text": expression,
                "textExpression": true,
                "size": "auto",
                "png64": Value::Null,
                "alignment": "center:center",
                "pngalignment": "center:center",
                "color": 16777215,
                "bgcolor": 0,
                "show_topbar": "default"
            })
        } else {
            json!({
                "text": control.label.replace(' ', "\\n"),
                "textExpression": false,
                "size": "auto",
                "png64": Value::Null,
                "alignment": "center:center",
                "pngalignment": "center:center",
                "color": 16777215,
                "bgcolor": 0,
                "show_topbar": "default"
            })
        };
        let control_value = json!({
            "type": "button",
            "options": {
                "rotaryActions": control.is_rotary,
                "stepAutoProgress": true
            },
            "style": style,
            "feedbacks": [],
            "steps": {
                "0": {
                    "action_sets": {
                        "down": control.down,
                        "up": [],
                        "rotate_left": control.rotate_left,
                        "rotate_right": control.rotate_right
                    },
                    "options": {
                        "runWhileHeld": []
                    }
                }
            }
        });
        rows.entry(control.row.to_string())
            .or_insert_with(|| Value::Object(Map::new()));
        rows.get_mut(control.row)
            .and_then(Value::as_object_mut)
            .expect("row should be an object")
            .insert(control.col.to_string(), control_value);
    }

    json!({
        "name": name,
        "controls": rows,
        "gridSize": {
            "minColumn": 0,
            "maxColumn": 3,
            "minRow": 0,
            "maxRow": 3
        }
    })
}

fn project_controls() -> Vec<ControlDef> {
    vec![
        button(
            "0",
            "0",
            "All",
            http_post(
                "/api/deck/action",
                json!({"action":"setFilter","value":"all"}),
            ),
        ),
        button(
            "0",
            "1",
            "To Do",
            http_post(
                "/api/deck/action",
                json!({"action":"setFilter","value":"todo"}),
            ),
        ),
        button(
            "0",
            "2",
            "In Prog",
            http_post(
                "/api/deck/action",
                json!({"action":"setFilter","value":"in-progress"}),
            ),
        ),
        button(
            "0",
            "3",
            "TASKS >>",
            page_jump(2)
                .into_iter()
                .chain(lcd_refreshes(&[
                    "project_nav",
                    "task_nav",
                    "project_status",
                    "project_priority",
                ]))
                .collect(),
        ),
        button(
            "1",
            "0",
            "Blocked",
            http_post(
                "/api/deck/action",
                json!({"action":"setFilter","value":"blocked"}),
            ),
        ),
        button(
            "1",
            "1",
            "Done",
            http_post(
                "/api/deck/action",
                json!({"action":"setFilter","value":"done"}),
            ),
        ),
        button(
            "1",
            "2",
            "New Proj",
            http_post("/api/deck/action", json!({"action":"createProject"})),
        ),
        button(
            "1",
            "3",
            "LIGHTS >>",
            page_jump(3)
                .into_iter()
                .chain(http_post(
                    "/api/deck/light-action",
                    json!({"action":"switchToDeckMode","value":"light"}),
                ))
                .chain(lcd_refreshes(&[
                    "light_nav",
                    "light_intensity",
                    "light_cct",
                    "scene_nav",
                ]))
                .collect(),
        ),
        dial(
            "3",
            "0",
            "Project",
            Some("$(SSE ExEd Studio Control Native:lcd_project_nav)"),
            http_post("/api/deck/action", json!({"action":"openDetail"}))
                .into_iter()
                .chain(lcd_refreshes(&[
                    "project_nav",
                    "project_status",
                    "project_priority",
                    "task_nav",
                    "sort_mode",
                ]))
                .collect(),
            http_post("/api/deck/action", json!({"action":"selectPrevProject"})),
            http_post("/api/deck/action", json!({"action":"selectNextProject"})),
        ),
        dial(
            "3",
            "1",
            "Status",
            Some("$(SSE ExEd Studio Control Native:lcd_project_status)"),
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"in-progress"}),
            ),
            http_post("/api/deck/action", json!({"action":"prevStatus"})),
            http_post("/api/deck/action", json!({"action":"nextStatus"})),
        ),
        dial(
            "3",
            "2",
            "Priority",
            Some("$(SSE ExEd Studio Control Native:lcd_project_priority)"),
            Vec::new(),
            http_post("/api/deck/action", json!({"action":"prevPriority"})),
            http_post("/api/deck/action", json!({"action":"nextPriority"})),
        ),
        dial(
            "3",
            "3",
            "Sort",
            Some("$(SSE ExEd Studio Control Native:lcd_sort_mode)"),
            http_post("/api/deck/action", json!({"action":"resetSort"})),
            http_post("/api/deck/action", json!({"action":"prevSort"})),
            http_post("/api/deck/action", json!({"action":"nextSort"})),
        ),
    ]
}

fn task_controls() -> Vec<ControlDef> {
    vec![
        button("0", "0", "<< PROJ", page_jump(1)),
        button(
            "0",
            "1",
            "Timer",
            http_post("/api/deck/action", json!({"action":"toggleTimer"})),
        ),
        button(
            "0",
            "2",
            "Complete",
            http_post("/api/deck/action", json!({"action":"toggleTaskComplete"})),
        ),
        button(
            "0",
            "3",
            "In Prog",
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"in-progress"}),
            ),
        ),
        button(
            "1",
            "0",
            "To Do",
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"todo"}),
            ),
        ),
        button(
            "1",
            "1",
            "Blocked",
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"blocked"}),
            ),
        ),
        button(
            "1",
            "2",
            "Done",
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"done"}),
            ),
        ),
        button(
            "1",
            "3",
            "New Proj",
            http_post("/api/deck/action", json!({"action":"createProject"})),
        ),
        dial(
            "3",
            "0",
            "Project",
            Some("$(SSE ExEd Studio Control Native:lcd_project_nav)"),
            http_post("/api/deck/action", json!({"action":"openDetail"}))
                .into_iter()
                .chain(lcd_refreshes(&[
                    "project_nav",
                    "project_status",
                    "project_priority",
                    "task_nav",
                ]))
                .collect(),
            http_post("/api/deck/action", json!({"action":"selectPrevProject"})),
            http_post("/api/deck/action", json!({"action":"selectNextProject"})),
        ),
        dial(
            "3",
            "1",
            "Task",
            Some("$(SSE ExEd Studio Control Native:lcd_task_nav)"),
            http_post("/api/deck/action", json!({"action":"toggleTimer"})),
            http_post("/api/deck/action", json!({"action":"selectPrevTask"})),
            http_post("/api/deck/action", json!({"action":"selectNextTask"})),
        ),
        dial(
            "3",
            "2",
            "Status",
            Some("$(SSE ExEd Studio Control Native:lcd_project_status)"),
            http_post(
                "/api/deck/action",
                json!({"action":"setStatus","value":"in-progress"}),
            ),
            http_post("/api/deck/action", json!({"action":"prevStatus"})),
            http_post("/api/deck/action", json!({"action":"nextStatus"})),
        ),
        dial(
            "3",
            "3",
            "Priority",
            Some("$(SSE ExEd Studio Control Native:lcd_project_priority)"),
            http_post("/api/deck/action", json!({"action":"toggleTaskComplete"})),
            http_post("/api/deck/action", json!({"action":"prevPriority"})),
            http_post("/api/deck/action", json!({"action":"nextPriority"})),
        ),
    ]
}

fn light_controls() -> Vec<ControlDef> {
    vec![
        button(
            "0",
            "0",
            "<< PROJ",
            page_jump(1)
                .into_iter()
                .chain(http_post(
                    "/api/deck/light-action",
                    json!({"action":"switchToDeckMode","value":"project"}),
                ))
                .chain(lcd_refreshes(&[
                    "project_nav",
                    "project_status",
                    "project_priority",
                    "sort_mode",
                ]))
                .collect(),
        ),
        button(
            "0",
            "1",
            "Toggle",
            http_post("/api/deck/light-action", json!({"action":"toggleLight"})),
        ),
        button(
            "0",
            "2",
            "All On",
            http_post("/api/deck/light-action", json!({"action":"allOn"})),
        ),
        button(
            "0",
            "3",
            "All Off",
            http_post("/api/deck/light-action", json!({"action":"allOff"})),
        ),
        button(
            "1",
            "0",
            "Save",
            http_post("/api/deck/light-action", json!({"action":"saveScene"})),
        ),
        button(
            "1",
            "1",
            "Recall",
            http_post("/api/deck/light-action", json!({"action":"recallScene"})),
        ),
        button(
            "1",
            "2",
            "Del Scene",
            http_post("/api/deck/light-action", json!({"action":"deleteScene"})),
        ),
        button(
            "1",
            "3",
            "AUDIO >>",
            page_jump(4)
                .into_iter()
                .chain(http_post(
                    "/api/deck/audio-action",
                    json!({"action":"switchToDeckMode","value":"audio"}),
                ))
                .chain(lcd_refreshes(&[
                    "audio_ch_nav",
                    "audio_gain1",
                    "audio_gain2",
                    "audio_gain3",
                ]))
                .collect(),
        ),
        dial(
            "3",
            "0",
            "Light",
            Some("$(SSE ExEd Studio Control Native:lcd_light_nav)"),
            http_post("/api/deck/light-action", json!({"action":"toggleLight"}))
                .into_iter()
                .chain(lcd_refreshes(&[
                    "light_nav",
                    "light_intensity",
                    "light_cct",
                ]))
                .collect(),
            http_post(
                "/api/deck/light-action",
                json!({"action":"selectPrevLight"}),
            ),
            http_post(
                "/api/deck/light-action",
                json!({"action":"selectNextLight"}),
            ),
        ),
        dial(
            "3",
            "1",
            "Intensity",
            Some("$(SSE ExEd Studio Control Native:lcd_light_intensity)"),
            http_post("/api/deck/light-action", json!({"action":"resetIntensity"})),
            http_post("/api/deck/light-action", json!({"action":"intensityDown"})),
            http_post("/api/deck/light-action", json!({"action":"intensityUp"})),
        ),
        dial(
            "3",
            "2",
            "CCT",
            Some("$(SSE ExEd Studio Control Native:lcd_light_cct)"),
            http_post("/api/deck/light-action", json!({"action":"resetCct"})),
            http_post("/api/deck/light-action", json!({"action":"cctDown"})),
            http_post("/api/deck/light-action", json!({"action":"cctUp"})),
        ),
        dial(
            "3",
            "3",
            "Scene",
            Some("$(SSE ExEd Studio Control Native:lcd_scene_nav)"),
            http_post("/api/deck/light-action", json!({"action":"recallScene"})),
            http_post(
                "/api/deck/light-action",
                json!({"action":"selectPrevScene"}),
            ),
            http_post(
                "/api/deck/light-action",
                json!({"action":"selectNextScene"}),
            ),
        ),
    ]
}

fn audio_controls() -> Vec<ControlDef> {
    vec![
        button(
            "0",
            "0",
            "<< LIGHTS",
            page_jump(3)
                .into_iter()
                .chain(http_post(
                    "/api/deck/audio-action",
                    json!({"action":"switchToDeckMode","value":"light"}),
                ))
                .chain(lcd_refreshes(&[
                    "light_nav",
                    "light_intensity",
                    "light_cct",
                    "scene_nav",
                ]))
                .collect(),
        ),
        button(
            "0",
            "1",
            "Mute 1",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"1"}),
            ),
        ),
        button(
            "0",
            "2",
            "Mute 2",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"2"}),
            ),
        ),
        button(
            "0",
            "3",
            "Mute 3",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"3"}),
            ),
        ),
        button(
            "1",
            "0",
            "Mute 4",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"4"}),
            ),
        ),
        button(
            "1",
            "1",
            "48V 1",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"togglePhantom","value":"1"}),
            ),
        ),
        button(
            "1",
            "2",
            "48V 2",
            http_post(
                "/api/deck/audio-action",
                json!({"action":"togglePhantom","value":"2"}),
            ),
        ),
        button(
            "1",
            "3",
            "Recall",
            http_post("/api/deck/audio-action", json!({"action":"recallSnapshot"})),
        ),
        dial(
            "3",
            "0",
            "Ch 1",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_ch_nav)"),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"1"}),
            )
            .into_iter()
            .chain(lcd_refreshes(&["audio_ch_nav", "audio_gain1"]))
            .collect(),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainDown","value":"1"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainUp","value":"1"}),
            ),
        ),
        dial(
            "3",
            "1",
            "Ch 2",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain1)"),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"2"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainDown","value":"2"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainUp","value":"2"}),
            ),
        ),
        dial(
            "3",
            "2",
            "Ch 3",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain2)"),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"3"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainDown","value":"3"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainUp","value":"3"}),
            ),
        ),
        dial(
            "3",
            "3",
            "Ch 4",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain3)"),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"toggleMute","value":"4"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainDown","value":"4"}),
            ),
            http_post(
                "/api/deck/audio-action",
                json!({"action":"gainUp","value":"4"}),
            ),
        ),
    ]
}

fn button(
    row: &'static str,
    col: &'static str,
    label: &'static str,
    down: Vec<Value>,
) -> ControlDef {
    ControlDef {
        row,
        col,
        label,
        is_rotary: false,
        down,
        rotate_left: Vec::new(),
        rotate_right: Vec::new(),
        text_expression: None,
    }
}

fn dial(
    row: &'static str,
    col: &'static str,
    label: &'static str,
    text_expression: Option<&'static str>,
    down: Vec<Value>,
    rotate_left: Vec<Value>,
    rotate_right: Vec<Value>,
) -> ControlDef {
    ControlDef {
        row,
        col,
        label,
        is_rotary: true,
        down,
        rotate_left,
        rotate_right,
        text_expression,
    }
}

fn page_jump(page: i64) -> Vec<Value> {
    vec![json!({
        "id": next_action_id(),
        "instance": "internal",
        "action": "set_page",
        "options": {
            "page": page,
            "controller": "self"
        }
    })]
}

fn http_post(path: &'static str, body: Value) -> Vec<Value> {
    vec![json!({
        "id": next_action_id(),
        "instance": INSTANCE_ID,
        "action": "post",
        "options": {
            "url": path,
            "header": "",
            "contenttype": "application/json",
            "jsonResultDataVariable": "",
            "result_stringify": true,
            "statusCodeVariable": "",
            "body": body.to_string()
        }
    })]
}

fn lcd_refreshes(keys: &[&str]) -> Vec<Value> {
    keys.iter()
        .map(|key| {
            json!({
                "id": next_action_id(),
                "instance": INSTANCE_ID,
                "action": "get",
                "options": {
                    "url": format!("/api/deck/lcd?key={key}"),
                    "header": "",
                    "contenttype": "application/json",
                    "jsonResultDataVariable": format!("lcd_{key}"),
                    "result_stringify": false,
                    "statusCodeVariable": ""
                }
            })
        })
        .collect()
}

fn next_action_id() -> String {
    use std::sync::atomic::{AtomicUsize, Ordering};

    static ACTION_COUNTER: AtomicUsize = AtomicUsize::new(1);
    let next = ACTION_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("act-{next}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn companion_export_contains_native_bridge_instance() {
        let config = generate_companion_config("http://127.0.0.1:38201");
        let prefix = config["instances"][INSTANCE_ID]["config"]["prefix"]
            .as_str()
            .expect("prefix should be a string");
        assert_eq!(prefix, "http://127.0.0.1:38201");
    }

    #[test]
    fn companion_export_uses_override_base_url() {
        let config = generate_companion_config("http://localhost:3000");
        let prefix = config["instances"][INSTANCE_ID]["config"]["prefix"]
            .as_str()
            .expect("prefix should be a string");
        assert_eq!(prefix, "http://localhost:3000");
    }

    #[test]
    fn companion_export_includes_audio_page() {
        let config = generate_companion_config("http://127.0.0.1:38201");
        assert_eq!(
            config["pages"].as_object().map(|pages| pages.len()),
            Some(4)
        );
    }

    #[test]
    fn control_surface_snapshot_matches_legacy_page_model() {
        let snapshot = build_control_surface_snapshot();
        assert_eq!(snapshot.pages.len(), 4);
        assert_eq!(snapshot.pages[0].label, "PROJECTS");
        assert_eq!(snapshot.pages[0].buttons.len(), 8);
        assert_eq!(snapshot.pages[0].dials.len(), 12);
        assert_eq!(snapshot.pages[0].buttons[0].id, "proj-btn-1");
        assert_eq!(snapshot.pages[0].buttons[0].position, 1);
        assert_eq!(
            snapshot.pages[0].buttons[0].url.as_deref(),
            Some("/api/deck/action")
        );
        assert_eq!(
            snapshot.pages[0].buttons[3].page_nav_target.as_deref(),
            Some("TASKS")
        );
        assert_eq!(snapshot.pages[0].buttons[3].method, None);
        assert_eq!(
            snapshot.pages[0].buttons[3]
                .lcd_refresh_keys
                .as_ref()
                .map(Vec::len),
            Some(4)
        );
        assert_eq!(
            snapshot.pages[0].buttons[7].page_nav_target.as_deref(),
            Some("LIGHTS")
        );
        assert_eq!(snapshot.pages[0].buttons[7].method.as_deref(), Some("POST"));
        assert_eq!(snapshot.pages[0].dials[0].id, "proj-dial-1-press");
        assert_eq!(
            snapshot.pages[0].dials[0].lcd_key.as_deref(),
            Some("project_nav")
        );
        assert_eq!(snapshot.pages[3].label, "AUDIO");
        assert!(snapshot.pages[3]
            .buttons
            .iter()
            .any(|control| control.label == "Recall"
                && control.url.as_deref() == Some("/api/deck/audio-action")));
    }
}
