use crate::app_state::APP_SETTINGS_PREFIX;
use crate::commissioning::{LIGHTING_BRIDGE_IP_KEY, LIGHTING_CHECK_ID, LIGHTING_UNIVERSE_KEY};
use crate::lighting_backend::{
    read_default_lighting_inventory, recall_default_lighting_scene, LightingBackendConfig,
};
use crate::storage::{list_settings_by_prefix, open_connection, set_settings_owned};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

const DEFAULT_UNIVERSE: i64 = 1;

const LIGHTING_LAST_RECALLED_SCENE_ID_KEY: &str = "app.lighting.last_recalled_scene_id";
const LIGHTING_LAST_SCENE_RECALL_AT_KEY: &str = "app.lighting.last_scene_recall_at";
const LIGHTING_LAST_ACTION_STATUS_KEY: &str = "app.lighting.last_action_status";
const LIGHTING_LAST_ACTION_CODE_KEY: &str = "app.lighting.last_action_code";
const LIGHTING_LAST_ACTION_MESSAGE_KEY: &str = "app.lighting.last_action_message";

#[derive(Debug, Serialize, Clone)]
pub struct LightingSnapshot {
    pub status: String,
    pub summary: String,
    #[serde(rename = "adapterMode")]
    pub adapter_mode: String,
    #[serde(rename = "bridgeIp")]
    pub bridge_ip: String,
    pub universe: i64,
    #[serde(rename = "enabled")]
    pub enabled: bool,
    #[serde(rename = "connected")]
    pub connected: bool,
    #[serde(rename = "reachable")]
    pub reachable: bool,
    #[serde(rename = "lastRecalledSceneId")]
    pub last_recalled_scene_id: Option<String>,
    #[serde(rename = "lastSceneRecallAt")]
    pub last_scene_recall_at: Option<String>,
    #[serde(rename = "lastActionStatus")]
    pub last_action_status: String,
    #[serde(rename = "lastActionCode")]
    pub last_action_code: Option<String>,
    #[serde(rename = "lastActionMessage")]
    pub last_action_message: Option<String>,
    pub fixtures: Vec<LightingFixtureSnapshot>,
    pub groups: Vec<LightingGroupSnapshot>,
    pub scenes: Vec<LightingSceneSnapshot>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LightingFixtureSnapshot {
    pub id: String,
    pub name: String,
    pub kind: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct LightingGroupSnapshot {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct LightingSceneSnapshot {
    pub id: String,
    pub name: String,
    #[serde(rename = "lastRecalled")]
    pub last_recalled: bool,
    #[serde(rename = "lastRecalledAt")]
    pub last_recalled_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LightingHealthCheck {
    pub ok: bool,
    pub status: String,
    pub summary: String,
    #[serde(rename = "bridgeIp")]
    pub bridge_ip: String,
    pub universe: i64,
    pub reachable: bool,
}

#[derive(Debug, Serialize)]
pub struct LightingSceneRecallResult {
    pub recalled: bool,
    #[serde(rename = "sceneId")]
    pub scene_id: String,
    #[serde(rename = "sceneName")]
    pub scene_name: String,
    #[serde(rename = "recalledAt")]
    pub recalled_at: String,
    #[serde(rename = "fadeDurationSeconds")]
    pub fade_duration_seconds: f64,
    pub summary: String,
}

#[derive(Debug)]
pub enum LightingCommandError {
    Rejected(&'static str, String),
    Storage(String),
}

#[derive(Debug, Clone)]
pub struct LightingSceneRecallRequest {
    pub scene_id: String,
    pub fade_duration_seconds: f64,
}

pub fn parse_lighting_scene_recall_request(
    params: &Value,
) -> Result<LightingSceneRecallRequest, String> {
    let scene_id = params
        .get("sceneId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("sceneId is required"))?;

    let fade_duration_seconds = params
        .get("fadeDurationSeconds")
        .map(|value| {
            value
                .as_f64()
                .ok_or_else(|| String::from("fadeDurationSeconds must be a number"))
        })
        .transpose()?
        .unwrap_or(0.0);

    if !(0.0..=10.0).contains(&fade_duration_seconds) {
        return Err(String::from(
            "fadeDurationSeconds must be between 0 and 10 seconds",
        ));
    }

    Ok(LightingSceneRecallRequest {
        scene_id: String::from(scene_id),
        fade_duration_seconds,
    })
}

pub fn read_lighting_snapshot(settings: &HashMap<String, String>) -> LightingSnapshot {
    let config = resolve_lighting_config(settings);
    let check_status = lighting_check_status(settings);
    let enabled = config.enabled;
    let reachable = check_status == "passed";
    let inventory = read_default_lighting_inventory(&config);
    let last_recalled_scene_id =
        read_optional_setting(settings, LIGHTING_LAST_RECALLED_SCENE_ID_KEY);
    let last_scene_recall_at = read_optional_setting(settings, LIGHTING_LAST_SCENE_RECALL_AT_KEY);
    let last_action_status = read_optional_setting(settings, LIGHTING_LAST_ACTION_STATUS_KEY)
        .unwrap_or_else(|| String::from("idle"));
    let last_action_code = read_optional_setting(settings, LIGHTING_LAST_ACTION_CODE_KEY);
    let last_action_message = read_optional_setting(settings, LIGHTING_LAST_ACTION_MESSAGE_KEY);
    let fixtures = inventory.fixtures;
    let groups = inventory.groups;
    let scenes = inventory
        .scenes
        .into_iter()
        .map(|scene| {
            let last_recalled = last_recalled_scene_id
                .as_deref()
                .map(|value| value == scene.id)
                .unwrap_or(false);
            LightingSceneSnapshot {
                last_recalled_at: if last_recalled {
                    last_scene_recall_at.clone()
                } else {
                    None
                },
                last_recalled,
                ..scene
            }
        })
        .collect::<Vec<_>>();
    let status = if !enabled {
        String::from("unconfigured")
    } else if check_status == "passed" {
        String::from("ready")
    } else if check_status == "failed" {
        String::from("attention")
    } else {
        String::from("not-verified")
    };

    LightingSnapshot {
        summary: lighting_summary(
            &status,
            &config.bridge_ip,
            config.universe,
            fixtures.len(),
            groups.len(),
            scenes.len(),
            last_recalled_scene_id.as_deref(),
            last_scene_recall_at.as_deref(),
            &last_action_status,
            last_action_code.as_deref(),
            last_action_message.as_deref(),
        ),
        status,
        adapter_mode: inventory.adapter_mode,
        bridge_ip: config.bridge_ip,
        universe: config.universe,
        enabled,
        connected: reachable,
        reachable,
        last_recalled_scene_id,
        last_scene_recall_at,
        last_action_status,
        last_action_code,
        last_action_message,
        fixtures,
        groups,
        scenes,
    }
}

pub fn recall_lighting_scene(
    db_path: &Path,
    request: &LightingSceneRecallRequest,
) -> Result<LightingSceneRecallResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let snapshot = read_lighting_snapshot(&app_settings);
    ensure_lighting_action_allowed(db_path, &snapshot)?;
    let config = resolve_lighting_config(&app_settings);
    let inventory = read_default_lighting_inventory(&config);
    let recalled_at = current_timestamp(db_path)?;

    let outcome = recall_default_lighting_scene(
        &config,
        &inventory,
        &request.scene_id,
        request.fade_duration_seconds,
    )
    .map_err(|message| {
        let code = if message.contains("not exposed by the backend") {
            "LIGHTING_SCENE_NOT_FOUND"
        } else {
            "LIGHTING_SCENE_RECALL_FAILED"
        };
        let _ = record_lighting_action_failure(db_path, code, &message);
        LightingCommandError::Rejected(code, message)
    })?;

    persist_lighting_state(
        db_path,
        &[
            (
                String::from(LIGHTING_LAST_RECALLED_SCENE_ID_KEY),
                request.scene_id.clone(),
            ),
            (
                String::from(LIGHTING_LAST_SCENE_RECALL_AT_KEY),
                recalled_at.clone(),
            ),
            (
                String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
                String::from("succeeded"),
            ),
            (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
            (
                String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
                outcome.summary.clone(),
            ),
        ],
    )?;

    Ok(LightingSceneRecallResult {
        recalled: true,
        scene_id: request.scene_id.clone(),
        scene_name: outcome.scene_name,
        recalled_at,
        fade_duration_seconds: request.fade_duration_seconds,
        summary: outcome.summary,
    })
}

pub fn build_lighting_health_check(settings: &HashMap<String, String>) -> LightingHealthCheck {
    let snapshot = read_lighting_snapshot(settings);
    LightingHealthCheck {
        ok: snapshot.status == "ready",
        status: snapshot.status.clone(),
        summary: snapshot.summary.clone(),
        bridge_ip: snapshot.bridge_ip,
        universe: snapshot.universe,
        reachable: snapshot.reachable,
    }
}

fn load_lighting_settings(db_path: &Path) -> Result<HashMap<String, String>, LightingCommandError> {
    list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
        .map_err(|error| LightingCommandError::Storage(error.to_string()))
}

fn resolve_lighting_config(settings: &HashMap<String, String>) -> LightingBackendConfig {
    let bridge_ip = settings
        .get(LIGHTING_BRIDGE_IP_KEY)
        .cloned()
        .unwrap_or_default();
    let universe = settings
        .get(LIGHTING_UNIVERSE_KEY)
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (1..=63999).contains(value))
        .unwrap_or(DEFAULT_UNIVERSE);

    LightingBackendConfig {
        enabled: !bridge_ip.trim().is_empty(),
        bridge_ip,
        universe,
    }
}

fn ensure_lighting_action_allowed(
    db_path: &Path,
    snapshot: &LightingSnapshot,
) -> Result<(), LightingCommandError> {
    let rejected = match snapshot.status.as_str() {
        "ready" => None,
        "attention" => Some((
            "LIGHTING_PROBE_FAILED",
            String::from(
                "Lighting transport is in attention state. Fix the bridge connection and rerun the commissioning lighting probe before recalling scenes.",
            ),
        )),
        "not-verified" => Some((
            "LIGHTING_NOT_VERIFIED",
            String::from(
                "Run the commissioning lighting probe before recalling native lighting scenes.",
            ),
        )),
        _ => Some((
            "LIGHTING_UNCONFIGURED",
            String::from(
                "Lighting bridge settings are incomplete. Configure the bridge and universe before recalling native lighting scenes.",
            ),
        )),
    };

    if let Some((code, message)) = rejected {
        record_lighting_action_failure(db_path, code, &message)?;
        return Err(LightingCommandError::Rejected(code, message));
    }

    Ok(())
}

fn persist_lighting_state(
    db_path: &Path,
    updates: &[(String, String)],
) -> Result<(), LightingCommandError> {
    set_settings_owned(db_path, updates)
        .map_err(|error| LightingCommandError::Storage(error.to_string()))
}

fn record_lighting_action_failure(
    db_path: &Path,
    code: &str,
    message: &str,
) -> Result<(), LightingCommandError> {
    persist_lighting_state(
        db_path,
        &[
            (
                String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
                String::from("failed"),
            ),
            (
                String::from(LIGHTING_LAST_ACTION_CODE_KEY),
                String::from(code),
            ),
            (
                String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
                String::from(message),
            ),
        ],
    )
}

fn current_timestamp(db_path: &Path) -> Result<String, LightingCommandError> {
    let connection = open_connection(db_path)
        .map_err(|error| LightingCommandError::Storage(error.to_string()))?;
    connection
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
            row.get(0)
        })
        .map_err(|error| LightingCommandError::Storage(error.to_string()))
}

fn lighting_check_status(settings: &HashMap<String, String>) -> String {
    settings
        .get(&format!(
            "app.commissioning.check.{LIGHTING_CHECK_ID}.status"
        ))
        .cloned()
        .unwrap_or_else(|| String::from("idle"))
}

fn read_optional_setting(settings: &HashMap<String, String>, key: &str) -> Option<String> {
    settings
        .get(key)
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn lighting_summary(
    status: &str,
    bridge_ip: &str,
    universe: i64,
    fixture_count: usize,
    group_count: usize,
    scene_count: usize,
    last_recalled_scene_id: Option<&str>,
    last_scene_recall_at: Option<&str>,
    last_action_status: &str,
    last_action_code: Option<&str>,
    last_action_message: Option<&str>,
) -> String {
    let transport_summary = match status {
        "ready" => format!(
            "Bridge {} responded on universe {}. Simulated inventory exposes {} fixtures, {} groups, and {} scenes for native lighting development.",
            bridge_ip, universe, fixture_count, group_count, scene_count
        ),
        "attention" => format!(
            "Bridge {} did not respond on universe {}. Simulated inventory still exposes {} fixtures, {} groups, and {} scenes while connectivity is corrected.",
            bridge_ip, universe, fixture_count, group_count, scene_count
        ),
        "not-verified" => format!(
            "Bridge {} is configured on universe {}. Simulated inventory exposes {} fixtures, {} groups, and {} scenes before the native lighting probe runs.",
            bridge_ip, universe, fixture_count, group_count, scene_count
        ),
        _ => String::from(
            "No lighting bridge is configured yet. Run the commissioning lighting probe before adapter work lands.",
        ),
    };

    let recall_summary = match last_recalled_scene_id {
        Some(scene_id) => format!(
            " Last scene recall: {}{}.",
            scene_id,
            last_scene_recall_at
                .map(|timestamp| format!(" at {timestamp}"))
                .unwrap_or_default()
        ),
        None => String::from(" No lighting scene recall has been recorded yet."),
    };

    let action_summary = match last_action_status {
        "failed" => format!(
            " Last action failed{}{}",
            last_action_code
                .map(|code| format!(" ({code})"))
                .unwrap_or_default(),
            last_action_message
                .map(|message| format!(": {message}."))
                .unwrap_or_else(|| String::from("."))
        ),
        "succeeded" => last_action_message
            .map(|message| format!(" Last action: {message}."))
            .unwrap_or_default(),
        _ => String::new(),
    };

    format!("{transport_summary}{recall_summary}{action_summary}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{initialize_database, set_settings_owned};
    use std::fs;
    use std::path::PathBuf;
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
                "studio-control-engine-lighting-{label}-{}-{unique}",
                process::id()
            ));
            fs::create_dir_all(&path).expect("test dir should be created");
            Self { path }
        }

        fn db_path(&self) -> PathBuf {
            self.path.join("native.sqlite3")
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn lighting_snapshot_reports_unconfigured_when_no_bridge_exists() {
        let snapshot = read_lighting_snapshot(&HashMap::new());
        assert_eq!(snapshot.status, "unconfigured");
        assert!(!snapshot.enabled);
        assert!(!snapshot.connected);
    }

    #[test]
    fn lighting_snapshot_reports_ready_when_probe_passed() {
        let settings = HashMap::from([
            (
                String::from(LIGHTING_BRIDGE_IP_KEY),
                String::from("2.0.0.10"),
            ),
            (String::from(LIGHTING_UNIVERSE_KEY), String::from("1")),
            (
                String::from("app.commissioning.check.lighting.status"),
                String::from("passed"),
            ),
        ]);

        let snapshot = read_lighting_snapshot(&settings);
        assert_eq!(snapshot.status, "ready");
        assert!(snapshot.reachable);
        assert!(snapshot.connected);
        assert_eq!(snapshot.fixtures.len(), 4);
        assert_eq!(snapshot.groups.len(), 2);
        assert_eq!(snapshot.scenes.len(), 3);
    }

    #[test]
    fn lighting_scene_recall_rejects_until_probe_passes() {
        let test_dir = TestDir::new("scene-rejects");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");
        set_settings_owned(
            test_dir.db_path().as_path(),
            &[(
                String::from(LIGHTING_BRIDGE_IP_KEY),
                String::from("2.0.0.10"),
            )],
        )
        .expect("bridge ip should persist");

        let error = recall_lighting_scene(
            test_dir.db_path().as_path(),
            &LightingSceneRecallRequest {
                scene_id: String::from("scene-prep"),
                fade_duration_seconds: 0.0,
            },
        )
        .expect_err("scene recall should reject");

        match error {
            LightingCommandError::Rejected(code, _) => assert_eq!(code, "LIGHTING_NOT_VERIFIED"),
            other => panic!("unexpected error: {other:?}"),
        }
    }

    #[test]
    fn lighting_scene_recall_updates_last_recalled_scene() {
        let test_dir = TestDir::new("scene-ready");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");
        set_settings_owned(
            test_dir.db_path().as_path(),
            &[
                (
                    String::from(LIGHTING_BRIDGE_IP_KEY),
                    String::from("2.0.0.10"),
                ),
                (
                    String::from("app.commissioning.check.lighting.status"),
                    String::from("passed"),
                ),
            ],
        )
        .expect("lighting state should persist");

        let result = recall_lighting_scene(
            test_dir.db_path().as_path(),
            &LightingSceneRecallRequest {
                scene_id: String::from("scene-stream"),
                fade_duration_seconds: 1.5,
            },
        )
        .expect("scene recall should succeed");

        assert!(result.recalled);
        assert_eq!(result.scene_name, "Stream");
        assert_eq!(result.fade_duration_seconds, 1.5);

        let settings = list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
            .expect("settings should load");
        let snapshot = read_lighting_snapshot(&settings);
        assert_eq!(
            snapshot.last_recalled_scene_id.as_deref(),
            Some("scene-stream")
        );
        assert!(snapshot
            .scenes
            .iter()
            .any(|entry| entry.id == "scene-stream" && entry.last_recalled));
        assert_eq!(snapshot.last_action_status, "succeeded");
    }
}
