use crate::bootstrap::RuntimeContext;
use crate::planning_settings::{
    DASHBOARD_VIEW_KEY, DECK_MODE_KEY, PLANNING_SETTINGS_PREFIX, SELECTED_PROJECT_ID_KEY,
    SELECTED_TASK_ID_KEY, SORT_BY_KEY, VIEW_FILTER_KEY,
};
use crate::shell_settings::ShellSettingsSnapshot;
use serde_json::{json, Value};
use std::collections::HashMap;

pub const APP_SETTINGS_PREFIX: &str = "app.";
pub const COMMISSIONING_COMPLETED_KEY: &str = "app.commissioning.completed";
pub const COMMISSIONING_STAGE_KEY: &str = "app.commissioning.stage";
pub const HARDWARE_PROFILE_KEY: &str = "app.hardware.profile";

const DEFAULT_COMMISSIONING_COMPLETED: bool = false;
const DEFAULT_COMMISSIONING_STAGE: &str = "setup-required";
const DEFAULT_HARDWARE_PROFILE: &str = "sse-fixed-studio-v1";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommissioningSnapshot {
    pub has_completed_setup: bool,
    pub stage: String,
    pub hardware_profile: String,
}

impl Default for CommissioningSnapshot {
    fn default() -> Self {
        Self {
            has_completed_setup: DEFAULT_COMMISSIONING_COMPLETED,
            stage: String::from(DEFAULT_COMMISSIONING_STAGE),
            hardware_profile: String::from(DEFAULT_HARDWARE_PROFILE),
        }
    }
}

impl CommissioningSnapshot {
    pub fn from_settings(settings: &HashMap<String, String>) -> Self {
        let mut snapshot = Self::default();

        if let Some(completed) = settings
            .get(COMMISSIONING_COMPLETED_KEY)
            .and_then(|value| parse_bool(value))
        {
            snapshot.has_completed_setup = completed;
        }

        if let Some(stage) = settings.get(COMMISSIONING_STAGE_KEY) {
            if is_valid_commissioning_stage(stage) {
                snapshot.stage = stage.clone();
            }
        }

        if let Some(profile) = settings.get(HARDWARE_PROFILE_KEY) {
            if !profile.trim().is_empty() {
                snapshot.hardware_profile = profile.clone();
            }
        }

        snapshot
    }

    pub fn startup_surface(&self) -> &'static str {
        if self.has_completed_setup {
            "dashboard"
        } else {
            "commissioning"
        }
    }
}

pub fn default_app_settings_entries() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            COMMISSIONING_COMPLETED_KEY,
            if DEFAULT_COMMISSIONING_COMPLETED {
                "true"
            } else {
                "false"
            },
        ),
        (COMMISSIONING_STAGE_KEY, DEFAULT_COMMISSIONING_STAGE),
        (HARDWARE_PROFILE_KEY, DEFAULT_HARDWARE_PROFILE),
    ]
}

pub fn build_app_snapshot(
    runtime: &RuntimeContext,
    shell_settings: &HashMap<String, String>,
    app_settings: &HashMap<String, String>,
    planning_settings: &HashMap<String, String>,
) -> Value {
    let shell = ShellSettingsSnapshot::from_settings(shell_settings);
    let commissioning = CommissioningSnapshot::from_settings(app_settings);

    json!({
        "runtime": {
            "protocol": runtime.protocol_version,
            "engineVersion": env!("CARGO_PKG_VERSION"),
            "paths": {
                "appDataDir": runtime.app_data_dir.display().to_string(),
                "logsDir": runtime.logs_dir.display().to_string(),
                "logFilePath": runtime.log_file_path.display().to_string(),
                "dbPath": runtime.db_path.display().to_string(),
                "backupDir": runtime.backups_dir.display().to_string(),
            }
        },
        "shell": {
            "workspace": shell.workspace,
            "window": {
                "width": shell.window_width,
                "height": shell.window_height,
                "maximized": shell.window_maximized,
            }
        },
        "commissioning": {
            "hasCompletedSetup": commissioning.has_completed_setup,
            "stage": commissioning.stage,
            "hardwareProfile": commissioning.hardware_profile,
        },
        "planning": {
            "settingsPrefix": PLANNING_SETTINGS_PREFIX,
            "viewFilter": planning_settings.get(VIEW_FILTER_KEY).cloned().unwrap_or_else(|| String::from("all")),
            "sortBy": planning_settings.get(SORT_BY_KEY).cloned().unwrap_or_else(|| String::from("manual")),
            "dashboardView": planning_settings.get(DASHBOARD_VIEW_KEY).cloned().unwrap_or_else(|| String::from("kanban")),
            "deckMode": planning_settings.get(DECK_MODE_KEY).cloned().unwrap_or_else(|| String::from("project")),
            "selectedProjectId": planning_settings.get(SELECTED_PROJECT_ID_KEY).cloned(),
            "selectedTaskId": planning_settings.get(SELECTED_TASK_ID_KEY).cloned(),
        },
        "startup": {
            "targetSurface": commissioning.startup_surface(),
            "operatorUiAllowed": commissioning.has_completed_setup,
        }
    })
}

