use crate::audio::{
    AudioChannelSnapshot, AudioChannelUpdateRequest, AudioMixTargetSnapshot,
    AudioMixTargetUpdateRequest, AudioSceneSnapshot,
};
use std::collections::HashMap;

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

#[derive(Debug)]
pub struct AudioChannelUpdateOutcome {
    pub summary: String,
}

#[derive(Debug)]
pub struct AudioMixTargetUpdateOutcome {
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
    fn update_channel(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        request: &AudioChannelUpdateRequest,
    ) -> Result<AudioChannelUpdateOutcome, String>;
    fn update_mix_target(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        request: &AudioMixTargetUpdateRequest,
    ) -> Result<AudioMixTargetUpdateOutcome, String>;
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
                simulated_channel(
                    "audio-input-9",
                    "Front 9",
                    "IN 9",
                    "front-preamp",
                    false,
                    34,
                    0.76,
                ),
                simulated_channel(
                    "audio-input-10",
                    "Front 10",
                    "IN 10",
                    "front-preamp",
                    false,
                    34,
                    0.76,
                ),
                simulated_channel(
                    "audio-input-11",
                    "Front 11",
                    "IN 11",
                    "front-preamp",
                    false,
                    32,
                    0.74,
                ),
                simulated_channel(
                    "audio-input-12",
                    "Front 12",
                    "IN 12",
                    "front-preamp",
                    false,
                    32,
                    0.74,
                ),
                simulated_channel(
                    "audio-input-1",
                    "Line 1",
                    "L 1",
                    "rear-line",
                    false,
                    0,
                    0.68,
                ),
                simulated_channel(
                    "audio-input-2",
                    "Line 2",
                    "L 2",
                    "rear-line",
                    false,
                    0,
                    0.68,
                ),
                simulated_channel(
                    "audio-input-3",
                    "Line 3",
                    "L 3",
                    "rear-line",
                    false,
                    0,
                    0.66,
                ),
                simulated_channel(
                    "audio-input-4",
                    "Line 4",
                    "L 4",
                    "rear-line",
                    false,
                    0,
                    0.66,
                ),
                simulated_channel(
                    "audio-input-5",
                    "Line 5",
                    "L 5",
                    "rear-line",
                    false,
                    0,
                    0.64,
                ),
                simulated_channel(
                    "audio-input-6",
                    "Line 6",
                    "L 6",
                    "rear-line",
                    false,
                    0,
                    0.64,
                ),
                simulated_channel(
                    "audio-input-7",
                    "Line 7",
                    "L 7",
                    "rear-line",
                    false,
                    0,
                    0.62,
                ),
                simulated_channel(
                    "audio-input-8",
                    "Line 8",
                    "L 8",
                    "rear-line",
                    false,
                    0,
                    0.62,
                ),
                simulated_channel(
                    "audio-playback-1-2",
                    "Playback 1/2",
                    "PB 1/2",
                    "playback-pair",
                    true,
                    0,
                    0.58,
                ),
                simulated_channel(
                    "audio-playback-3-4",
                    "Playback 3/4",
                    "PB 3/4",
                    "playback-pair",
                    true,
                    0,
                    0.56,
                ),
                simulated_channel(
                    "audio-playback-5-6",
                    "Playback 5/6",
                    "PB 5/6",
                    "playback-pair",
                    true,
                    0,
                    0.54,
                ),
                simulated_channel(
                    "audio-playback-7-8",
                    "Playback 7/8",
                    "PB 7/8",
                    "playback-pair",
                    true,
                    0,
                    0.52,
                ),
                simulated_channel(
                    "audio-playback-9-10",
                    "Playback 9/10",
                    "PB 9/10",
                    "playback-pair",
                    true,
                    0,
                    0.52,
                ),
                simulated_channel(
                    "audio-playback-11-12",
                    "Playback 11/12",
                    "PB 11/12",
                    "playback-pair",
                    true,
                    0,
                    0.50,
                ),
            ],
            mix_targets: vec![
                AudioMixTargetSnapshot {
                    id: String::from("audio-mix-main"),
                    name: String::from("Main Out"),
                    short_name: String::from("MAIN"),
                    role: String::from("main-out"),
                    volume: 0.78,
                    mute: false,
                    dim: false,
                    mono: false,
                    talkback: false,
                },
                AudioMixTargetSnapshot {
                    id: String::from("audio-mix-phones-a"),
                    name: String::from("Phones 1"),
                    short_name: String::from("HP 1"),
                    role: String::from("phones-a"),
                    volume: 0.72,
                    mute: false,
                    dim: false,
                    mono: false,
                    talkback: false,
                },
                AudioMixTargetSnapshot {
                    id: String::from("audio-mix-phones-b"),
                    name: String::from("Phones 2"),
                    short_name: String::from("HP 2"),
                    role: String::from("phones-b"),
                    volume: 0.68,
                    mute: false,
                    dim: false,
                    mono: false,
                    talkback: false,
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
        ensure_transport_configured(config)?;

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
        ensure_transport_configured(config)?;

        let snapshot = inventory
            .snapshots
            .iter()
            .find(|entry| entry.id == snapshot_id)
            .ok_or_else(|| format!("Audio snapshot '{snapshot_id}' is not exposed by the backend."))?;

        Ok(AudioSnapshotRecallOutcome {
            snapshot_name: snapshot.name.clone(),
            summary: format!(
                "Simulated audio snapshot '{}' was recalled over {}:{} / {}.",
                snapshot.name, config.send_host, config.send_port, config.receive_port
            ),
        })
    }

    fn update_channel(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        request: &AudioChannelUpdateRequest,
    ) -> Result<AudioChannelUpdateOutcome, String> {
        ensure_transport_configured(config)?;

        let channel = inventory
            .channels
            .iter()
            .find(|entry| entry.id == request.channel_id)
            .ok_or_else(|| format!("Audio channel '{}' is not exposed by the backend.", request.channel_id))?;

        if let Some(mix_target_id) = request.mix_target_id.as_deref() {
            if !inventory.mix_targets.iter().any(|entry| entry.id == mix_target_id) {
                return Err(format!(
                    "Audio mix target '{}' is not exposed by the backend.",
                    mix_target_id
                ));
            }
        }

        let mut changes = Vec::new();
        if let Some(fader) = request.fader {
            let mix_target = request
                .mix_target_id
                .clone()
                .unwrap_or_else(|| String::from("audio-mix-main"));
            changes.push(format!("send {} -> {:.2}", mix_target, fader));
        }
        if let Some(gain) = request.gain {
            changes.push(format!("gain -> {}", gain));
        }
        if let Some(mute) = request.mute {
            changes.push(format!("mute -> {}", bool_label(mute)));
        }
        if let Some(solo) = request.solo {
            changes.push(format!("solo -> {}", bool_label(solo)));
        }
        if let Some(phantom) = request.phantom {
            changes.push(format!("phantom -> {}", bool_label(phantom)));
        }
        if let Some(phase) = request.phase {
            changes.push(format!("phase -> {}", bool_label(phase)));
        }
        if let Some(pad) = request.pad {
            changes.push(format!("pad -> {}", bool_label(pad)));
        }
        if let Some(instrument) = request.instrument {
            changes.push(format!("instrument -> {}", bool_label(instrument)));
        }
        if let Some(auto_set) = request.auto_set {
            changes.push(format!("auto-set -> {}", bool_label(auto_set)));
        }

        Ok(AudioChannelUpdateOutcome {
            summary: format!(
                "Simulated audio channel '{}' updated over {}:{} / {} ({})",
                channel.name,
                config.send_host,
                config.send_port,
                config.receive_port,
                changes.join(", ")
            ),
        })
    }

    fn update_mix_target(
        &self,
        config: &AudioBackendConfig,
        inventory: &AudioBackendInventory,
        request: &AudioMixTargetUpdateRequest,
    ) -> Result<AudioMixTargetUpdateOutcome, String> {
        ensure_transport_configured(config)?;

        let mix_target = inventory
            .mix_targets
            .iter()
            .find(|entry| entry.id == request.mix_target_id)
            .ok_or_else(|| {
                format!(
                    "Audio mix target '{}' is not exposed by the backend.",
                    request.mix_target_id
                )
            })?;

        let mut changes = Vec::new();
        if let Some(volume) = request.volume {
            changes.push(format!("volume -> {:.2}", volume));
        }
        if let Some(mute) = request.mute {
            changes.push(format!("mute -> {}", bool_label(mute)));
        }
        if let Some(dim) = request.dim {
            changes.push(format!("dim -> {}", bool_label(dim)));
        }
        if let Some(mono) = request.mono {
            changes.push(format!("mono -> {}", bool_label(mono)));
        }
        if let Some(talkback) = request.talkback {
            changes.push(format!("talkback -> {}", bool_label(talkback)));
        }

        Ok(AudioMixTargetUpdateOutcome {
            summary: format!(
                "Simulated mix target '{}' updated over {}:{} / {} ({})",
                mix_target.name,
                config.send_host,
                config.send_port,
                config.receive_port,
                changes.join(", ")
            ),
        })
    }
}

