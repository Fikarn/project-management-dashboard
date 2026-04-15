use crate::app_state::APP_SETTINGS_PREFIX;
use crate::audio_backend::{
    read_default_audio_inventory, recall_default_audio_snapshot, sync_default_audio_console,
    AudioBackendConfig,
};
use crate::commissioning::{
    AUDIO_CHECK_ID, AUDIO_RECEIVE_PORT_KEY, AUDIO_SEND_HOST_KEY, AUDIO_SEND_PORT_KEY,
};
use crate::storage::{list_settings_by_prefix, open_connection, set_settings_owned};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

const DEFAULT_SEND_HOST: &str = "127.0.0.1";
const DEFAULT_SEND_PORT: i64 = 7001;
const DEFAULT_RECEIVE_PORT: i64 = 9001;

const AUDIO_CONSOLE_STATE_CONFIDENCE_KEY: &str = "app.audio.console_state_confidence";
const AUDIO_LAST_CONSOLE_SYNC_AT_KEY: &str = "app.audio.last_console_sync_at";
const AUDIO_LAST_CONSOLE_SYNC_REASON_KEY: &str = "app.audio.last_console_sync_reason";
const AUDIO_LAST_RECALLED_SNAPSHOT_ID_KEY: &str = "app.audio.last_recalled_snapshot_id";
const AUDIO_LAST_SNAPSHOT_RECALL_AT_KEY: &str = "app.audio.last_snapshot_recall_at";
const AUDIO_LAST_ACTION_STATUS_KEY: &str = "app.audio.last_action_status";
const AUDIO_LAST_ACTION_CODE_KEY: &str = "app.audio.last_action_code";
const AUDIO_LAST_ACTION_MESSAGE_KEY: &str = "app.audio.last_action_message";