pub fn parse_commissioning_update(params: &Value) -> Result<Vec<(&'static str, String)>, String> {
    let mut updates = Vec::new();

    if let Some(stage_value) = params.get("stage") {
        let stage = stage_value
            .as_str()
            .ok_or_else(|| String::from("stage must be a string"))?;

        if !is_valid_commissioning_stage(stage) {
            return Err(String::from(
                "stage must be one of: setup-required, in-progress, ready",
            ));
        }

        updates.push((COMMISSIONING_STAGE_KEY, stage.to_string()));
        updates.push((
            COMMISSIONING_COMPLETED_KEY,
            (stage == "ready").to_string(),
        ));
    }

    if let Some(profile_value) = params.get("hardwareProfile") {
        let profile = profile_value
            .as_str()
            .ok_or_else(|| String::from("hardwareProfile must be a string"))?
            .trim();

        if profile.is_empty() {
            return Err(String::from("hardwareProfile must be a non-empty string"));
        }

        updates.push((HARDWARE_PROFILE_KEY, profile.to_string()));
    }

    if updates.is_empty() {
        return Err(String::from(
            "commissioning.update requires one or more supported fields",
        ));
    }

    Ok(updates)
}

fn parse_bool(value: &str) -> Option<bool> {
    match value {
        "true" => Some(true),
        "false" => Some(false),
        _ => None,
    }
}

fn is_valid_commissioning_stage(stage: &str) -> bool {
    matches!(stage, "setup-required" | "in-progress" | "ready")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commissioning_defaults_block_operator_ui() {
        let settings = HashMap::new();
        let snapshot = CommissioningSnapshot::from_settings(&settings);

        assert!(!snapshot.has_completed_setup);
        assert_eq!(snapshot.stage, "setup-required");
        assert_eq!(snapshot.hardware_profile, "sse-fixed-studio-v1");
        assert_eq!(snapshot.startup_surface(), "commissioning");
    }

    #[test]
    fn commissioning_snapshot_accepts_ready_state() {
        let settings = HashMap::from([
            (
                String::from(COMMISSIONING_COMPLETED_KEY),
                String::from("true"),
            ),
            (String::from(COMMISSIONING_STAGE_KEY), String::from("ready")),
            (
                String::from(HARDWARE_PROFILE_KEY),
                String::from("sse-fixed-studio-v2"),
            ),
        ]);

        let snapshot = CommissioningSnapshot::from_settings(&settings);

        assert!(snapshot.has_completed_setup);
        assert_eq!(snapshot.stage, "ready");
        assert_eq!(snapshot.hardware_profile, "sse-fixed-studio-v2");
        assert_eq!(snapshot.startup_surface(), "dashboard");
    }

    #[test]
    fn commissioning_update_accepts_stage_and_profile() {
        let params = json!({
            "stage": "in-progress",
            "hardwareProfile": "sse-fixed-studio-v2"
        });

        let updates = parse_commissioning_update(&params).expect("commissioning update should parse");

        assert_eq!(
            updates,
            vec![
                (COMMISSIONING_STAGE_KEY, String::from("in-progress")),
                (COMMISSIONING_COMPLETED_KEY, String::from("false")),
                (HARDWARE_PROFILE_KEY, String::from("sse-fixed-studio-v2")),
            ]
        );
    }

    #[test]
    fn commissioning_update_rejects_empty_profile() {
        let params = json!({
            "hardwareProfile": "   "
        });

        let error = parse_commissioning_update(&params)
            .expect_err("empty hardware profile should be rejected");
        assert_eq!(error, "hardwareProfile must be a non-empty string");
    }
}
