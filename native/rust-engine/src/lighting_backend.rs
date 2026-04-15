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

pub trait LightingBackend {
    fn read_inventory(&self, config: &LightingBackendConfig) -> LightingBackendInventory;
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
                },
                LightingSceneSnapshot {
                    id: String::from("scene-teaching"),
                    name: String::from("Teaching"),
                },
                LightingSceneSnapshot {
                    id: String::from("scene-stream"),
                    name: String::from("Stream"),
                },
            ],
        }
    }
}

pub fn read_default_lighting_inventory(config: &LightingBackendConfig) -> LightingBackendInventory {
    SimulatedLightingBackend.read_inventory(config)
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
}
