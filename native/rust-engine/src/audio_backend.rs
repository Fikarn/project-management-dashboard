use crate::audio::{AudioChannelSnapshot, AudioMixTargetSnapshot, AudioSceneSnapshot};

pub struct AudioBackendConfig {
    pub send_host: String,
    pub send_port: i64,
    pub receive_port: i64,
}

pub struct AudioBackendInventory {
    pub adapter_mode: String,
    pub channels: Vec<AudioChannelSnapshot>,
    pub mix_targets: Vec<AudioMixTargetSnapshot>,
    pub snapshots: Vec<AudioSceneSnapshot>,
}

#[derive(Debug)]
pub struct AudioSyncOutcome {
    pub summary: String,
}

#[derive(Debug)]
pub struct AudioSnapshotRecallOutcome {
    pub snapshot_name: String,
    pub summary: String,
}

pub trait AudioBackend {
    fn read_inventory(&self, config: &AudioBackendConfig) -> AudioBackendInventory;
    fn sync_console(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
    ) -> Result<AudioSyncOutcome, String>;
    fn recall_snapshot(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        snapshot_id: &str,
    ) -> Result<AudioSnapshotRecallOutcome, String>;
}

pub struct SimulatedAudioBackend;

impl AudioBackend for SimulatedAudioBackend {
    fn read_inventory(&self, config: &AudioBackendConfig) -> AudioBackendInventory {
        if config.send_host.trim().is_empty() || config.send_port <= 0 || config.receive_port <= 0 {
            return AudioBackendInventory {
                adapter_mode: String::from("simulated"),
                channels: Vec::new(),
                mix_targets: Vec::new(),
                snapshots: Vec::new(),
            };
        }

        AudioBackendInventory {
            adapter_mode: String::from("simulated"),
            channels: vec![
                AudioChannelSnapshot {
                    id: String::from("channel-host"),
                    name: String::from("Host Mic"),
                },
                AudioChannelSnapshot {
                    id: String::from("channel-guest"),
                    name: String::from("Guest Mic"),
                },
                AudioChannelSnapshot {
                    id: String::from("channel-playback"),
                    name: String::from("Playback"),
                },
                AudioChannelSnapshot {
                    id: String::from("channel-stream"),
                    name: String::from("Stream Return"),
                },
                AudioChannelSnapshot {
                    id: String::from("channel-room"),
                    name: String::from("Room Ambience"),
                },
                AudioChannelSnapshot {
                    id: String::from("channel-program"),
                    name: String::from("Program"),
                },
            ],
            mix_targets: vec![
                AudioMixTargetSnapshot {
                    id: String::from("mix-foh"),
                    name: String::from("FOH"),
                },
                AudioMixTargetSnapshot {
                    id: String::from("mix-stream"),
                    name: String::from("Stream"),
                },
                AudioMixTargetSnapshot {
                    id: String::from("mix-record"),
                    name: String::from("Record"),
                },
            ],
            snapshots: vec![
                AudioSceneSnapshot {
                    id: String::from("snapshot-default"),
                    name: String::from("Default"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
                AudioSceneSnapshot {
                    id: String::from("snapshot-panel"),
                    name: String::from("Panel"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
                AudioSceneSnapshot {
                    id: String::from("snapshot-broadcast"),
                    name: String::from("Broadcast"),
                    last_recalled: false,
                    last_recalled_at: None,
                },
            ],
        }
    }

    fn sync_console(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
    ) -> Result<AudioSyncOutcome, String> {
        if config.send_host.trim().is_empty() || config.send_port <= 0 || config.receive_port <= 0 {
            return Err(String::from("Audio OSC transport is not configured."));
        }

        if inventory.channels.is_empty() || inventory.mix_targets.is_empty() {
            return Err(String::from(
                "Audio inventory is empty, so the simulated backend cannot stage a console sync.",
            ));
        }

        Ok(AudioSyncOutcome {
            summary: format!(
                "Simulated console sync staged {} channels and {} mix targets over {}:{} / {}.",
                inventory.channels.len(),
                inventory.mix_targets.len(),
                config.send_host,
                config.send_port,
                config.receive_port
            ),
        })
    }

    fn recall_snapshot(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        snapshot_id: &str,
    ) -> Result<AudioSnapshotRecallOutcome, String> {
        if config.send_host.trim().is_empty() || config.send_port <= 0 || config.receive_port <= 0 {
            return Err(String::from("Audio OSC transport is not configured."));
        }

        let snapshot = inventory
            .snapshots
            .iter()
            .find(|entry| entry.id == snapshot_id)
            .ok_or_else(|| {
                format!("Audio snapshot '{snapshot_id}' is not exposed by the backend.")
            })?;

        Ok(AudioSnapshotRecallOutcome {
            snapshot_name: snapshot.name.clone(),
            summary: format!(
                "Simulated audio snapshot '{}' was recalled over {}:{} / {}.",
                snapshot.name, config.send_host, config.send_port, config.receive_port
            ),
        })
    }
}

pub fn read_default_audio_inventory(config: &AudioBackendConfig) -> AudioBackendInventory {
    SimulatedAudioBackend.read_inventory(config)
}

pub fn sync_default_audio_console(
    config: &AudioBackendConfig,
    inventory: &AudioBackendInventory,
) -> Result<AudioSyncOutcome, String> {
    SimulatedAudioBackend.sync_console(config, inventory)
}

pub fn recall_default_audio_snapshot(
    config: &AudioBackendConfig,
    inventory: &AudioBackendInventory,
    snapshot_id: &str,
) -> Result<AudioSnapshotRecallOutcome, String> {
    SimulatedAudioBackend.recall_snapshot(config, inventory, snapshot_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simulated_audio_backend_returns_empty_inventory_for_invalid_transport() {
        let inventory = read_default_audio_inventory(&AudioBackendConfig {
            send_host: String::new(),
            send_port: 0,
            receive_port: 0,
        });

        assert_eq!(inventory.adapter_mode, "simulated");
        assert!(inventory.channels.is_empty());
        assert!(inventory.mix_targets.is_empty());
        assert!(inventory.snapshots.is_empty());
    }

    #[test]
    fn simulated_audio_backend_returns_inventory_for_valid_transport() {
        let inventory = read_default_audio_inventory(&AudioBackendConfig {
            send_host: String::from("127.0.0.1"),
            send_port: 7001,
            receive_port: 9001,
        });

        assert_eq!(inventory.adapter_mode, "simulated");
        assert_eq!(inventory.channels.len(), 6);
        assert_eq!(inventory.mix_targets.len(), 3);
        assert_eq!(inventory.snapshots.len(), 3);
    }

    #[test]
    fn simulated_audio_backend_syncs_when_transport_and_inventory_exist() {
        let config = AudioBackendConfig {
            send_host: String::from("127.0.0.1"),
            send_port: 7001,
            receive_port: 9001,
        };
        let inventory = read_default_audio_inventory(&config);

        let outcome =
            sync_default_audio_console(&config, &inventory).expect("simulated sync should succeed");

        assert!(outcome.summary.contains("Simulated console sync"));
    }

    #[test]
    fn simulated_audio_backend_rejects_unknown_snapshot() {
        let config = AudioBackendConfig {
            send_host: String::from("127.0.0.1"),
            send_port: 7001,
            receive_port: 9001,
        };
        let inventory = read_default_audio_inventory(&config);

        let error = recall_default_audio_snapshot(&config, &inventory, "snapshot-missing")
            .expect_err("unknown snapshot should be rejected");

        assert!(error.contains("snapshot-missing"));
    }
}
