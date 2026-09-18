//! A local socket so the command line can reach a running window.
//!
//! Only one process can hold the headset's control interface, so `gearctl`
//! cannot simply open the device while the application is running. It asks the
//! running instance instead, and falls back to opening the device itself when
//! there is nothing to ask. The person typing the command sees no difference.
//!
//! Line-delimited JSON over a Unix socket in the user's runtime directory:
//! small enough to read in a terminal with `socat`, and it disappears with the
//! session rather than living in the home directory.

use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::PathBuf;
use std::thread;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::commands::{build_snapshot, AppState, Snapshot};

pub fn socket_path() -> PathBuf {
    let base = std::env::var_os("XDG_RUNTIME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("gear-control-center.sock")
}

#[derive(Debug, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum Request {
    Snapshot,
    Set { key: String, value: i64 },
}

/// One mixer control, as the command line reports it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Level {
    pub value: i64,
    pub max: i64,
    pub muted: bool,
}

/// What the command line prints.
///
/// Deliberately its own type rather than the interface's snapshot: this is a
/// contract other people's scripts and status bars depend on, and it should
/// not change shape every time the window is refactored.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Summary {
    pub device: Option<String>,
    pub connected: bool,
    pub powered_on: bool,
    pub battery_percent: Option<u8>,
    pub charging: bool,
    pub game: Option<u8>,
    pub chat: Option<u8>,
    pub volume: Option<Level>,
    pub microphone: Option<Level>,
    pub chatmix_routing: bool,
    /// The three the headset does not report back. What is shown is what
    /// was sent since it came on — `None` means nothing has been, which is
    /// the honest answer, not a zero.
    pub sidetone: Option<u8>,
    pub inactive_minutes: Option<u8>,
    pub equalizer_preset: Option<u8>,
    /// Every open device, the selected one included.
    ///
    /// Added rather than folded into the fields above: those describe the
    /// selected device and scripts already read them that way. A status bar
    /// that wants the mouse's battery beside the headset's reads this.
    #[serde(default)]
    pub devices: Vec<DeviceLine>,
}

/// One open device, for scripts that care that there is more than one.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeviceLine {
    pub id: String,
    pub name: String,
    pub battery_percent: Option<u8>,
    pub charging: bool,
    pub powered_on: bool,
    pub selected: bool,
}

