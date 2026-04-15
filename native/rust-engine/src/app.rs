use crate::app_state::{build_app_snapshot, APP_SETTINGS_PREFIX};
use crate::bootstrap::{bootstrap_runtime, RuntimeContext};
use crate::diagnostics::append_log;
use crate::legacy_import::{parse_import_request, ImportLegacyError};
use crate::planning::{
    apply_planning_selection, apply_planning_task_timer, apply_planning_task_toggle_complete,
    parse_planning_selection_request, parse_planning_settings_update,
    parse_planning_task_timer_request, parse_planning_task_toggle_complete_request,
    read_planning_context, read_planning_snapshot, update_planning_settings, PlanningCommandError,
};
use crate::planning_settings::PLANNING_SETTINGS_PREFIX;
use crate::protocol::{
    error_response, event_message, invalid_params, ok_response, RequestEnvelope, ResponseEnvelope,
};
use crate::shell_settings::{parse_settings_update, ShellSettingsSnapshot, SHELL_SETTINGS_PREFIX};
use crate::storage::{import_legacy_db, list_settings_by_prefix, set_settings, EngineResult};
use serde_json::json;

pub struct EngineApp {
    runtime: RuntimeContext,
}

pub struct EngineReply {
    pub response: ResponseEnvelope,
    pub events: Vec<serde_json::Value>,
}

impl EngineApp {
    pub fn bootstrap() -> EngineResult<Self> {
        let runtime = bootstrap_runtime()?;
        append_log(&runtime.log_file_path, "INFO", "Engine bootstrap completed")?;
        Ok(Self { runtime })
    }

    pub fn ready_event(&self) -> serde_json::Value {
        event_message(
            "engine.ready",
            json!({
                "protocol": self.runtime.protocol_version,
                "engineVersion": env!("CARGO_PKG_VERSION"),
                "appDataDir": self.runtime.app_data_dir.display().to_string(),
                "logsDir": self.runtime.logs_dir.display().to_string(),
                "logFilePath": self.runtime.log_file_path.display().to_string()
            }),
        )
    }

