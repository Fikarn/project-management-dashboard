use crate::lighting::{LightingFixtureSnapshot, LightingGroupSnapshot, LightingSceneSnapshot};

pub struct LightingBackendConfig {
    pub enabled: bool,
    pub bridge_ip: String,
    pub universe: i64,
}

pub struct LightingBackendInventory {
    pub adapter_mode: String,
    pub fixtures: Vec<LightingFixtureSnapshot>,
    pub groups: Vec<LightingGroupSnapshot>,
    pub scenes: Vec<LightingSceneSnapshot>,
}

#[derive(Debug)]
pub struct LightingSceneRecallOutcome {
    pub scene_name: String,
    pub summary: String,
}

pub trait LightingBackend {
    fn read_inventory(&self, config: &LightingBackendConfig) -> LightingBackendInventory;
    fn recall_scene(
        &self,
        config: &LightingBackendConfig,
        inventory: &LightingBackendInventory,
        scene_id: &str,
        fade_duration_seconds: f64,
    ) -> Result<LightingSceneRecallOutcome, String>;
}

pub struct SimulatedLightingBackend;

impl LightingBackend for SimulatedLightingBackend {
    fn read_inventory(&self, config: &LightingBackendConfig) -> LightingBackendInventory {
        if !config.enabled || config.bridge_ip.trim().is_empty() || config.universe <= 0 {
            return LightingBackendInventory {
                adapter_mode: String::from("simulated"),
                fixtures: Vec::new(),
                groups: Vec::new(),
                scenes: Vec::new(),
            };
        }

        LightingBackendInventory {
            adapter_mode: String::from("simulated"),
            fixtures: vec![
                LightingFixtureSnapshot {
                    id: String::from("fixture-key-left"),
                    name: String::from("Key Left"),
                    kind: String::from("profile"),
                },
                LightingFixtureSnapshot {
                    id: String::from("fixture-key-right"),
                    name: String::from("Key Right"),
                    kind: String::from("profile"),
                },
                LightingFixtureSnapshot {
                    id: String::from("fixture-backline-wash"),
                    name: String::from("Backline Wash"),
                    kind: String::from("wash"),
                },
                LightingFixtureSnapshot {
                    id: String::from("fixture-house-practicals"),
                    name: String::from("House Practicals"),
                    kind: String::from("practical"),
                },
            ],
            groups: vec![
                LightingGroupSnapshot {
                    id: String::from("group-stage"),
                    name: String::from("Stage"),
                },
                LightingGroupSnapshot {
                    id: String::from("group-room"),
                    name: String::from("Room"),
                },
            ],
            scenes: vec![
                LightingSceneSnapshot {
                    id: String::from("scene-prep"),
                    name: String::from("Prep"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
                LightingSceneSnapshot {
                    id: String::from("scene-teaching"),
                    name: String::from("Teaching"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
                LightingSceneSnapshot {
                    id: String::from("scene-stream"),
                    name: String::from("Stream"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
            ],
        }
    }

    fn recall_scene(
        &self,
        config: &LightingBackendConfig,
        inventory: &LightingBackendInventory,
        scene_id: &str,
        fade_duration_seconds: f64,
    ) -> Result<LightingSceneRecallOutcome, String> {
        if !config.enabled || config.bridge_ip.trim().is_empty() || config.universe <= 0 {
            return Err(String::from("Lighting bridge transport is not configured."));
        }

        let scene = inventory
            .scenes
            .iter()
            .find(|entry| entry.id == scene_id)
            .ok_or_else(|| format!("Lighting scene '{scene_id}' is not exposed by the backend."))?;

        let mode = if fade_duration_seconds > 0.0 {
            format!("{}s simulated fade", fade_duration_seconds)
        } else {
            String::from("instant simulated recall")
        };

        Ok(LightingSceneRecallOutcome {
            scene_name: scene.name.clone(),
            summary: format!(
                "Simulated lighting scene '{}' was recalled via {} on {} universe {}.",
                scene.name, mode, config.bridge_ip, config.universe
            ),
        })
    }
}

pub fn read_default_lighting_inventory(config: &LightingBackendConfig) -> LightingBackendInventory {
    SimulatedLightingBackend.read_inventory(config)
}

pub fn recall_default_lighting_scene(
    config: &LightingBackendConfig,
    inventory: &LightingBackendInventory,
    scene_id: &str,
    fade_duration_seconds: f64,
) -> Result<LightingSceneRecallOutcome, String> {
    SimulatedLightingBackend.recall_scene(config, inventory, scene_id, fade_duration_seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simulated_lighting_backend_returns_empty_inventory_when_disabled() {
        let inventory = read_default_lighting_inventory(&LightingBackendConfig {
            enabled: false,
            bridge_ip: String::new(),
            universe: 1,
        });

        assert_eq!(inventory.adapter_mode, "simulated");
        assert!(inventory.fixtures.is_empty());
        assert!(inventory.groups.is_empty());
        assert!(inventory.scenes.is_empty());
    }

    #[test]
    fn simulated_lighting_backend_returns_inventory_when_configured() {
        let inventory = read_default_lighting_inventory(&LightingBackendConfig {
            enabled: true,
            bridge_ip: String::from("2.0.0.10"),
            universe: 1,
        });

        assert_eq!(inventory.adapter_mode, "simulated");
        assert_eq!(inventory.fixtures.len(), 4);
        assert_eq!(inventory.groups.len(), 2);
        assert_eq!(inventory.scenes.len(), 3);
    }

    #[test]
    fn simulated_lighting_backend_recalls_known_scene() {
        let config = LightingBackendConfig {
            enabled: true,
            bridge_ip: String::from("2.0.0.10"),
            universe: 1,
        };
        let inventory = read_default_lighting_inventory(&config);

        let outcome = recall_default_lighting_scene(&config, &inventory, "scene-prep", 0.0)
            .expect("known scene should recall");

        assert!(outcome.summary.contains("scene 'Prep'"));
    }

    #[test]
    fn simulated_lighting_backend_rejects_unknown_scene() {
        let config = LightingBackendConfig {
            enabled: true,
            bridge_ip: String::from("2.0.0.10"),
            universe: 1,
        };
        let inventory = read_default_lighting_inventory(&config);

        let error = recall_default_lighting_scene(&config, &inventory, "scene-missing", 0.0)
            .expect_err("unknown scene should fail");

        assert!(error.contains("scene-missing"));
    }
}
