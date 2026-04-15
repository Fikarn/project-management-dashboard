use serde_json::{json, Value};
use std::collections::HashMap;

pub const SHELL_SETTINGS_PREFIX: &str = "shell.";
pub const WORKSPACE_KEY: &str = "shell.workspace";
pub const WINDOW_WIDTH_KEY: &str = "shell.window.width";
pub const WINDOW_HEIGHT_KEY: &str = "shell.window.height";
pub const WINDOW_MAXIMIZED_KEY: &str = "shell.window.maximized";

pub const DEFAULT_WORKSPACE: &str = "planning";
pub const DEFAULT_WINDOW_WIDTH: i64 = 1280;
pub const DEFAULT_WINDOW_HEIGHT: i64 = 800;
pub const DEFAULT_WINDOW_MAXIMIZED: bool = false;

const MIN_WINDOW_WIDTH: i64 = 800;
const MAX_WINDOW_WIDTH: i64 = 8192;
const MIN_WINDOW_HEIGHT: i64 = 600;
const MAX_WINDOW_HEIGHT: i64 = 4320;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellSettingsSnapshot {
    pub workspace: String,
    pub window_width: i64,
    pub window_height: i64,
    pub window_maximized: bool,
}

impl Default for ShellSettingsSnapshot {
    fn default() -> Self {
        Self {
            workspace: String::from(DEFAULT_WORKSPACE),
            window_width: DEFAULT_WINDOW_WIDTH,
            window_height: DEFAULT_WINDOW_HEIGHT,
            window_maximized: DEFAULT_WINDOW_MAXIMIZED,
        }
    }
}

impl ShellSettingsSnapshot {
    pub fn from_settings(settings: &HashMap<String, String>) -> Self {
        let mut snapshot = Self::default();

        if let Some(workspace) = settings.get(WORKSPACE_KEY) {
            if is_valid_workspace(workspace) {
                snapshot.workspace = workspace.clone();
            }
        }

        if let Some(width) = settings
            .get(WINDOW_WIDTH_KEY)
            .and_then(|value| parse_window_dimension(value, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH))
        {
            snapshot.window_width = width;
        }

        if let Some(height) = settings
            .get(WINDOW_HEIGHT_KEY)
            .and_then(|value| parse_window_dimension(value, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT))
        {
            snapshot.window_height = height;
        }

        if let Some(maximized) = settings
            .get(WINDOW_MAXIMIZED_KEY)
            .and_then(|value| parse_bool(value))
        {
            snapshot.window_maximized = maximized;
        }

        snapshot
    }

    pub fn to_response_payload(&self, settings: &HashMap<String, String>) -> Value {
        json!({
            "settings": settings,
            "shell": {
                "workspace": self.workspace,
                "window": {
                    "width": self.window_width,
                    "height": self.window_height,
                    "maximized": self.window_maximized,
                }
            }
        })
    }
}

pub fn default_settings_entries() -> Vec<(&'static str, &'static str)> {
    vec![
        (WORKSPACE_KEY, DEFAULT_WORKSPACE),
        (WINDOW_WIDTH_KEY, "1280"),
        (WINDOW_HEIGHT_KEY, "800"),
        (WINDOW_MAXIMIZED_KEY, "false"),
    ]
}

