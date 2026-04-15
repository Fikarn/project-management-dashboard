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

pub trait AudioBackend {
    fn read_inventory(&self, config: &AudioBackendConfig) -> AudioBackendInventory;
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
                },
                AudioSceneSnapshot {
                    id: String::from("snapshot-panel"),
                    name: String::from("Panel"),
                },
                AudioSceneSnapshot {
                    id: String::from("snapshot-broadcast"),
                    name: String::from("Broadcast"),
                },
            ],
        }
    }
}

pub fn read_default_audio_inventory(config: &AudioBackendConfig) -> AudioBackendInventory {
    SimulatedAudioBackend.read_inventory(config)
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
}