    pub fn handle_request(&self, request: RequestEnvelope) -> EngineReply {
        let _ = append_log(
            &self.runtime.log_file_path,
            "INFO",
            &format!("Handling request: {}", request.method),
        );

        match request.method.as_str() {
            "engine.ping" => Self::reply(ok_response(
                request.id,
                json!({
                    "protocol": self.runtime.protocol_version,
                    "engineVersion": env!("CARGO_PKG_VERSION"),
                    "echoParams": request.params,
                }),
            )),
            "health.snapshot" => Self::reply(ok_response(
                request.id,
                json!({
                    "status": if self.runtime.storage_ready { "ok" } else { "starting" },
                    "startupPhase": "storage-bootstrap",
                    "paths": {
                        "appDataDir": self.runtime.app_data_dir.display().to_string(),
                        "logsDir": self.runtime.logs_dir.display().to_string(),
                        "logFilePath": self.runtime.log_file_path.display().to_string(),
                        "dbPath": self.runtime.db_path.display().to_string(),
                        "backupDir": self.runtime.backups_dir.display().to_string()
                    },
                    "checks": {
                        "storage": {
                            "ok": self.runtime.storage_ready,
                            "dbPathExists": self.runtime.db_path.exists(),
                            "schemaVersion": self.runtime.storage_bootstrap.schema_version,
                            "journalMode": self.runtime.storage_bootstrap.journal_mode,
                            "integrityCheck": self.runtime.storage_bootstrap.integrity_check
                        },
                        "lighting": {"ok": false},
                        "audio": {"ok": false}
                    }
                }),
            )),
            "app.snapshot" => match self.read_app_snapshot() {
                Ok(result) => Self::reply(ok_response(request.id, result)),
                Err(error) => Self::reply(error_response(
                    request.id,
                    "STORAGE_ERROR",
                    error.to_string(),
                )),
            },
            "settings.get" => match self.read_shell_settings() {
                Ok(result) => Self::reply(ok_response(request.id, result)),
                Err(error) => Self::reply(error_response(
                    request.id,
                    "STORAGE_ERROR",
                    error.to_string(),
                )),
            },
            "planning.snapshot" => match self.read_planning_snapshot() {
                Ok(result) => Self::reply(ok_response(request.id, result)),
                Err(error) => Self::reply(error_response(
                    request.id,
                    "STORAGE_ERROR",
                    error.to_string(),
                )),
            },
            "planning.context" => match self.read_planning_context() {
                Ok(result) => Self::reply(ok_response(request.id, result)),
                Err(error) => Self::reply(error_response(
                    request.id,
                    "STORAGE_ERROR",
                    error.to_string(),
                )),
            },
            "planning.settings.update" => match parse_planning_settings_update(&request.params) {
                Ok(update_request) => {
                    match update_planning_settings(&self.runtime.db_path, &update_request) {
                        Ok(result) => Self::reply_with_planning_change(
                            ok_response(
                                request.id,
                                serde_json::to_value(&result).unwrap_or_else(|_| json!({})),
                            ),
                            "settings-updated",
                            result.settings.selected_project_id.as_deref(),
                            result.settings.selected_task_id.as_deref(),
                        ),
                        Err(error) => match error {
                            PlanningCommandError::InvalidParams(message) => {
                                Self::reply(invalid_params(request.id, message))
                            }
                            PlanningCommandError::Storage(message) => {
                                Self::reply(error_response(request.id, "STORAGE_ERROR", message))
                            }
                        },
                    }
                }
                Err(message) => Self::reply(invalid_params(request.id, message)),
            },
            "planning.select" => match parse_planning_selection_request(&request.params) {
                Ok(selection_request) => {
                    match apply_planning_selection(&self.runtime.db_path, &selection_request) {
                        Ok(result) => Self::reply_with_planning_change(
                            ok_response(
                                request.id,
                                serde_json::to_value(&result).unwrap_or_else(|_| json!({})),
                            ),
                            "selection-updated",
                            result.settings.selected_project_id.as_deref(),
                            result.settings.selected_task_id.as_deref(),
                        ),
                        Err(error) => match error {
                            PlanningCommandError::InvalidParams(message) => {
                                Self::reply(invalid_params(request.id, message))
                            }
                            PlanningCommandError::Storage(message) => {
                                Self::reply(error_response(request.id, "STORAGE_ERROR", message))
                            }
                        },
                    }
                }
                Err(message) => Self::reply(invalid_params(request.id, message)),
            },
            "planning.task.timer" => match parse_planning_task_timer_request(&request.params) {
                Ok(timer_request) => {
                    match apply_planning_task_timer(&self.runtime.db_path, &timer_request) {
                        Ok(result) => Self::reply_with_planning_change(
                            ok_response(
                                request.id,
                                serde_json::to_value(&result).unwrap_or_else(|_| json!({})),
                            ),
                            &format!("task-timer-{}", result.resolved_action),
                            Some(result.task.project_id.as_str()),
                            Some(result.task.id.as_str()),
                        ),
                        Err(error) => match error {
                            PlanningCommandError::InvalidParams(message) => {
                                Self::reply(invalid_params(request.id, message))
                            }
                            PlanningCommandError::Storage(message) => {
                                Self::reply(error_response(request.id, "STORAGE_ERROR", message))
                            }
                        },
                    }
                }
                Err(message) => Self::reply(invalid_params(request.id, message)),
            },
            "planning.task.toggleComplete" => {
                match parse_planning_task_toggle_complete_request(&request.params) {
                    Ok(toggle_request) => {
                        match apply_planning_task_toggle_complete(
                            &self.runtime.db_path,
                            &toggle_request,
                        ) {
                            Ok(result) => Self::reply_with_planning_change(
                                ok_response(
                                    request.id,
                                    serde_json::to_value(&result).unwrap_or_else(|_| json!({})),
                                ),
                                "task-completion-toggled",
                                Some(result.task.project_id.as_str()),
                                Some(result.task.id.as_str()),
                            ),
                            Err(error) => match error {
                                PlanningCommandError::InvalidParams(message) => {
                                    Self::reply(invalid_params(request.id, message))
                                }
                                PlanningCommandError::Storage(message) => Self::reply(
                                    error_response(request.id, "STORAGE_ERROR", message),
                                ),
                            },
                        }
                    }
                    Err(message) => Self::reply(invalid_params(request.id, message)),
                }
            }
            "settings.update" => match parse_settings_update(&request.params) {
                Ok(updates) => match set_settings(&self.runtime.db_path, &updates) {
                    Ok(()) => {
                        let _ = append_log(
                            &self.runtime.log_file_path,
                            "INFO",
                            &format!(
                                "Updated shell settings: {}",
                                Self::format_settings_updates(&updates)
                            ),
                        );

                        match self.read_shell_settings() {
                            Ok(result) => Self::reply(ok_response(request.id, result)),
                            Err(error) => Self::reply(error_response(
                                request.id,
                                "STORAGE_ERROR",
                                error.to_string(),
                            )),
                        }
                    }
                    Err(error) => Self::reply(error_response(
                        request.id,
                        "STORAGE_ERROR",
                        error.to_string(),
                    )),
                },
                Err(message) => {
                    let _ = append_log(
                        &self.runtime.log_file_path,
                        "WARN",
                        &format!("Rejected invalid settings update: {}", message),
                    );
                    Self::reply(invalid_params(request.id, message))
                }
            },
            "storage.importLegacyDb" => match parse_import_request(&request.params) {
                Ok(import_request) => {
                    match import_legacy_db(&self.runtime.db_path, &import_request) {
                        Ok(summary) => {
                            let _ = append_log(
                                &self.runtime.log_file_path,
                                "INFO",
                                &format!(
                                    "Imported legacy planning data from {}: {} projects, {} tasks",
                                    summary.source_path,
                                    summary.imported_projects,
                                    summary.imported_tasks
                                ),
                            );
                            Self::reply(ok_response(
                                request.id,
                                serde_json::to_value(summary).unwrap_or_else(|_| json!({})),
                            ))
                        }
                        Err(error) => {
                            let code = match error {
                                ImportLegacyError::ExistingDataRequiresForce => {
                                    "IMPORT_REQUIRES_FORCE"
                                }
                                ImportLegacyError::SourceNotFound(_) => "IMPORT_SOURCE_NOT_FOUND",
                                ImportLegacyError::SourceReadFailed(_)
                                | ImportLegacyError::SourceParseFailed(_)
                                | ImportLegacyError::InvalidData(_) => "IMPORT_FAILED",
                                ImportLegacyError::Storage(_) => "STORAGE_ERROR",
                            };
                            let _ = append_log(
                                &self.runtime.log_file_path,
                                "WARN",
                                &format!("Legacy import failed: {}", error),
                            );
                            Self::reply(error_response(request.id, code, error.to_string()))
                        }
                    }
                }
                Err(message) => Self::reply(invalid_params(request.id, message)),
            },
            _ => Self::reply(error_response(
                request.id,
                "UNKNOWN_METHOD",
                format!("Unsupported method: {}", request.method),
            )),
        }
    }