pub fn parse_settings_update(params: &Value) -> Result<Vec<(&'static str, String)>, String> {
    let mut updates = Vec::new();

    if let Some(workspace_value) = params.get("workspace") {
        let workspace = workspace_value
            .as_str()
            .ok_or_else(|| String::from("workspace must be a string"))?;

        if !is_valid_workspace(workspace) {
            return Err(String::from(
                "workspace must be one of: planning, lighting, audio, setup",
            ));
        }

        updates.push((WORKSPACE_KEY, workspace.to_string()));
    }

    if let Some(window_value) = params.get("window") {
        let window = window_value
            .as_object()
            .ok_or_else(|| String::from("window must be an object"))?;

        if let Some(width_value) = window.get("width") {
            let width = width_value
                .as_i64()
                .ok_or_else(|| String::from("window.width must be an integer"))?;
            validate_window_dimension(width, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH, "window.width")?;
            updates.push((WINDOW_WIDTH_KEY, width.to_string()));
        }

        if let Some(height_value) = window.get("height") {
            let height = height_value
                .as_i64()
                .ok_or_else(|| String::from("window.height must be an integer"))?;
            validate_window_dimension(
                height,
                MIN_WINDOW_HEIGHT,
                MAX_WINDOW_HEIGHT,
                "window.height",
            )?;
            updates.push((WINDOW_HEIGHT_KEY, height.to_string()));
        }

        if let Some(maximized_value) = window.get("maximized") {
            let maximized = maximized_value
                .as_bool()
                .ok_or_else(|| String::from("window.maximized must be a boolean"))?;
            updates.push((WINDOW_MAXIMIZED_KEY, maximized.to_string()));
        }
    }

    if updates.is_empty() {
        return Err(String::from(
            "settings.update requires one or more supported fields",
        ));
    }

    Ok(updates)
}

pub fn is_valid_workspace(workspace: &str) -> bool {
    matches!(workspace, "planning" | "lighting" | "audio" | "setup")
}

fn parse_window_dimension(value: &str, minimum: i64, maximum: i64) -> Option<i64> {
    let parsed = value.parse::<i64>().ok()?;
    if parsed < minimum || parsed > maximum {
        return None;
    }

    Some(parsed)
}

fn parse_bool(value: &str) -> Option<bool> {
    match value {
        "true" => Some(true),
        "false" => Some(false),
        _ => None,
    }
}

fn validate_window_dimension(
    value: i64,
    minimum: i64,
    maximum: i64,
    name: &str,
) -> Result<(), String> {
    if value < minimum || value > maximum {
        return Err(format!("{name} must be between {minimum} and {maximum}"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_uses_defaults_when_values_are_missing() {
        let settings = HashMap::new();
        let snapshot = ShellSettingsSnapshot::from_settings(&settings);

        assert_eq!(snapshot.workspace, DEFAULT_WORKSPACE);
        assert_eq!(snapshot.window_width, DEFAULT_WINDOW_WIDTH);
        assert_eq!(snapshot.window_height, DEFAULT_WINDOW_HEIGHT);
        assert_eq!(snapshot.window_maximized, DEFAULT_WINDOW_MAXIMIZED);
    }

    #[test]
    fn snapshot_parses_valid_window_settings() {
        let settings = HashMap::from([
            (String::from(WORKSPACE_KEY), String::from("audio")),
            (String::from(WINDOW_WIDTH_KEY), String::from("1440")),
            (String::from(WINDOW_HEIGHT_KEY), String::from("900")),
            (String::from(WINDOW_MAXIMIZED_KEY), String::from("true")),
        ]);

        let snapshot = ShellSettingsSnapshot::from_settings(&settings);

        assert_eq!(snapshot.workspace, "audio");
        assert_eq!(snapshot.window_width, 1440);
        assert_eq!(snapshot.window_height, 900);
        assert!(snapshot.window_maximized);
    }

    #[test]
    fn settings_update_accepts_workspace_and_window_state() {
        let params = json!({
            "workspace": "lighting",
            "window": {
                "width": 1600,
                "height": 900,
                "maximized": true
            }
        });

        let updates = parse_settings_update(&params).expect("updates should parse");

        assert_eq!(
            updates,
            vec![
                (WORKSPACE_KEY, String::from("lighting")),
                (WINDOW_WIDTH_KEY, String::from("1600")),
                (WINDOW_HEIGHT_KEY, String::from("900")),
                (WINDOW_MAXIMIZED_KEY, String::from("true")),
            ]
        );
    }

    #[test]
    fn settings_update_rejects_invalid_window_width() {
        let params = json!({
            "window": {
                "width": 200
            }
        });

        let error = parse_settings_update(&params).expect_err("width should be rejected");
        assert_eq!(error, "window.width must be between 800 and 8192");
    }
}