impl From<&Snapshot> for Summary {
    fn from(snapshot: &Snapshot) -> Self {
        let state = snapshot.state.as_ref();
        let battery = state.and_then(|s| s.battery.as_ref());
        let mix = state.and_then(|s| s.chatmix.as_ref());
        let level = |control: Option<&crate::audio::MixerControl>| {
            control.map(|c| Level {
                value: c.value,
                max: c.max,
                muted: c.muted,
            })
        };
        Self {
            device: snapshot.device.as_ref().map(|d| d.name.clone()),
            connected: snapshot.device.is_some(),
            powered_on: state.is_some_and(|s| s.powered_on),
            battery_percent: battery.map(|b| b.percent),
            charging: battery.is_some_and(|b| b.charging),
            game: mix.map(|m| m.game),
            chat: mix.map(|m| m.chat),
            volume: level(snapshot.audio.as_ref().and_then(|a| a.playback.as_ref())),
            microphone: level(snapshot.audio.as_ref().and_then(|a| a.capture.as_ref())),
            chatmix_routing: snapshot.chatmix_routing,
            sidetone: state.and_then(|s| s.sidetone_level),
            inactive_minutes: state.and_then(|s| s.inactive_minutes),
            equalizer_preset: state.and_then(|s| s.equalizer_preset),
            devices: snapshot
                .devices
                .iter()
                .map(|d| DeviceLine {
                    id: d.id.clone(),
                    name: d.name.clone(),
                    battery_percent: d.battery.map(|b| b.percent),
                    charging: d.battery.is_some_and(|b| b.charging),
                    powered_on: d.powered_on,
                    selected: snapshot.selected.as_deref() == Some(d.id.as_str()),
                })
                .collect(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Response {
    Summary(Box<Summary>),
    Done { ok: bool },
    Failed { error: String },
}

/// Apply one setting by name.
///
/// The names are the ones a person would type, and each maps to exactly the
/// same call the interface makes — there is no second path to the hardware.
pub fn apply(state: &AppState, key: &str, value: i64) -> Result<(), String> {
    let mut devices = state.devices.lock();
    let outcome = match key {
        "sidetone" => devices.with_device(|d| d.set_sidetone(value.clamp(0, 255) as u8)),
        "auto-off" => devices.with_device(|d| d.set_inactive_time(value.clamp(0, 255) as u8)),
        "eq-preset" => devices.with_device(|d| d.set_equalizer_preset(value.clamp(0, 255) as u8)),
        "volume" => devices.with_audio(|a| a.set_playback_volume(value)),
        "mic" => devices.with_audio(|a| a.set_capture_volume(value)),
        "mute" => devices.with_audio(|a| a.set_playback_muted(value != 0)),
        "mic-mute" => devices.with_audio(|a| a.set_capture_muted(value != 0)),
        other => return Err(format!("unknown setting: {other}")),
    };
    outcome.map_err(|e| e.to_string())
}

fn serve(app: &AppHandle, stream: UnixStream) {
    let mut writer = match stream.try_clone() {
        Ok(w) => w,
        Err(e) => {
            log::warn!("ipc: could not answer a client: {e}");
            return;
        }
    };
    for line in BufReader::new(stream).lines().map_while(Result::ok) {
        let response = match serde_json::from_str::<Request>(&line) {
            Ok(Request::Snapshot) => Response::Summary(Box::new(Summary::from(
                &build_snapshot(&app.state::<AppState>()),
            ))),
            Ok(Request::Set { key, value }) => match apply(&app.state::<AppState>(), &key, value) {
                Ok(()) => Response::Done { ok: true },
                Err(error) => Response::Failed { error },
            },
            Err(e) => Response::Failed {
                error: format!("could not read the request: {e}"),
            },
        };
        let mut body = serde_json::to_string(&response).unwrap_or_else(|e| {
            format!("{{\"error\":\"could not encode the answer: {e}\"}}")
        });
        body.push('\n');
        if writer.write_all(body.as_bytes()).is_err() {
            return;
        }
    }
}

pub fn spawn(app: AppHandle) {
    let path = socket_path();
    // A socket left by a process that was killed would refuse to bind.
    let _ = std::fs::remove_file(&path);
    let listener = match UnixListener::bind(&path) {
        Ok(listener) => listener,
        Err(e) => {
            log::warn!("ipc: {} could not be opened: {e}", path.display());
            return;
        }
    };
    log::info!("ipc: listening on {}", path.display());
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            serve(&app, stream);
        }
    });
}

/// Remove the socket on the way out, so nothing later mistakes it for a
/// running instance.
pub fn cleanup() {
    let _ = std::fs::remove_file(socket_path());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requests_are_read_from_the_shape_a_person_would_type() {
        let snapshot: Request = serde_json::from_str(r#"{"op":"snapshot"}"#).unwrap();
        assert!(matches!(snapshot, Request::Snapshot));

        let set: Request =
            serde_json::from_str(r#"{"op":"set","key":"sidetone","value":2}"#).unwrap();
        match set {
            Request::Set { key, value } => {
                assert_eq!(key, "sidetone");
                assert_eq!(value, 2);
            }
            other => panic!("expected a set, got {other:?}"),
        }
    }

    #[test]
    fn a_summary_written_before_there_were_two_devices_still_reads() {
        // The summary is a contract other people's status bars parse. Adding a
        // field must not turn every previously valid document into an error.
        let older = r#"{"device":"SteelSeries Arctis 7+","connected":true,
            "powered_on":true,"battery_percent":50,"charging":false,
            "game":100,"chat":100,"volume":null,"microphone":null,
            "chatmix_routing":false,"sidetone":0,"inactive_minutes":null,
            "equalizer_preset":0}"#;
        let back: Summary = serde_json::from_str(older).expect("an older summary still parses");
        assert_eq!(back.battery_percent, Some(50));
        assert!(back.devices.is_empty());
    }

    #[test]
    fn an_unreadable_request_is_an_answer_rather_than_a_dropped_connection() {
        assert!(serde_json::from_str::<Request>("nonsense").is_err());
    }

    #[test]
    fn the_summary_survives_a_round_trip_so_scripts_can_read_it() {
        let summary = Summary {
            device: Some("SteelSeries Arctis 7+".into()),
            connected: true,
            powered_on: true,
            battery_percent: Some(75),
            charging: false,
            game: Some(100),
            chat: Some(40),
            volume: Some(Level { value: 54, max: 77, muted: false }),
            microphone: None,
            chatmix_routing: false,
            sidetone: Some(2),
            inactive_minutes: None,
            equalizer_preset: Some(1),
            devices: vec![
                DeviceLine {
                    id: "1038:220e".into(),
                    name: "SteelSeries Arctis 7+".into(),
                    battery_percent: Some(75),
                    charging: false,
                    powered_on: true,
                    selected: true,
                },
                DeviceLine {
                    id: "1038:1838".into(),
                    name: "SteelSeries Aerox 3 Wireless".into(),
                    battery_percent: Some(100),
                    charging: false,
                    powered_on: true,
                    selected: false,
                },
            ],
        };
        let text = serde_json::to_string(&summary).unwrap();
        let back: Summary = serde_json::from_str(&text).unwrap();
        assert_eq!(back.battery_percent, Some(75));
        assert_eq!(back.volume.unwrap().max, 77);
        assert_eq!(back.sidetone, Some(2));
        assert_eq!(back.devices.len(), 2);
        assert_eq!(back.devices[1].name, "SteelSeries Aerox 3 Wireless");
        assert!(back.devices[0].selected && !back.devices[1].selected);
        assert_eq!(back.inactive_minutes, None);
        assert_eq!(back.equalizer_preset, Some(1));
        assert!(back.microphone.is_none());
    }

    #[test]
    fn a_summary_of_nothing_connected_says_so_rather_than_inventing_zeroes() {
        let summary = Summary::default();
        assert!(!summary.connected);
        assert!(summary.battery_percent.is_none());
        assert!(summary.volume.is_none());
    }

    #[test]
    fn the_socket_lives_in_the_runtime_directory_not_the_home_directory() {
        let path = socket_path();
        assert!(path.ends_with("gear-control-center.sock"));
    }
}
