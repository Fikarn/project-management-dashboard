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

pub fn export_companion_config(
    runtime: &RuntimeContext,
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
    fs::create_dir_all(&export_dir).map_err(|error| ExportCommandError::Storage(error.to_string()))?;
    let timestamp = current_export_timestamp();
    let file_name = format!("sse-exed-studio-control-native-{timestamp}.companionconfig");
    let path = export_dir.join(&file_name);
    let config = generate_companion_config(&runtime.control_surface_bridge.base_url);
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
        base_url: runtime.control_surface_bridge.base_url.clone(),
        page_count,
        action_count,
    })
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
    pages.insert(String::from("1"), build_page("PROJECTS", project_controls()));
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
        button("0", "0", "All", http_post("/api/deck/action", json!({"action":"setFilter","value":"all"}))),
        button("0", "1", "To Do", http_post("/api/deck/action", json!({"action":"setFilter","value":"todo"}))),
        button("0", "2", "In Prog", http_post("/api/deck/action", json!({"action":"setFilter","value":"in-progress"}))),
        button("0", "3", "TASKS >>", page_jump(2).into_iter().chain(lcd_refreshes(&["project_nav","task_nav","project_status","project_priority"])).collect()),
        button("1", "0", "Blocked", http_post("/api/deck/action", json!({"action":"setFilter","value":"blocked"}))),
        button("1", "1", "Done", http_post("/api/deck/action", json!({"action":"setFilter","value":"done"}))),
        button("1", "2", "New Proj", http_post("/api/deck/action", json!({"action":"createProject"}))),
        button(
            "1",
            "3",
            "LIGHTS >>",
            page_jump(3)
                .into_iter()
                .chain(http_post("/api/deck/light-action", json!({"action":"switchToDeckMode","value":"light"})))
                .chain(lcd_refreshes(&["light_nav","light_intensity","light_cct","scene_nav"]))
                .collect(),
        ),
        dial(
            "3",
            "0",
            "Project",
            Some("$(SSE ExEd Studio Control Native:lcd_project_nav)"),
            http_post("/api/deck/action", json!({"action":"openDetail"}))
                .into_iter()
                .chain(lcd_refreshes(&["project_nav","project_status","project_priority","task_nav","sort_mode"]))
                .collect(),
            http_post("/api/deck/action", json!({"action":"selectPrevProject"})),
            http_post("/api/deck/action", json!({"action":"selectNextProject"})),
        ),
        dial(
            "3",
            "1",
            "Status",
            Some("$(SSE ExEd Studio Control Native:lcd_project_status)"),
            http_post("/api/deck/action", json!({"action":"setStatus","value":"in-progress"})),
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
        button("0", "1", "Timer", http_post("/api/deck/action", json!({"action":"toggleTimer"}))),
        button("0", "2", "Complete", http_post("/api/deck/action", json!({"action":"toggleTaskComplete"}))),
        button("0", "3", "In Prog", http_post("/api/deck/action", json!({"action":"setStatus","value":"in-progress"}))),
        button("1", "0", "To Do", http_post("/api/deck/action", json!({"action":"setStatus","value":"todo"}))),
        button("1", "1", "Blocked", http_post("/api/deck/action", json!({"action":"setStatus","value":"blocked"}))),
        button("1", "2", "Done", http_post("/api/deck/action", json!({"action":"setStatus","value":"done"}))),
        button("1", "3", "New Proj", http_post("/api/deck/action", json!({"action":"createProject"}))),
        dial(
            "3",
            "0",
            "Project",
            Some("$(SSE ExEd Studio Control Native:lcd_project_nav)"),
            http_post("/api/deck/action", json!({"action":"openDetail"}))
                .into_iter()
                .chain(lcd_refreshes(&["project_nav","project_status","project_priority","task_nav"]))
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
            http_post("/api/deck/action", json!({"action":"setStatus","value":"in-progress"})),
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
                .chain(http_post("/api/deck/light-action", json!({"action":"switchToDeckMode","value":"project"})))
                .chain(lcd_refreshes(&["project_nav","project_status","project_priority","sort_mode"]))
                .collect(),
        ),
        button("0", "1", "Toggle", http_post("/api/deck/light-action", json!({"action":"toggleLight"}))),
        button("0", "2", "All On", http_post("/api/deck/light-action", json!({"action":"allOn"}))),
        button("0", "3", "All Off", http_post("/api/deck/light-action", json!({"action":"allOff"}))),
        button("1", "0", "Save", http_post("/api/deck/light-action", json!({"action":"saveScene"}))),
        button("1", "1", "Recall", http_post("/api/deck/light-action", json!({"action":"recallScene"}))),
        button("1", "2", "Del Scene", http_post("/api/deck/light-action", json!({"action":"deleteScene"}))),
        button(
            "1",
            "3",
            "AUDIO >>",
            page_jump(4)
                .into_iter()
                .chain(http_post("/api/deck/audio-action", json!({"action":"switchToDeckMode","value":"audio"})))
                .chain(lcd_refreshes(&["audio_ch_nav","audio_gain1","audio_gain2","audio_gain3"]))
                .collect(),
        ),
        dial(
            "3",
            "0",
            "Light",
            Some("$(SSE ExEd Studio Control Native:lcd_light_nav)"),
            http_post("/api/deck/light-action", json!({"action":"toggleLight"}))
                .into_iter()
                .chain(lcd_refreshes(&["light_nav","light_intensity","light_cct"]))
                .collect(),
            http_post("/api/deck/light-action", json!({"action":"selectPrevLight"})),
            http_post("/api/deck/light-action", json!({"action":"selectNextLight"})),
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
            http_post("/api/deck/light-action", json!({"action":"selectPrevScene"})),
            http_post("/api/deck/light-action", json!({"action":"selectNextScene"})),
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
                .chain(http_post("/api/deck/audio-action", json!({"action":"switchToDeckMode","value":"light"})))
                .chain(lcd_refreshes(&["light_nav","light_intensity","light_cct","scene_nav"]))
                .collect(),
        ),
        button("0", "1", "Mute 1", http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"1"}))),
        button("0", "2", "Mute 2", http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"2"}))),
        button("0", "3", "Mute 3", http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"3"}))),
        button("1", "0", "Mute 4", http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"4"}))),
        button("1", "1", "48V 1", http_post("/api/deck/audio-action", json!({"action":"togglePhantom","value":"1"}))),
        button("1", "2", "48V 2", http_post("/api/deck/audio-action", json!({"action":"togglePhantom","value":"2"}))),
        button("1", "3", "Recall", http_post("/api/deck/audio-action", json!({"action":"recallSnapshot"}))),
        dial(
            "3",
            "0",
            "Ch 1",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_ch_nav)"),
            http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"1"}))
                .into_iter()
                .chain(lcd_refreshes(&["audio_ch_nav","audio_gain1"]))
                .collect(),
            http_post("/api/deck/audio-action", json!({"action":"gainDown","value":"1"})),
            http_post("/api/deck/audio-action", json!({"action":"gainUp","value":"1"})),
        ),
        dial(
            "3",
            "1",
            "Ch 2",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain1)"),
            http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"2"})),
            http_post("/api/deck/audio-action", json!({"action":"gainDown","value":"2"})),
            http_post("/api/deck/audio-action", json!({"action":"gainUp","value":"2"})),
        ),
        dial(
            "3",
            "2",
            "Ch 3",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain2)"),
            http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"3"})),
            http_post("/api/deck/audio-action", json!({"action":"gainDown","value":"3"})),
            http_post("/api/deck/audio-action", json!({"action":"gainUp","value":"3"})),
        ),
        dial(
            "3",
            "3",
            "Ch 4",
            Some("$(SSE ExEd Studio Control Native:lcd_audio_gain3)"),
            http_post("/api/deck/audio-action", json!({"action":"toggleMute","value":"4"})),
            http_post("/api/deck/audio-action", json!({"action":"gainDown","value":"4"})),
            http_post("/api/deck/audio-action", json!({"action":"gainUp","value":"4"})),
        ),
    ]
}

fn button(row: &'static str, col: &'static str, label: &'static str, down: Vec<Value>) -> ControlDef {
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
    fn companion_export_includes_audio_page() {
        let config = generate_companion_config("http://127.0.0.1:38201");
        assert_eq!(config["pages"].as_object().map(|pages| pages.len()), Some(4));
    }
}