#[derive(Debug, Serialize, Clone)]
pub struct AudioSnapshot {
    pub status: String,
    pub summary: String,
    #[serde(rename = "adapterMode")]
    pub adapter_mode: String,
    #[serde(rename = "sendHost")]
    pub send_host: String,
    #[serde(rename = "sendPort")]
    pub send_port: i64,
    #[serde(rename = "receivePort")]
    pub receive_port: i64,
    pub connected: bool,
    pub verified: bool,
    #[serde(rename = "meteringState")]
    pub metering_state: String,
    #[serde(rename = "consoleStateConfidence")]
    pub console_state_confidence: String,
    #[serde(rename = "lastConsoleSyncAt")]
    pub last_console_sync_at: Option<String>,
    #[serde(rename = "lastConsoleSyncReason")]
    pub last_console_sync_reason: Option<String>,
    #[serde(rename = "lastRecalledSnapshotId")]
    pub last_recalled_snapshot_id: Option<String>,
    #[serde(rename = "lastSnapshotRecallAt")]
    pub last_snapshot_recall_at: Option<String>,
    #[serde(rename = "lastActionStatus")]
    pub last_action_status: String,
    #[serde(rename = "lastActionCode")]
    pub last_action_code: Option<String>,
    #[serde(rename = "lastActionMessage")]
    pub last_action_message: Option<String>,
    pub channels: Vec<AudioChannelSnapshot>,
    #[serde(rename = "mixTargets")]
    pub mix_targets: Vec<AudioMixTargetSnapshot>,
    pub snapshots: Vec<AudioSceneSnapshot>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AudioChannelSnapshot {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct AudioMixTargetSnapshot {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct AudioSceneSnapshot {
    pub id: String,
    pub name: String,
    #[serde(rename = "lastRecalled")]
    pub last_recalled: bool,
    #[serde(rename = "lastRecalledAt")]
    pub last_recalled_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AudioHealthCheck {
    pub ok: bool,
    pub status: String,
    pub summary: String,
    #[serde(rename = "sendHost")]
    pub send_host: String,
    #[serde(rename = "sendPort")]
    pub send_port: i64,
    #[serde(rename = "receivePort")]
    pub receive_port: i64,
    pub verified: bool,
    #[serde(rename = "meteringState")]
    pub metering_state: String,
}

#[derive(Debug, Serialize)]
pub struct AudioSyncResult {
    pub synced: bool,
    #[serde(rename = "syncedAt")]
    pub synced_at: String,
    pub summary: String,
    #[serde(rename = "consoleStateConfidence")]
    pub console_state_confidence: String,
}

#[derive(Debug, Serialize)]
pub struct AudioSnapshotRecallResult {
    pub recalled: bool,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: String,
    #[serde(rename = "snapshotName")]
    pub snapshot_name: String,
    #[serde(rename = "recalledAt")]
    pub recalled_at: String,
    pub summary: String,
    #[serde(rename = "consoleStateConfidence")]
    pub console_state_confidence: String,
}

#[derive(Debug)]
pub enum AudioCommandError {
    Rejected(&'static str, String),
    Storage(String),
}

#[derive(Debug, Clone)]
pub struct AudioSnapshotRecallRequest {
    pub snapshot_id: String,
}

pub fn parse_audio_snapshot_recall_request(
    params: &Value,
) -> Result<AudioSnapshotRecallRequest, String> {
    let snapshot_id = params
        .get("snapshotId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("snapshotId is required"))?;

    Ok(AudioSnapshotRecallRequest {
        snapshot_id: String::from(snapshot_id),
    })
}

pub fn read_audio_snapshot(settings: &HashMap<String, String>) -> AudioSnapshot {
    let config = resolve_audio_config(settings);
    let check_status = audio_check_status(settings);
    let status = match check_status.as_str() {
        "passed" => "ready",
        "failed" => "attention",
        "idle" => "not-verified",
        _ => "not-verified",
    }
    .to_string();
    let connected = check_status == "passed";
    let verified = check_status == "passed";
    let inventory = read_default_audio_inventory(&config);
    let console_state_confidence = audio_console_state_confidence(settings);
    let last_console_sync_at = read_optional_setting(settings, AUDIO_LAST_CONSOLE_SYNC_AT_KEY);
    let last_console_sync_reason =
        read_optional_setting(settings, AUDIO_LAST_CONSOLE_SYNC_REASON_KEY);
    let last_recalled_snapshot_id =
        read_optional_setting(settings, AUDIO_LAST_RECALLED_SNAPSHOT_ID_KEY);
    let last_snapshot_recall_at =
        read_optional_setting(settings, AUDIO_LAST_SNAPSHOT_RECALL_AT_KEY);
    let last_action_status = read_optional_setting(settings, AUDIO_LAST_ACTION_STATUS_KEY)
        .unwrap_or_else(|| String::from("idle"));
    let last_action_code = read_optional_setting(settings, AUDIO_LAST_ACTION_CODE_KEY);
    let last_action_message = read_optional_setting(settings, AUDIO_LAST_ACTION_MESSAGE_KEY);
    let channels = inventory.channels;
    let mix_targets = inventory.mix_targets;
    let snapshots = inventory
        .snapshots
        .into_iter()
        .map(|snapshot| {
            let last_recalled = last_recalled_snapshot_id
                .as_deref()
                .map(|value| value == snapshot.id)
                .unwrap_or(false);
            AudioSceneSnapshot {
                last_recalled_at: if last_recalled {
                    last_snapshot_recall_at.clone()
                } else {
                    None
                },
                last_recalled,
                ..snapshot
            }
        })
        .collect::<Vec<_>>();
    let metering_state = if verified {
        String::from("transport-only")
    } else if check_status == "failed" {
        String::from("offline")
    } else {
        String::from("disabled")
    };

    AudioSnapshot {
        summary: audio_summary(
            &status,
            &config,
            channels.len(),
            mix_targets.len(),
            snapshots.len(),
            last_console_sync_at.as_deref(),
            last_console_sync_reason.as_deref(),
            last_recalled_snapshot_id.as_deref(),
            last_snapshot_recall_at.as_deref(),
            &last_action_status,
            last_action_code.as_deref(),
            last_action_message.as_deref(),
        ),
        status,
        adapter_mode: inventory.adapter_mode,
        send_host: config.send_host,
        send_port: config.send_port,
        receive_port: config.receive_port,
        connected,
        verified,
        metering_state,
        console_state_confidence,
        last_console_sync_at,
        last_console_sync_reason,
        last_recalled_snapshot_id,
        last_snapshot_recall_at,
        last_action_status,
        last_action_code,
        last_action_message,
        channels,
        mix_targets,
        snapshots,
    }
}

pub fn sync_audio_console(db_path: &Path) -> Result<AudioSyncResult, AudioCommandError> {
    let app_settings = load_audio_settings(db_path)?;
    let snapshot = read_audio_snapshot(&app_settings);
    ensure_audio_action_allowed(db_path, &snapshot)?;
    let config = resolve_audio_config(&app_settings);
    let inventory = read_default_audio_inventory(&config);
    let synced_at = current_timestamp(db_path)?;

    let outcome = sync_default_audio_console(&config, &inventory).map_err(|message| {
        let _ = record_audio_action_failure(db_path, "AUDIO_SYNC_FAILED", &message);
        AudioCommandError::Rejected("AUDIO_SYNC_FAILED", message)
    })?;

    persist_audio_state(
        db_path,
        &[
            (
                String::from(AUDIO_CONSOLE_STATE_CONFIDENCE_KEY),
                String::from("aligned"),
            ),
            (
                String::from(AUDIO_LAST_CONSOLE_SYNC_AT_KEY),
                synced_at.clone(),
            ),
            (
                String::from(AUDIO_LAST_CONSOLE_SYNC_REASON_KEY),
                String::from("manual-sync"),
            ),
            (
                String::from(AUDIO_LAST_ACTION_STATUS_KEY),
                String::from("succeeded"),
            ),
            (String::from(AUDIO_LAST_ACTION_CODE_KEY), String::new()),
            (
                String::from(AUDIO_LAST_ACTION_MESSAGE_KEY),
                outcome.summary.clone(),
            ),
        ],
    )?;

    Ok(AudioSyncResult {
        synced: true,
        synced_at,
        summary: outcome.summary,
        console_state_confidence: String::from("aligned"),
    })
}

pub fn recall_audio_snapshot(
    db_path: &Path,
    request: &AudioSnapshotRecallRequest,
) -> Result<AudioSnapshotRecallResult, AudioCommandError> {
    let app_settings = load_audio_settings(db_path)?;
    let snapshot = read_audio_snapshot(&app_settings);
    ensure_audio_action_allowed(db_path, &snapshot)?;
    let config = resolve_audio_config(&app_settings);
    let inventory = read_default_audio_inventory(&config);
    let recalled_at = current_timestamp(db_path)?;

    let outcome = recall_default_audio_snapshot(&config, &inventory, &request.snapshot_id)
        .map_err(|message| {
            let code = if message.contains("not exposed by the backend") {
                "AUDIO_SNAPSHOT_NOT_FOUND"
            } else {
                "AUDIO_SNAPSHOT_RECALL_FAILED"
            };
            let _ = record_audio_action_failure(db_path, code, &message);
            AudioCommandError::Rejected(code, message)
        })?;

    persist_audio_state(
        db_path,
        &[
            (
                String::from(AUDIO_CONSOLE_STATE_CONFIDENCE_KEY),
                String::from("assumed"),
            ),
            (
                String::from(AUDIO_LAST_CONSOLE_SYNC_REASON_KEY),
                String::from("snapshot"),
            ),
            (
                String::from(AUDIO_LAST_RECALLED_SNAPSHOT_ID_KEY),
                request.snapshot_id.clone(),
            ),
            (
                String::from(AUDIO_LAST_SNAPSHOT_RECALL_AT_KEY),
                recalled_at.clone(),
            ),
            (
                String::from(AUDIO_LAST_ACTION_STATUS_KEY),
                String::from("succeeded"),
            ),
            (String::from(AUDIO_LAST_ACTION_CODE_KEY), String::new()),
            (
                String::from(AUDIO_LAST_ACTION_MESSAGE_KEY),
                outcome.summary.clone(),
            ),
        ],
    )?;

    Ok(AudioSnapshotRecallResult {
        recalled: true,
        snapshot_id: request.snapshot_id.clone(),
        snapshot_name: outcome.snapshot_name,
        recalled_at,
        summary: outcome.summary,
        console_state_confidence: String::from("assumed"),
    })
}

pub fn build_audio_health_check(settings: &HashMap<String, String>) -> AudioHealthCheck {
    let snapshot = read_audio_snapshot(settings);
    AudioHealthCheck {
        ok: snapshot.status == "ready",
        status: snapshot.status.clone(),
        summary: snapshot.summary.clone(),
        send_host: snapshot.send_host,
        send_port: snapshot.send_port,
        receive_port: snapshot.receive_port,
        verified: snapshot.verified,
        metering_state: snapshot.metering_state,
    }
}

fn load_audio_settings(db_path: &Path) -> Result<HashMap<String, String>, AudioCommandError> {
    list_settings_by_prefix(db_path, APP_SETTINGS_PREFIX)
        .map_err(|error| AudioCommandError::Storage(error.to_string()))
}

fn resolve_audio_config(settings: &HashMap<String, String>) -> AudioBackendConfig {
    let send_host = settings
        .get(AUDIO_SEND_HOST_KEY)
        .cloned()
        .unwrap_or_else(|| String::from(DEFAULT_SEND_HOST));
    let send_port = settings
        .get(AUDIO_SEND_PORT_KEY)
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (1..=65535).contains(value))
        .unwrap_or(DEFAULT_SEND_PORT);
    let receive_port = settings
        .get(AUDIO_RECEIVE_PORT_KEY)
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (1..=65535).contains(value))
        .unwrap_or(DEFAULT_RECEIVE_PORT);

    AudioBackendConfig {
        send_host,
        send_port,
        receive_port,
    }
}

fn ensure_audio_action_allowed(
    db_path: &Path,
    snapshot: &AudioSnapshot,
) -> Result<(), AudioCommandError> {
    let rejected = match snapshot.status.as_str() {
        "ready" => None,
        "attention" => Some((
            "AUDIO_PROBE_FAILED",
            String::from(
                "Audio transport is in attention state. Fix the OSC configuration and rerun the commissioning audio probe before sending native commands.",
            ),
        )),
        "not-verified" => Some((
            "AUDIO_NOT_VERIFIED",
            String::from(
                "Run the commissioning audio probe before syncing the console or recalling snapshots from the native engine.",
            ),
        )),
        _ => Some((
            "AUDIO_TRANSPORT_UNAVAILABLE",
            String::from(
                "Audio transport is unavailable. Configure OSC settings before sending native audio commands.",
            ),
        )),
    };

    if let Some((code, message)) = rejected {
        record_audio_action_failure(db_path, code, &message)?;
        return Err(AudioCommandError::Rejected(code, message));
    }

    Ok(())
}

fn persist_audio_state(
    db_path: &Path,
    updates: &[(String, String)],
) -> Result<(), AudioCommandError> {
    set_settings_owned(db_path, updates)
        .map_err(|error| AudioCommandError::Storage(error.to_string()))
}

fn record_audio_action_failure(
    db_path: &Path,
    code: &str,
    message: &str,
) -> Result<(), AudioCommandError> {
    persist_audio_state(
        db_path,
        &[
            (
                String::from(AUDIO_LAST_ACTION_STATUS_KEY),
                String::from("failed"),
            ),
            (String::from(AUDIO_LAST_ACTION_CODE_KEY), String::from(code)),
            (
                String::from(AUDIO_LAST_ACTION_MESSAGE_KEY),
                String::from(message),
            ),
        ],
    )
}

fn current_timestamp(db_path: &Path) -> Result<String, AudioCommandError> {
    let connection =
        open_connection(db_path).map_err(|error| AudioCommandError::Storage(error.to_string()))?;
    connection
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now')", [], |row| {
            row.get(0)
        })
        .map_err(|error| AudioCommandError::Storage(error.to_string()))
}

fn audio_check_status(settings: &HashMap<String, String>) -> String {
    settings
        .get(&format!("app.commissioning.check.{AUDIO_CHECK_ID}.status"))
        .cloned()
        .unwrap_or_else(|| String::from("idle"))
}

fn audio_console_state_confidence(settings: &HashMap<String, String>) -> String {
    match settings
        .get(AUDIO_CONSOLE_STATE_CONFIDENCE_KEY)
        .map(String::as_str)
    {
        Some("aligned") => String::from("aligned"),
        Some("assumed") => String::from("assumed"),
        _ => String::from("unknown"),
    }
}

fn read_optional_setting(settings: &HashMap<String, String>, key: &str) -> Option<String> {
    settings
        .get(key)
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn audio_summary(
    status: &str,
    config: &AudioBackendConfig,
    channel_count: usize,
    mix_target_count: usize,
    snapshot_count: usize,
    last_console_sync_at: Option<&str>,
    last_console_sync_reason: Option<&str>,
    last_recalled_snapshot_id: Option<&str>,
    last_snapshot_recall_at: Option<&str>,
    last_action_status: &str,
    last_action_code: Option<&str>,
    last_action_message: Option<&str>,
) -> String {
    let transport_summary = match status {
        "ready" => format!(
            "OSC transport is configured for {}:{} with receive port {}. Simulated inventory exposes {} channels, {} mix targets, and {} snapshots for native audio development.",
            config.send_host, config.send_port, config.receive_port, channel_count, mix_target_count, snapshot_count
        ),
        "attention" => format!(
            "OSC transport check failed for {}:{} / {}. Simulated inventory still exposes {} channels, {} mix targets, and {} snapshots while connectivity is corrected.",
            config.send_host, config.send_port, config.receive_port, channel_count, mix_target_count, snapshot_count
        ),
        _ => format!(
            "OSC transport is configured for {}:{} with receive port {}. Simulated inventory exposes {} channels, {} mix targets, and {} snapshots before the native audio probe runs.",
            config.send_host, config.send_port, config.receive_port, channel_count, mix_target_count, snapshot_count
        ),
    };

    let sync_summary = match last_console_sync_at {
        Some(timestamp) => format!(
            " Last console sync: {}{}.",
            timestamp,
            last_console_sync_reason
                .map(|reason| format!(" ({reason})"))
                .unwrap_or_default()
        ),
        None => String::from(" No console sync has been recorded yet."),
    };

    let recall_summary = match last_recalled_snapshot_id {
        Some(snapshot_id) => format!(
            " Last snapshot recall: {}{}.",
            snapshot_id,
            last_snapshot_recall_at
                .map(|timestamp| format!(" at {timestamp}"))
                .unwrap_or_default()
        ),
        None => String::from(" No audio snapshot recall has been recorded yet."),
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

    format!("{transport_summary}{sync_summary}{recall_summary}{action_summary}")
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
                "studio-control-engine-audio-{label}-{}-{unique}",
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
    fn audio_snapshot_defaults_to_not_verified() {
        let snapshot = read_audio_snapshot(&HashMap::new());
        assert_eq!(snapshot.status, "not-verified");
        assert!(!snapshot.connected);
        assert!(!snapshot.verified);
        assert_eq!(snapshot.channels.len(), 6);
        assert_eq!(snapshot.mix_targets.len(), 3);
        assert_eq!(snapshot.snapshots.len(), 3);
        assert_eq!(snapshot.console_state_confidence, "unknown");
    }

    #[test]
    fn audio_snapshot_reports_ready_when_probe_passed() {
        let settings = HashMap::from([
            (
                String::from("app.commissioning.check.audio.status"),
                String::from("passed"),
            ),
            (String::from(AUDIO_SEND_HOST_KEY), String::from("127.0.0.1")),
        ]);

        let snapshot = read_audio_snapshot(&settings);
        assert_eq!(snapshot.status, "ready");
        assert!(snapshot.connected);
        assert!(snapshot.verified);
        assert_eq!(snapshot.channels.len(), 6);
        assert_eq!(snapshot.mix_targets.len(), 3);
        assert_eq!(snapshot.snapshots.len(), 3);
    }

    #[test]
    fn audio_sync_rejects_until_probe_passes_and_records_failure_state() {
        let test_dir = TestDir::new("sync-rejects");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");

        let error =
            sync_audio_console(test_dir.db_path().as_path()).expect_err("sync should reject");
        match error {
            AudioCommandError::Rejected(code, _) => assert_eq!(code, "AUDIO_NOT_VERIFIED"),
            other => panic!("unexpected error: {other:?}"),
        }

        let settings = list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
            .expect("settings should load");
        let snapshot = read_audio_snapshot(&settings);
        assert_eq!(snapshot.last_action_status, "failed");
        assert_eq!(
            snapshot.last_action_code.as_deref(),
            Some("AUDIO_NOT_VERIFIED")
        );
    }

    #[test]
    fn audio_sync_updates_console_state_when_probe_passed() {
        let test_dir = TestDir::new("sync-ready");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");
        set_settings_owned(
            test_dir.db_path().as_path(),
            &[(
                String::from("app.commissioning.check.audio.status"),
                String::from("passed"),
            )],
        )
        .expect("probe state should persist");

        let result = sync_audio_console(test_dir.db_path().as_path()).expect("sync should succeed");
        assert!(result.synced);
        assert_eq!(result.console_state_confidence, "aligned");

        let settings = list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
            .expect("settings should load");
        let snapshot = read_audio_snapshot(&settings);
        assert_eq!(snapshot.console_state_confidence, "aligned");
        assert_eq!(snapshot.last_action_status, "succeeded");
        assert_eq!(
            snapshot.last_console_sync_reason.as_deref(),
            Some("manual-sync")
        );
        assert!(snapshot.last_console_sync_at.is_some());
    }

    #[test]
    fn audio_snapshot_recall_marks_last_recalled_snapshot() {
        let test_dir = TestDir::new("snapshot-recall");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");
        set_settings_owned(
            test_dir.db_path().as_path(),
            &[(
                String::from("app.commissioning.check.audio.status"),
                String::from("passed"),
            )],
        )
        .expect("probe state should persist");

        let result = recall_audio_snapshot(
            test_dir.db_path().as_path(),
            &AudioSnapshotRecallRequest {
                snapshot_id: String::from("snapshot-panel"),
            },
        )
        .expect("snapshot recall should succeed");

        assert!(result.recalled);
        assert_eq!(result.snapshot_name, "Panel");

        let settings = list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
            .expect("settings should load");
        let snapshot = read_audio_snapshot(&settings);
        assert_eq!(snapshot.console_state_confidence, "assumed");
        assert_eq!(
            snapshot.last_recalled_snapshot_id.as_deref(),
            Some("snapshot-panel")
        );
        assert!(snapshot
            .snapshots
            .iter()
            .any(|entry| entry.id == "snapshot-panel" && entry.last_recalled));
    }
}
