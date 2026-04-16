use crate::app_state::APP_SETTINGS_PREFIX;
use crate::commissioning::{LIGHTING_BRIDGE_IP_KEY, LIGHTING_CHECK_ID, LIGHTING_UNIVERSE_KEY};
use crate::lighting_backend::{
    read_default_lighting_inventory, recall_default_lighting_scene, LightingBackendConfig,
    LightingBackendInventory,
};
use crate::storage::{list_settings_by_prefix, open_connection, set_settings_owned};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

const DEFAULT_UNIVERSE: i64 = 1;
const DEFAULT_FIXTURE_INTENSITY: i64 = 100;
const DEFAULT_FIXTURE_CCT: i64 = 4500;
const MIN_FIXTURE_CCT: i64 = 2700;
const MAX_FIXTURE_CCT: i64 = 6500;

const LIGHTING_LAST_RECALLED_SCENE_ID_KEY: &str = "app.lighting.last_recalled_scene_id";
const LIGHTING_LAST_SCENE_RECALL_AT_KEY: &str = "app.lighting.last_scene_recall_at";
const LIGHTING_LAST_ACTION_STATUS_KEY: &str = "app.lighting.last_action_status";
const LIGHTING_LAST_ACTION_CODE_KEY: &str = "app.lighting.last_action_code";
const LIGHTING_LAST_ACTION_MESSAGE_KEY: &str = "app.lighting.last_action_message";
const LIGHTING_EDITOR_STATE_KEY: &str = "app.lighting.editor.state";
const LEGACY_LIGHTING_EDITOR_STATE_KEY: &str = "app.control_surface.lighting.state";
const LIGHTING_FIXTURE_STATE_PREFIX: &str = "app.lighting.fixture.";
const LIGHTING_CUSTOM_SCENE_ID_PREFIX: &str = "scene-custom-";

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
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
    pub on: bool,
    pub intensity: i64,
    pub cct: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct LightingGroupSnapshot {
    pub id: String,
    pub name: String,
    #[serde(rename = "fixtureCount")]
    pub fixture_count: usize,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingEditorState {
    pub fixtures: Vec<LightingEditorFixtureState>,
    pub scenes: Vec<LightingEditorSceneState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingEditorFixtureState {
    pub id: String,
    pub name: String,
    pub kind: String,
    #[serde(rename = "groupId")]
    pub group_id: Option<String>,
    pub intensity: i64,
    pub cct: i64,
    pub on: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingEditorSceneState {
    pub id: String,
    pub name: String,
    #[serde(rename = "fixtureStates")]
    pub fixture_states: Vec<LightingEditorSceneFixtureState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingEditorSceneFixtureState {
    #[serde(rename = "fixtureId")]
    pub fixture_id: String,
    pub intensity: i64,
    pub cct: i64,
    pub on: bool,
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

#[derive(Debug, Serialize)]
pub struct LightingFixtureUpdateResult {
    pub fixture: LightingFixtureSnapshot,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct LightingGroupPowerResult {
    #[serde(rename = "groupId")]
    pub group_id: String,
    #[serde(rename = "groupName")]
    pub group_name: String,
    #[serde(rename = "affectedFixtures")]
    pub affected_fixtures: usize,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct LightingSceneCreateResult {
    pub scene: LightingSceneSnapshot,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct LightingSceneUpdateResult {
    pub scene: LightingSceneSnapshot,
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct LightingSceneDeleteResult {
    pub deleted: bool,
    #[serde(rename = "sceneId")]
    pub scene_id: String,
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

#[derive(Debug, Clone)]
pub struct LightingFixtureUpdateRequest {
    pub fixture_id: String,
    pub on: Option<bool>,
    pub intensity: Option<i64>,
    pub cct: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct LightingGroupPowerRequest {
    pub group_id: String,
    pub on: bool,
}

#[derive(Debug, Clone)]
pub struct LightingSceneCreateRequest {
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct LightingSceneUpdateRequest {
    pub scene_id: String,
    pub name: Option<String>,
    pub capture_current_state: bool,
}

#[derive(Debug, Clone)]
pub struct LightingSceneDeleteRequest {
    pub scene_id: String,
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

pub fn parse_lighting_fixture_update_request(
    params: &Value,
) -> Result<LightingFixtureUpdateRequest, String> {
    let fixture_id = params
        .get("fixtureId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("fixtureId is required"))?;

    let on = params
        .get("on")
        .map(|value| {
            value
                .as_bool()
                .ok_or_else(|| String::from("on must be a boolean"))
        })
        .transpose()?;

    let intensity = params
        .get("intensity")
        .map(parse_i64_value)
        .transpose()?
        .map(|value| clamp_i64(value, 0, 100));

    let cct = params
        .get("cct")
        .map(parse_i64_value)
        .transpose()?
        .map(|value| clamp_i64(value, MIN_FIXTURE_CCT, MAX_FIXTURE_CCT));

    if on.is_none() && intensity.is_none() && cct.is_none() {
        return Err(String::from(
            "lighting.fixture.update requires one or more supported fields",
        ));
    }

    Ok(LightingFixtureUpdateRequest {
        fixture_id: String::from(fixture_id),
        on,
        intensity,
        cct,
    })
}

pub fn parse_lighting_group_power_request(
    params: &Value,
) -> Result<LightingGroupPowerRequest, String> {
    let group_id = params
        .get("groupId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("groupId is required"))?;

    let on = params
        .get("on")
        .and_then(Value::as_bool)
        .ok_or_else(|| String::from("on must be a boolean"))?;

    Ok(LightingGroupPowerRequest {
        group_id: String::from(group_id),
        on,
    })
}

pub fn parse_lighting_scene_create_request(
    params: &Value,
) -> Result<LightingSceneCreateRequest, String> {
    let name = parse_required_scene_name(params.get("name"))?;
    Ok(LightingSceneCreateRequest { name })
}

pub fn parse_lighting_scene_update_request(
    params: &Value,
) -> Result<LightingSceneUpdateRequest, String> {
    let scene_id = params
        .get("sceneId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("sceneId is required"))?;

    let name = params
        .get("name")
        .map(|value| parse_required_scene_name(Some(value)))
        .transpose()?;
    let capture_current_state = params
        .get("captureCurrentState")
        .map(|value| {
            value
                .as_bool()
                .ok_or_else(|| String::from("captureCurrentState must be a boolean"))
        })
        .transpose()?
        .unwrap_or(false);

    if name.is_none() && !capture_current_state {
        return Err(String::from(
            "lighting.scene.update requires a name and/or captureCurrentState",
        ));
    }

    Ok(LightingSceneUpdateRequest {
        scene_id: String::from(scene_id),
        name,
        capture_current_state,
    })
}

pub fn parse_lighting_scene_delete_request(
    params: &Value,
) -> Result<LightingSceneDeleteRequest, String> {
    let scene_id = params
        .get("sceneId")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| String::from("sceneId is required"))?;

    Ok(LightingSceneDeleteRequest {
        scene_id: String::from(scene_id),
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
    let editor_state = load_lighting_editor_state_with_inventory(settings, &config, &inventory);
    let fixtures = editor_state
        .fixtures
        .iter()
        .cloned()
        .map(lighting_fixture_snapshot_from_state)
        .collect::<Vec<_>>();
    let groups = inventory
        .groups
        .into_iter()
        .map(|group| {
            let fixture_count = editor_state
                .fixtures
                .iter()
                .filter(|fixture| fixture.group_id.as_deref() == Some(group.id.as_str()))
                .count();
            LightingGroupSnapshot {
                fixture_count,
                ..group
            }
        })
        .collect::<Vec<_>>();
    let scenes = editor_state
        .scenes
        .iter()
        .map(|scene| {
            lighting_scene_snapshot_from_state(
                scene,
                last_recalled_scene_id.as_deref(),
                last_scene_recall_at.as_deref(),
            )
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

pub fn load_lighting_editor_state(settings: &HashMap<String, String>) -> LightingEditorState {
    let config = resolve_lighting_config(settings);
    let inventory = read_default_lighting_inventory(&config);
    load_lighting_editor_state_with_inventory(settings, &config, &inventory)
}

pub fn save_lighting_editor_state(
    db_path: &Path,
    state: &LightingEditorState,
) -> Result<(), LightingCommandError> {
    let updates = lighting_editor_state_updates(state)?;
    persist_lighting_state(db_path, &updates)
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
    let mut editor_state =
        load_lighting_editor_state_with_inventory(&app_settings, &config, &inventory);
    let scene = editor_state
        .scenes
        .iter()
        .find(|scene| scene.id == request.scene_id)
        .cloned()
        .ok_or_else(|| {
            let message = format!(
                "Lighting scene '{}' is not exposed by the native editor state.",
                request.scene_id
            );
            let _ = record_lighting_action_failure(db_path, "LIGHTING_SCENE_NOT_FOUND", &message);
            LightingCommandError::Rejected("LIGHTING_SCENE_NOT_FOUND", message)
        })?;
    let recalled_at = current_timestamp(db_path)?;
    for fixture in &mut editor_state.fixtures {
        if let Some(scene_fixture_state) = scene
            .fixture_states
            .iter()
            .find(|fixture_state| fixture_state.fixture_id == fixture.id)
        {
            fixture.on = scene_fixture_state.on;
            fixture.intensity = scene_fixture_state.intensity;
            fixture.cct = scene_fixture_state.cct;
        }
    }

    let summary = format!(
        "{} lighting scene '{}' was recalled via {} on {} universe {}.",
        lighting_adapter_label(&snapshot.adapter_mode),
        scene.name,
        recall_mode_label(request.fade_duration_seconds),
        config.bridge_ip,
        config.universe
    );

    let mut updates = lighting_editor_state_updates(&editor_state)?;
    updates.extend_from_slice(&[
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
            summary.clone(),
        ),
    ]);
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingSceneRecallResult {
        recalled: true,
        scene_id: request.scene_id.clone(),
        scene_name: scene.name,
        recalled_at,
        fade_duration_seconds: request.fade_duration_seconds,
        summary,
    })
}

pub fn update_lighting_fixture(
    db_path: &Path,
    request: &LightingFixtureUpdateRequest,
) -> Result<LightingFixtureUpdateResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let mut editor_state = load_lighting_editor_state(&app_settings);
    let updated_fixture = {
        let fixture = editor_state
            .fixtures
            .iter_mut()
            .find(|entry| entry.id == request.fixture_id)
            .ok_or_else(|| {
                LightingCommandError::Rejected(
                    "LIGHTING_FIXTURE_NOT_FOUND",
                    format!(
                        "Lighting fixture '{}' is not exposed by the native editor state.",
                        request.fixture_id
                    ),
                )
            })?;

        if let Some(on) = request.on {
            fixture.on = on;
        }
        if let Some(intensity) = request.intensity {
            fixture.intensity = clamp_i64(intensity, 0, 100);
        }
        if let Some(cct) = request.cct {
            fixture.cct = clamp_i64(cct, MIN_FIXTURE_CCT, MAX_FIXTURE_CCT);
        }

        fixture.clone()
    };
    let summary = lighting_fixture_update_summary(&updated_fixture);
    let mut updates = lighting_editor_state_updates(&editor_state)?;
    updates.extend_from_slice(&[
        (
            String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
            String::from("succeeded"),
        ),
        (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
        (
            String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
            summary.clone(),
        ),
    ]);
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingFixtureUpdateResult {
        fixture: lighting_fixture_snapshot_from_state(updated_fixture),
        summary,
    })
}

pub fn set_lighting_group_power(
    db_path: &Path,
    request: &LightingGroupPowerRequest,
) -> Result<LightingGroupPowerResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let snapshot = read_lighting_snapshot(&app_settings);
    let group = snapshot
        .groups
        .iter()
        .find(|entry| entry.id == request.group_id)
        .cloned()
        .ok_or_else(|| {
            LightingCommandError::Rejected(
                "LIGHTING_GROUP_NOT_FOUND",
                format!(
                    "Lighting group '{}' is not exposed by the native editor state.",
                    request.group_id
                ),
            )
        })?;
    let mut editor_state = load_lighting_editor_state(&app_settings);
    let mut affected_fixtures = 0usize;
    for fixture in &mut editor_state.fixtures {
        if fixture.group_id.as_deref() == Some(group.id.as_str()) {
            fixture.on = request.on;
            affected_fixtures += 1;
        }
    }

    if affected_fixtures == 0 {
        return Err(LightingCommandError::Rejected(
            "LIGHTING_GROUP_EMPTY",
            format!(
                "Lighting group '{}' does not currently contain fixtures.",
                group.name
            ),
        ));
    }

    let mut updates = lighting_editor_state_updates(&editor_state)?;
    let summary = format!(
        "Lighting group '{}' set {} across {} fixtures.",
        group.name,
        if request.on { "on" } else { "off" },
        affected_fixtures
    );
    updates.extend_from_slice(&[
        (
            String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
            String::from("succeeded"),
        ),
        (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
        (
            String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
            summary.clone(),
        ),
    ]);
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingGroupPowerResult {
        group_id: group.id,
        group_name: group.name,
        affected_fixtures,
        summary,
    })
}

pub fn create_lighting_scene(
    db_path: &Path,
    request: &LightingSceneCreateRequest,
) -> Result<LightingSceneCreateResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let mut editor_state = load_lighting_editor_state(&app_settings);
    if editor_state.fixtures.is_empty() {
        return Err(LightingCommandError::Rejected(
            "LIGHTING_NO_FIXTURES",
            String::from("No lighting fixtures are available for scene creation."),
        ));
    }

    let scene = LightingEditorSceneState {
        id: next_custom_scene_id(&editor_state.scenes),
        name: request.name.clone(),
        fixture_states: capture_scene_fixture_states(&editor_state.fixtures),
    };
    editor_state.scenes.push(scene.clone());

    let summary = format!(
        "Lighting scene '{}' was saved from the current fixture state.",
        scene.name
    );
    let mut updates = lighting_editor_state_updates(&editor_state)?;
    updates.extend_from_slice(&[
        (
            String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
            String::from("succeeded"),
        ),
        (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
        (
            String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
            summary.clone(),
        ),
    ]);
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingSceneCreateResult {
        scene: lighting_scene_snapshot_from_state(
            &scene,
            read_optional_setting(&app_settings, LIGHTING_LAST_RECALLED_SCENE_ID_KEY).as_deref(),
            read_optional_setting(&app_settings, LIGHTING_LAST_SCENE_RECALL_AT_KEY).as_deref(),
        ),
        summary,
    })
}

pub fn update_lighting_scene(
    db_path: &Path,
    request: &LightingSceneUpdateRequest,
) -> Result<LightingSceneUpdateResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let mut editor_state = load_lighting_editor_state(&app_settings);
    let captured_fixture_states = request
        .capture_current_state
        .then(|| capture_scene_fixture_states(&editor_state.fixtures));
    let updated_scene = {
        let scene = editor_state
            .scenes
            .iter_mut()
            .find(|scene| scene.id == request.scene_id)
            .ok_or_else(|| {
                LightingCommandError::Rejected(
                    "LIGHTING_SCENE_NOT_FOUND",
                    format!(
                        "Lighting scene '{}' is not exposed by the native editor state.",
                        request.scene_id
                    ),
                )
            })?;

        if let Some(name) = &request.name {
            scene.name = name.clone();
        }
        if let Some(fixture_states) = captured_fixture_states {
            scene.fixture_states = fixture_states;
        }

        scene.clone()
    };
    let summary = lighting_scene_update_summary(&updated_scene, request);
    let mut updates = lighting_editor_state_updates(&editor_state)?;
    updates.extend_from_slice(&[
        (
            String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
            String::from("succeeded"),
        ),
        (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
        (
            String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
            summary.clone(),
        ),
    ]);
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingSceneUpdateResult {
        scene: lighting_scene_snapshot_from_state(
            &updated_scene,
            read_optional_setting(&app_settings, LIGHTING_LAST_RECALLED_SCENE_ID_KEY).as_deref(),
            read_optional_setting(&app_settings, LIGHTING_LAST_SCENE_RECALL_AT_KEY).as_deref(),
        ),
        summary,
    })
}

pub fn delete_lighting_scene(
    db_path: &Path,
    request: &LightingSceneDeleteRequest,
) -> Result<LightingSceneDeleteResult, LightingCommandError> {
    let app_settings = load_lighting_settings(db_path)?;
    let mut editor_state = load_lighting_editor_state(&app_settings);
    let deleted_scene = editor_state
        .scenes
        .iter()
        .find(|scene| scene.id == request.scene_id)
        .cloned()
        .ok_or_else(|| {
            LightingCommandError::Rejected(
                "LIGHTING_SCENE_NOT_FOUND",
                format!(
                    "Lighting scene '{}' is not exposed by the native editor state.",
                    request.scene_id
                ),
            )
        })?;
    editor_state
        .scenes
        .retain(|scene| scene.id != request.scene_id);

    let last_recalled_scene_id =
        read_optional_setting(&app_settings, LIGHTING_LAST_RECALLED_SCENE_ID_KEY);
    let clear_last_recall = last_recalled_scene_id.as_deref() == Some(request.scene_id.as_str());

    let summary = format!(
        "Lighting scene '{}' was deleted from the native editor state.",
        deleted_scene.name
    );
    let mut updates = lighting_editor_state_updates(&editor_state)?;
    updates.extend_from_slice(&[
        (
            String::from(LIGHTING_LAST_ACTION_STATUS_KEY),
            String::from("succeeded"),
        ),
        (String::from(LIGHTING_LAST_ACTION_CODE_KEY), String::new()),
        (
            String::from(LIGHTING_LAST_ACTION_MESSAGE_KEY),
            summary.clone(),
        ),
    ]);
    if clear_last_recall {
        updates.extend_from_slice(&[
            (
                String::from(LIGHTING_LAST_RECALLED_SCENE_ID_KEY),
                String::new(),
            ),
            (
                String::from(LIGHTING_LAST_SCENE_RECALL_AT_KEY),
                String::new(),
            ),
        ]);
    }
    persist_lighting_state(db_path, &updates)?;

    Ok(LightingSceneDeleteResult {
        deleted: true,
        scene_id: request.scene_id.clone(),
        summary,
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

fn load_lighting_editor_state_with_inventory(
    settings: &HashMap<String, String>,
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
) -> LightingEditorState {
    settings
        .get(LIGHTING_EDITOR_STATE_KEY)
        .or_else(|| settings.get(LEGACY_LIGHTING_EDITOR_STATE_KEY))
        .and_then(|value| serde_json::from_str::<LightingEditorState>(value).ok())
        .map(|state| normalize_lighting_editor_state(state, settings, config, inventory))
        .unwrap_or_else(|| default_lighting_editor_state(settings, config, inventory))
}

fn default_lighting_editor_state(
    settings: &HashMap<String, String>,
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
) -> LightingEditorState {
    let fixtures = inventory
        .fixtures
        .iter()
        .map(|fixture| LightingEditorFixtureState {
            id: fixture.id.clone(),
            name: fixture.name.clone(),
            kind: fixture.kind.clone(),
            group_id: fixture.group_id.clone(),
            intensity: read_fixture_intensity(settings, &fixture.id),
            cct: read_fixture_cct(settings, &fixture.id),
            on: read_fixture_on(settings, &fixture.id),
        })
        .collect::<Vec<_>>();

    LightingEditorState {
        scenes: default_lighting_scene_states(config, inventory, &fixtures),
        fixtures,
    }
}

fn normalize_lighting_editor_state(
    existing: LightingEditorState,
    settings: &HashMap<String, String>,
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
) -> LightingEditorState {
    let fixtures = inventory
        .fixtures
        .iter()
        .map(|fixture| {
            let existing_fixture = existing
                .fixtures
                .iter()
                .find(|entry| entry.id == fixture.id);
            LightingEditorFixtureState {
                id: fixture.id.clone(),
                name: fixture.name.clone(),
                kind: fixture.kind.clone(),
                group_id: fixture.group_id.clone(),
                intensity: existing_fixture
                    .map(|entry| clamp_i64(entry.intensity, 0, 100))
                    .unwrap_or_else(|| read_fixture_intensity(settings, &fixture.id)),
                cct: existing_fixture
                    .map(|entry| clamp_i64(entry.cct, MIN_FIXTURE_CCT, MAX_FIXTURE_CCT))
                    .unwrap_or_else(|| read_fixture_cct(settings, &fixture.id)),
                on: existing_fixture
                    .map(|entry| entry.on)
                    .unwrap_or_else(|| read_fixture_on(settings, &fixture.id)),
            }
        })
        .collect::<Vec<_>>();
    let scenes = if existing.scenes.is_empty() {
        default_lighting_scene_states(config, inventory, &fixtures)
    } else {
        existing
            .scenes
            .iter()
            .map(|scene| LightingEditorSceneState {
                id: scene.id.clone(),
                name: scene.name.clone(),
                fixture_states: fixtures
                    .iter()
                    .map(|fixture| {
                        let existing_fixture_state = scene
                            .fixture_states
                            .iter()
                            .find(|state| state.fixture_id == fixture.id);
                        LightingEditorSceneFixtureState {
                            fixture_id: fixture.id.clone(),
                            intensity: existing_fixture_state
                                .map(|state| clamp_i64(state.intensity, 0, 100))
                                .unwrap_or(fixture.intensity),
                            cct: existing_fixture_state
                                .map(|state| clamp_i64(state.cct, MIN_FIXTURE_CCT, MAX_FIXTURE_CCT))
                                .unwrap_or(fixture.cct),
                            on: existing_fixture_state
                                .map(|state| state.on)
                                .unwrap_or(fixture.on),
                        }
                    })
                    .collect(),
            })
            .collect()
    };

    LightingEditorState { fixtures, scenes }
}

fn default_lighting_scene_states(
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
    fixtures: &[LightingEditorFixtureState],
) -> Vec<LightingEditorSceneState> {
    inventory
        .scenes
        .iter()
        .map(|scene| LightingEditorSceneState {
            id: scene.id.clone(),
            name: scene.name.clone(),
            fixture_states: default_lighting_scene_fixture_states(
                config, inventory, &scene.id, fixtures,
            ),
        })
        .collect()
}

fn default_lighting_scene_fixture_states(
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
    scene_id: &str,
    fixtures: &[LightingEditorFixtureState],
) -> Vec<LightingEditorSceneFixtureState> {
    let backend_updates = recall_default_lighting_scene(config, inventory, scene_id, 0.0)
        .ok()
        .map(|outcome| {
            outcome
                .fixture_updates
                .into_iter()
                .map(|update| (update.fixture_id.clone(), update))
                .collect::<HashMap<_, _>>()
        })
        .unwrap_or_default();

    fixtures
        .iter()
        .map(|fixture| {
            let backend_update = backend_updates.get(&fixture.id);
            LightingEditorSceneFixtureState {
                fixture_id: fixture.id.clone(),
                intensity: backend_update
                    .map(|update| clamp_i64(update.intensity, 0, 100))
                    .unwrap_or(fixture.intensity),
                cct: fixture.cct,
                on: backend_update.map(|update| update.on).unwrap_or(fixture.on),
            }
        })
        .collect()
}

fn lighting_editor_state_updates(
    state: &LightingEditorState,
) -> Result<Vec<(String, String)>, LightingCommandError> {
    let serialized = serde_json::to_string(state)
        .map_err(|error| LightingCommandError::Storage(error.to_string()))?;
    let mut updates = vec![(String::from(LIGHTING_EDITOR_STATE_KEY), serialized)];
    for fixture in &state.fixtures {
        updates.extend_from_slice(&[
            (fixture_on_key(&fixture.id), fixture.on.to_string()),
            (
                fixture_intensity_key(&fixture.id),
                fixture.intensity.to_string(),
            ),
            (fixture_cct_key(&fixture.id), fixture.cct.to_string()),
        ]);
    }
    Ok(updates)
}

fn lighting_fixture_snapshot_from_state(
    fixture: LightingEditorFixtureState,
) -> LightingFixtureSnapshot {
    LightingFixtureSnapshot {
        id: fixture.id,
        name: fixture.name,
        kind: fixture.kind,
        group_id: fixture.group_id,
        on: fixture.on,
        intensity: fixture.intensity,
        cct: fixture.cct,
    }
}

fn lighting_scene_snapshot_from_state(
    scene: &LightingEditorSceneState,
    last_recalled_scene_id: Option<&str>,
    last_scene_recall_at: Option<&str>,
) -> LightingSceneSnapshot {
    let last_recalled = last_recalled_scene_id
        .map(|value| value == scene.id)
        .unwrap_or(false);
    LightingSceneSnapshot {
        id: scene.id.clone(),
        name: scene.name.clone(),
        last_recalled,
        last_recalled_at: if last_recalled {
            last_scene_recall_at.map(String::from)
        } else {
            None
        },
    }
}

fn capture_scene_fixture_states(
    fixtures: &[LightingEditorFixtureState],
) -> Vec<LightingEditorSceneFixtureState> {
    fixtures
        .iter()
        .map(|fixture| LightingEditorSceneFixtureState {
            fixture_id: fixture.id.clone(),
            intensity: fixture.intensity,
            cct: fixture.cct,
            on: fixture.on,
        })
        .collect()
}

fn next_custom_scene_id(scenes: &[LightingEditorSceneState]) -> String {
    let next_index = scenes
        .iter()
        .filter_map(|scene| {
            scene
                .id
                .strip_prefix(LIGHTING_CUSTOM_SCENE_ID_PREFIX)
                .and_then(|value| value.parse::<usize>().ok())
        })
        .max()
        .unwrap_or(0)
        + 1;

    format!("{LIGHTING_CUSTOM_SCENE_ID_PREFIX}{next_index}")
}

fn lighting_fixture_update_summary(fixture: &LightingEditorFixtureState) -> String {
    format!(
        "Lighting fixture '{}' saved as {} at {}% / {}K.",
        fixture.name,
        if fixture.on { "on" } else { "off" },
        fixture.intensity,
        fixture.cct
    )
}

fn lighting_scene_update_summary(
    scene: &LightingEditorSceneState,
    request: &LightingSceneUpdateRequest,
) -> String {
    let mut parts = Vec::new();
    if request.name.is_some() {
        parts.push(String::from("renamed"));
    }
    if request.capture_current_state {
        parts.push(String::from("captured current fixture state"));
    }

    if parts.is_empty() {
        format!("Lighting scene '{}' was updated.", scene.name)
    } else {
        format!("Lighting scene '{}' {}.", scene.name, parts.join(" and "))
    }
}

fn lighting_adapter_label(adapter_mode: &str) -> &'static str {
    if adapter_mode == "simulated" {
        "Simulated"
    } else {
        "Native"
    }
}

fn recall_mode_label(fade_duration_seconds: f64) -> String {
    if fade_duration_seconds <= 0.0 {
        String::from("instant recall")
    } else if fade_duration_seconds.fract() == 0.0 {
        format!("{}s fade", fade_duration_seconds as i64)
    } else {
        format!("{fade_duration_seconds:.1}s fade")
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

fn parse_required_scene_name(value: Option<&Value>) -> Result<String, String> {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
        .ok_or_else(|| String::from("name is required"))
}

fn parse_i64_value(value: &Value) -> Result<i64, String> {
    if let Some(number) = value.as_i64() {
        Ok(number)
    } else if let Some(number) = value.as_f64() {
        if number.is_finite() {
            Ok(number.round() as i64)
        } else {
            Err(String::from("value must be a finite number"))
        }
    } else {
        Err(String::from("value must be a number"))
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

fn fixture_on_key(fixture_id: &str) -> String {
    format!("{LIGHTING_FIXTURE_STATE_PREFIX}{fixture_id}.on")
}

fn fixture_intensity_key(fixture_id: &str) -> String {
    format!("{LIGHTING_FIXTURE_STATE_PREFIX}{fixture_id}.intensity")
}

fn fixture_cct_key(fixture_id: &str) -> String {
    format!("{LIGHTING_FIXTURE_STATE_PREFIX}{fixture_id}.cct")
}

fn read_fixture_on(settings: &HashMap<String, String>, fixture_id: &str) -> bool {
    settings
        .get(&fixture_on_key(fixture_id))
        .and_then(|value| match value.as_str() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        })
        .unwrap_or(false)
}

fn read_fixture_intensity(settings: &HashMap<String, String>, fixture_id: &str) -> i64 {
    settings
        .get(&fixture_intensity_key(fixture_id))
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (0..=100).contains(value))
        .unwrap_or(DEFAULT_FIXTURE_INTENSITY)
}

fn read_fixture_cct(settings: &HashMap<String, String>, fixture_id: &str) -> i64 {
    settings
        .get(&fixture_cct_key(fixture_id))
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (MIN_FIXTURE_CCT..=MAX_FIXTURE_CCT).contains(value))
        .unwrap_or(DEFAULT_FIXTURE_CCT)
}

fn clamp_i64(value: i64, min: i64, max: i64) -> i64 {
    value.max(min).min(max)
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
        assert_eq!(snapshot.groups[0].fixture_count, 3);
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
        assert!(snapshot
            .fixtures
            .iter()
            .any(|entry| entry.id == "fixture-key-left" && entry.on && entry.intensity == 90));
    }

    #[test]
    fn lighting_fixture_update_and_group_power_refresh_snapshot_state() {
        let test_dir = TestDir::new("fixture-update");
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

        let updated = update_lighting_fixture(
            test_dir.db_path().as_path(),
            &LightingFixtureUpdateRequest {
                fixture_id: String::from("fixture-key-left"),
                on: Some(true),
                intensity: Some(72),
                cct: Some(5100),
            },
        )
        .expect("fixture update should succeed");
        assert!(updated.fixture.on);
        assert_eq!(updated.fixture.intensity, 72);
        assert_eq!(updated.fixture.cct, 5100);

        let group = set_lighting_group_power(
            test_dir.db_path().as_path(),
            &LightingGroupPowerRequest {
                group_id: String::from("group-stage"),
                on: false,
            },
        )
        .expect("group power should succeed");
        assert_eq!(group.affected_fixtures, 3);

        let snapshot = read_lighting_snapshot(
            &list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
                .expect("settings should load"),
        );
        assert!(snapshot
            .fixtures
            .iter()
            .filter(|entry| entry.group_id.as_deref() == Some("group-stage"))
            .all(|entry| !entry.on));
        assert_eq!(snapshot.last_action_status, "succeeded");
    }

    #[test]
    fn lighting_scene_crud_uses_shared_editor_state() {
        let test_dir = TestDir::new("scene-crud");
        initialize_database(test_dir.db_path().as_path()).expect("database should initialize");
        set_settings_owned(
            test_dir.db_path().as_path(),
            &[(
                String::from(LIGHTING_BRIDGE_IP_KEY),
                String::from("2.0.0.10"),
            )],
        )
        .expect("lighting state should persist");

        update_lighting_fixture(
            test_dir.db_path().as_path(),
            &LightingFixtureUpdateRequest {
                fixture_id: String::from("fixture-key-left"),
                on: Some(true),
                intensity: Some(61),
                cct: Some(4900),
            },
        )
        .expect("fixture update should succeed");

        let created = create_lighting_scene(
            test_dir.db_path().as_path(),
            &LightingSceneCreateRequest {
                name: String::from("Cue A"),
            },
        )
        .expect("scene create should succeed");
        assert_eq!(created.scene.name, "Cue A");

        let renamed = update_lighting_scene(
            test_dir.db_path().as_path(),
            &LightingSceneUpdateRequest {
                scene_id: created.scene.id.clone(),
                name: Some(String::from("Cue B")),
                capture_current_state: true,
            },
        )
        .expect("scene update should succeed");
        assert_eq!(renamed.scene.name, "Cue B");

        let snapshot = read_lighting_snapshot(
            &list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
                .expect("settings should load"),
        );
        assert!(snapshot.scenes.iter().any(|scene| scene.name == "Cue B"));

        let deleted = delete_lighting_scene(
            test_dir.db_path().as_path(),
            &LightingSceneDeleteRequest {
                scene_id: created.scene.id.clone(),
            },
        )
        .expect("scene delete should succeed");
        assert!(deleted.deleted);

        let final_snapshot = read_lighting_snapshot(
            &list_settings_by_prefix(test_dir.db_path().as_path(), APP_SETTINGS_PREFIX)
                .expect("settings should load"),
        );
        assert!(final_snapshot
            .scenes
            .iter()
            .all(|scene| scene.id != created.scene.id));
    }
}
