use crate::commissioning::{LIGHTING_BRIDGE_IP_KEY, LIGHTING_CHECK_ID, LIGHTING_UNIVERSE_KEY};
use serde::Serialize;
use std::collections::HashMap;

const DEFAULT_UNIVERSE: i64 = 1;

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

pub fn read_lighting_snapshot(settings: &HashMap<String, String>) -> LightingSnapshot {
    let bridge_ip = settings
        .get(LIGHTING_BRIDGE_IP_KEY)
        .cloned()
        .unwrap_or_default();
    let universe = settings
        .get(LIGHTING_UNIVERSE_KEY)
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| (1..=63999).contains(value))
        .unwrap_or(DEFAULT_UNIVERSE);
    let check_status = lighting_check_status(settings);
    let enabled = !bridge_ip.trim().is_empty();
    let reachable = check_status == "passed";
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
        summary: lighting_summary(&status, &bridge_ip, universe),
        status,
        adapter_mode: String::from("simulated"),
        bridge_ip,
        universe,
        enabled,
        connected: reachable,
        reachable,
        fixtures: Vec::new(),
        groups: Vec::new(),
        scenes: Vec::new(),
    }
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

fn lighting_check_status(settings: &HashMap<String, String>) -> String {
    settings
        .get(&format!("app.commissioning.check.{LIGHTING_CHECK_ID}.status"))
        .cloned()
        .unwrap_or_else(|| String::from("idle"))
}

fn lighting_summary(status: &str, bridge_ip: &str, universe: i64) -> String {
    match status {
        "ready" => format!(
            "Bridge {} responded on universe {}. Native lighting health is ready for adapter integration.",
            bridge_ip, universe
        ),
        "attention" => format!(
            "Bridge {} did not respond on universe {}. Verify cabling and address configuration.",
            bridge_ip, universe
        ),
        "not-verified" => format!(
            "Bridge {} is configured on universe {}, but the native lighting probe has not run yet.",
            bridge_ip, universe
        ),
        _ => String::from(
            "No lighting bridge is configured yet. Run the commissioning lighting probe before adapter work lands.",
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

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
            (String::from(LIGHTING_BRIDGE_IP_KEY), String::from("2.0.0.10")),
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
    }
}
