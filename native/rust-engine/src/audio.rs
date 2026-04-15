use crate::commissioning::{AUDIO_CHECK_ID, AUDIO_RECEIVE_PORT_KEY, AUDIO_SEND_HOST_KEY, AUDIO_SEND_PORT_KEY};
use serde::Serialize;
use std::collections::HashMap;

const DEFAULT_SEND_HOST: &str = "127.0.0.1";
const DEFAULT_SEND_PORT: i64 = 7001;
const DEFAULT_RECEIVE_PORT: i64 = 9001;

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

pub fn read_audio_snapshot(settings: &HashMap<String, String>) -> AudioSnapshot {
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
    let metering_state = if verified {
        String::from("transport-only")
    } else if check_status == "failed" {
        String::from("offline")
    } else {
        String::from("disabled")
    };

    AudioSnapshot {
        summary: audio_summary(&status, &send_host, send_port, receive_port),
        status,
        adapter_mode: String::from("simulated"),
        send_host,
        send_port,
        receive_port,
        connected,
        verified,
        metering_state,
        channels: Vec::new(),
        mix_targets: Vec::new(),
        snapshots: Vec::new(),
    }
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

fn audio_check_status(settings: &HashMap<String, String>) -> String {
    settings
        .get(&format!("app.commissioning.check.{AUDIO_CHECK_ID}.status"))
        .cloned()
        .unwrap_or_else(|| String::from("idle"))
}

fn audio_summary(status: &str, send_host: &str, send_port: i64, receive_port: i64) -> String {
    match status {
        "ready" => format!(
            "OSC transport is configured for {}:{} with receive port {}. Native audio sync can build on this verified transport.",
            send_host, send_port, receive_port
        ),
        "attention" => format!(
            "OSC transport check failed for {}:{} / {}. Verify host and port availability before native audio sync is enabled.",
            send_host, send_port, receive_port
        ),
        _ => format!(
            "OSC transport is configured for {}:{} with receive port {}, but the native audio probe has not run yet.",
            send_host, send_port, receive_port
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn audio_snapshot_defaults_to_not_verified() {
        let snapshot = read_audio_snapshot(&HashMap::new());
        assert_eq!(snapshot.status, "not-verified");
        assert!(!snapshot.connected);
        assert!(!snapshot.verified);
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
    }
}