    fn read_shell_settings(&self) -> EngineResult<serde_json::Value> {
        let settings = list_settings_by_prefix(&self.runtime.db_path, SHELL_SETTINGS_PREFIX)?;
        let snapshot = ShellSettingsSnapshot::from_settings(&settings);
        Ok(snapshot.to_response_payload(&settings))
    }

    fn read_app_snapshot(&self) -> EngineResult<serde_json::Value> {
        let shell_settings = list_settings_by_prefix(&self.runtime.db_path, SHELL_SETTINGS_PREFIX)?;
        let app_settings = list_settings_by_prefix(&self.runtime.db_path, APP_SETTINGS_PREFIX)?;
        let planning_settings =
            list_settings_by_prefix(&self.runtime.db_path, PLANNING_SETTINGS_PREFIX)?;
        Ok(build_app_snapshot(
            &self.runtime,
            &shell_settings,
            &app_settings,
            &planning_settings,
        ))
    }

    fn read_planning_snapshot(&self) -> EngineResult<serde_json::Value> {
        let planning_settings =
            list_settings_by_prefix(&self.runtime.db_path, PLANNING_SETTINGS_PREFIX)?;
        Ok(serde_json::to_value(read_planning_snapshot(
            &self.runtime.db_path,
            &planning_settings,
        )?)?)
    }

    fn read_planning_context(&self) -> EngineResult<serde_json::Value> {
        let planning_settings =
            list_settings_by_prefix(&self.runtime.db_path, PLANNING_SETTINGS_PREFIX)?;
        Ok(serde_json::to_value(read_planning_context(
            &self.runtime.db_path,
            &planning_settings,
        )?)?)
    }

    fn format_settings_updates(updates: &[(&str, String)]) -> String {
        updates
            .iter()
            .map(|(key, value)| format!("{key}={value}"))
            .collect::<Vec<_>>()
            .join(", ")
    }

    fn reply(response: ResponseEnvelope) -> EngineReply {
        EngineReply {
            response,
            events: Vec::new(),
        }
    }

    fn reply_with_planning_change(
        response: ResponseEnvelope,
        reason: &str,
        project_id: Option<&str>,
        task_id: Option<&str>,
    ) -> EngineReply {
        EngineReply {
            response,
            events: vec![event_message(
                "planning.changed",
                json!({
                    "reason": reason,
                    "projectId": project_id,
                    "taskId": task_id
                }),
            )],
        }
    }
}