fn ensure_transport_configured(config: &AudioBackendConfig) -> Result<(), String> {
    if config.send_host.trim().is_empty() || config.send_port <= 0 || config.receive_port <= 0 {
        return Err(String::from("Audio OSC transport is not configured."));
    }

    Ok(())
}

fn bool_label(value: bool) -> &'static str {
    if value {
        "on"
    } else {
        "off"
    }
}

fn simulated_channel(
    id: &str,
    name: &str,
    short_name: &str,
    role: &str,
    stereo: bool,
    gain: i64,
    fader: f64,
) -> AudioChannelSnapshot {
    AudioChannelSnapshot {
        id: String::from(id),
        name: String::from(name),
        short_name: String::from(short_name),
        role: String::from(role),
        stereo,
        gain,
        fader,
        mix_levels: default_mix_levels(fader, role),
        mute: false,
        solo: false,
        phantom: false,
        phase: false,
        pad: false,
        instrument: false,
        auto_set: false,
    }
}

fn default_mix_levels(main: f64, role: &str) -> HashMap<String, f64> {
    let (phones_a_pad, phones_b_pad) = if role == "playback-pair" {
        (0.02, 0.06)
    } else {
        (0.08, 0.12)
    };

    HashMap::from([
        (String::from("audio-mix-main"), main),
        (
            String::from("audio-mix-phones-a"),
            (main - phones_a_pad).clamp(0.0, 1.0),
        ),
        (
            String::from("audio-mix-phones-b"),
            (main - phones_b_pad).clamp(0.0, 1.0),
        ),
    ])
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

pub fn update_default_audio_channel(
    config: &AudioBackendConfig,
    inventory: &AudioBackendInventory,
    request: &AudioChannelUpdateRequest,
) -> Result<AudioChannelUpdateOutcome, String> {
    SimulatedAudioBackend.update_channel(config, inventory, request)
}

pub fn update_default_audio_mix_target(
    config: &AudioBackendConfig,
    inventory: &AudioBackendInventory,
    request: &AudioMixTargetUpdateRequest,
) -> Result<AudioMixTargetUpdateOutcome, String> {
    SimulatedAudioBackend.update_mix_target(config, inventory, request)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_config() -> AudioBackendConfig {
        AudioBackendConfig {
            send_host: String::from("127.0.0.1"),
            send_port: 7001,
            receive_port: 9001,
        }
    }

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
        let inventory = read_default_audio_inventory(&valid_config());

        assert_eq!(inventory.adapter_mode, "simulated");
        assert_eq!(inventory.channels.len(), 18);
        assert_eq!(inventory.mix_targets.len(), 3);
        assert_eq!(inventory.snapshots.len(), 3);
    }

    #[test]
    fn simulated_audio_backend_syncs_when_transport_and_inventory_exist() {
        let config = valid_config();
        let inventory = read_default_audio_inventory(&config);

        let outcome =
            sync_default_audio_console(&config, &inventory).expect("simulated sync should succeed");

        assert!(outcome.summary.contains("Simulated console sync"));
    }

    #[test]
    fn simulated_audio_backend_rejects_unknown_snapshot() {
        let config = valid_config();
        let inventory = read_default_audio_inventory(&config);

        let error = recall_default_audio_snapshot(&config, &inventory, "snapshot-missing")
            .expect_err("unknown snapshot should be rejected");

        assert!(error.contains("snapshot-missing"));
    }

    #[test]
    fn simulated_audio_backend_updates_channels() {
        let config = valid_config();
        let inventory = read_default_audio_inventory(&config);

        let outcome = update_default_audio_channel(
            &config,
            &inventory,
            &AudioChannelUpdateRequest {
                channel_id: String::from("audio-input-9"),
                mix_target_id: Some(String::from("audio-mix-main")),
                gain: None,
                fader: Some(0.82),
                mute: Some(true),
                solo: None,
                phantom: None,
                phase: None,
                pad: None,
                instrument: None,
                auto_set: None,
            },
        )
        .expect("channel update should succeed");

        assert!(outcome.summary.contains("Front 9"));
        assert!(outcome.summary.contains("mute -> on"));
    }

    #[test]
    fn simulated_audio_backend_updates_mix_targets() {
        let config = valid_config();
        let inventory = read_default_audio_inventory(&config);

        let outcome = update_default_audio_mix_target(
            &config,
            &inventory,
            &AudioMixTargetUpdateRequest {
                mix_target_id: String::from("audio-mix-main"),
                volume: Some(0.88),
                mute: Some(false),
                dim: Some(true),
                mono: None,
                talkback: None,
            },
        )
        .expect("mix target update should succeed");

        assert!(outcome.summary.contains("Main Out"));
        assert!(outcome.summary.contains("dim -> on"));
    }
}
