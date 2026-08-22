//! The Tauri command surface — the only door between the interface and the
//! hardware layer.

use parking_lot::Mutex;
use serde::Serialize;
use tauri::State;

use crate::audio::AudioState;
use crate::device::error::{DeviceError, DeviceResult};
use crate::device::types::{Capabilities, ConnectionState, DeviceInfo, DeviceState, DiscoveredDevice};
use crate::device::DeviceManager;

pub struct AppState {
    pub devices: Mutex<DeviceManager>,
    /// Virtual game and chat outputs. Owned here rather than by the device:
    /// the applications a user has assigned to them should survive the headset
    /// being switched off and on.
    pub chatmix: Mutex<crate::audio::chatmix::ChatMixRouting>,
    pub settings: Mutex<crate::settings::AppSettings>,
    /// Tray and notification text, handed over by the interface.
    pub strings: Mutex<crate::system::strings::NativeStrings>,
}

impl AppState {
    pub fn new() -> Self {
        Self::with_simulation(false)
    }

    /// Start with the simulated device selected instead of real hardware.
    ///
    /// Reachable from the command line as `--simulated`, which is how the
    /// interface is worked on when no headset is attached. It changes nothing
    /// else: the simulation is still labelled as such everywhere it appears.
    pub fn with_simulation(simulated: bool) -> Self {
        let mut manager = DeviceManager::new();
        if simulated {
            manager.set_mock_mode(true);
        }
        Self {
            devices: Mutex::new(manager),
            chatmix: Mutex::new(Default::default()),
            settings: Mutex::new(crate::settings::load()),
            strings: Mutex::new(Default::default()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// One snapshot of everything the interface needs to render itself.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub connection: ConnectionState,
    pub mock_mode: bool,
    /// Set when the HID subsystem itself failed to start.
    pub host_error: Option<String>,
    pub device: Option<DeviceInfo>,
    pub capabilities: Option<Capabilities>,
    pub state: Option<DeviceState>,
    /// Present when reading live state failed, so the UI can show the reason
    /// rather than silently keeping the previous values on screen.
    pub state_error: Option<DeviceError>,
    pub audio: Option<AudioState>,
    pub audio_error: Option<DeviceError>,
    /// Whether the virtual game and chat outputs are currently in place.
    pub chatmix_routing: bool,
}

#[tauri::command]
pub fn get_snapshot(app: State<'_, AppState>) -> Snapshot {
    build_snapshot(&app)
}

/// Read everything the interface renders, in one pass under one lock.
///
/// Shared with the background watcher so a pushed update and a requested one
/// can never disagree about what the device said.
pub fn build_snapshot(app: &AppState) -> Snapshot {
    let mut manager = app.devices.lock();
    let device = manager.info();
    let capabilities = manager.capabilities();
    let (state, state_error) = if device.is_some() {
        match manager.state() {
            Ok(s) => (Some(s), None),
            Err(e) => (None, Some(e)),
        }
    } else {
        (None, None)
    };
    let (audio, audio_error) = match manager.audio_state() {
        Some(Ok(a)) => (Some(a), None),
        Some(Err(e)) => (None, Some(e)),
        None => (None, None),
    };
    let chatmix_routing = app.chatmix.lock().is_active();
    Snapshot {
        connection: manager.connection(),
        mock_mode: manager.is_mock_mode(),
        host_error: manager.api_error().map(str::to_string),
        device,
        capabilities,
        state,
        state_error,
        audio,
        audio_error,
        chatmix_routing,
    }
}

#[tauri::command]
pub fn discover_devices(app: State<'_, AppState>) -> Vec<DiscoveredDevice> {
    app.devices.lock().discover()
}

/// Asynchronous on purpose: a synchronous command runs on the main thread, and
/// anything that waits on the device lock there stops the window from drawing
/// or answering its own title bar. Everything below that can touch the device
/// follows the same rule.
#[tauri::command]
pub async fn connect_device(
    app: State<'_, AppState>,
    device_id: Option<String>,
) -> DeviceResult<DeviceInfo> {
    app.devices.lock().connect(device_id.as_deref())
}

#[tauri::command]
pub fn disconnect_device(app: State<'_, AppState>) {
    app.devices.lock().disconnect();
}

#[tauri::command]
pub fn set_mock_mode(app: State<'_, AppState>, enabled: bool) {
    app.devices.lock().set_mock_mode(enabled);
}

#[tauri::command]
pub async fn set_sidetone(app: State<'_, AppState>, level: u8) -> DeviceResult<()> {
    app.devices.lock().with_device(|d| d.set_sidetone(level))
}

#[tauri::command]
pub async fn set_inactive_time(app: State<'_, AppState>, minutes: u8) -> DeviceResult<()> {
    app.devices
        .lock()
        .with_device(|d| d.set_inactive_time(minutes))
}

#[tauri::command]
pub async fn set_equalizer(app: State<'_, AppState>, bands_db: Vec<f32>) -> DeviceResult<()> {
    app.devices
        .lock()
        .with_device(|d| d.set_equalizer(&bands_db))
}

#[tauri::command]
pub async fn set_equalizer_preset(app: State<'_, AppState>, preset: u8) -> DeviceResult<()> {
    app.devices
        .lock()
        .with_device(|d| d.set_equalizer_preset(preset))
}

#[tauri::command]
pub async fn set_volume(app: State<'_, AppState>, value: i64) -> DeviceResult<()> {
    app.devices
        .lock()
        .with_audio(|a| a.set_playback_volume(value))
}

#[tauri::command]
pub async fn set_muted(app: State<'_, AppState>, muted: bool) -> DeviceResult<()> {
    app.devices.lock().with_audio(|a| a.set_playback_muted(muted))
}

#[tauri::command]
pub async fn set_microphone_volume(app: State<'_, AppState>, value: i64) -> DeviceResult<()> {
    app.devices.lock().with_audio(|a| a.set_capture_volume(value))
}

#[tauri::command]
pub async fn set_microphone_muted(app: State<'_, AppState>, muted: bool) -> DeviceResult<()> {
    app.devices.lock().with_audio(|a| a.set_capture_muted(muted))
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

use crate::profiles::{self, Profile, ProfileSettings, ProfileStore};

/// What actually happened when a profile was applied.
///
/// A profile can hold a setting the connected headset does not support, or the
/// device can refuse one part and accept the rest. Reporting a single "saved"
/// would hide that, so each setting is reported by name.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyReport {
    pub applied: Vec<String>,
    pub failed: Vec<FailedSetting>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FailedSetting {
    pub setting: String,
    pub reason: String,
}

#[tauri::command]
pub fn list_profiles() -> ProfileStore {
    profiles::load()
}

#[tauri::command]
pub fn save_profile(
    id: Option<String>,
    name: String,
    settings: ProfileSettings,
) -> DeviceResult<ProfileStore> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err(DeviceError::InvalidParameter("a profile needs a name".into()));
    }
    let mut store = profiles::load();
    match id.and_then(|id| store.profiles.iter_mut().find(|p| p.id == id)) {
        Some(existing) => {
            existing.name = name;
            existing.settings = settings;
        }
        None => store.profiles.push(Profile {
            id: profiles::new_id(),
            name,
            settings,
        }),
    }
    profiles::save(&store)?;
    Ok(store)
}

#[tauri::command]
pub fn rename_profile(id: String, name: String) -> DeviceResult<ProfileStore> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err(DeviceError::InvalidParameter("a profile needs a name".into()));
    }
    let mut store = profiles::load();
    let profile = store
        .profiles
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| DeviceError::InvalidParameter("no such profile".into()))?;
    profile.name = name;
    profiles::save(&store)?;
    Ok(store)
}

#[tauri::command]
pub fn delete_profile(id: String) -> DeviceResult<ProfileStore> {
    let mut store = profiles::load();
    store.profiles.retain(|p| p.id != id);
    if store.last_applied.as_deref() == Some(id.as_str()) {
        store.last_applied = None;
    }
    profiles::save(&store)?;
    Ok(store)
}

/// Store what the device is set to right now.
///
/// Only what is actually known is stored. The headset cannot be asked what its
/// equaliser or sidetone are currently set to, so those are recorded only when
/// this application set them during the current session — otherwise the field
/// is left out rather than filled with a guess.
#[tauri::command]
pub async fn capture_profile(app: State<'_, AppState>, name: String) -> DeviceResult<ProfileStore> {
    let snapshot = build_snapshot(&app);
    let audio = snapshot.audio.as_ref();
    let state = snapshot.state.as_ref();
    let settings = ProfileSettings {
        volume: audio.and_then(|a| a.playback.as_ref()).map(|c| c.value),
        muted: audio.and_then(|a| a.playback.as_ref()).map(|c| c.muted),
        microphone_volume: audio.and_then(|a| a.capture.as_ref()).map(|c| c.value),
        microphone_muted: audio.and_then(|a| a.capture.as_ref()).map(|c| c.muted),
        sidetone: state.and_then(|s| s.sidetone_level),
        inactive_minutes: state.and_then(|s| s.inactive_minutes),
        equalizer: state.and_then(|s| s.equalizer_db.clone()),
        equalizer_preset: state.and_then(|s| s.equalizer_preset),
    };
    if settings.is_empty() {
        return Err(DeviceError::NotConnected);
    }
    save_profile(None, name, settings)
}

/// Send every setting a profile holds, one at a time.
///
/// The headset stores nothing itself, so this is the whole of what "applying"
/// means here — and it is why the interface never offers a "save to device"
/// button.
#[tauri::command]
pub async fn apply_profile(app: State<'_, AppState>, id: String) -> DeviceResult<ApplyReport> {
    let mut store = profiles::load();
    let profile = store
        .profiles
        .iter()
        .find(|p| p.id == id)
        .cloned()
        .ok_or_else(|| DeviceError::InvalidParameter("no such profile".into()))?;

    let mut report = ApplyReport {
        applied: Vec::new(),
        failed: Vec::new(),
    };
    let mut manager = app.devices.lock();

    macro_rules! step {
        ($label:expr, $value:expr, $apply:expr) => {
            if let Some(value) = $value {
                let outcome: DeviceResult<()> = $apply(value);
                match outcome {
                    Ok(()) => report.applied.push($label.to_string()),
                    Err(e) => report.failed.push(FailedSetting {
                        setting: $label.to_string(),
                        reason: e.to_string(),
                    }),
                }
            }
        };
    }

    step!("Output volume", profile.settings.volume, |v| manager
        .with_audio(|a| a.set_playback_volume(v)));
    step!("Output mute", profile.settings.muted, |v| manager
        .with_audio(|a| a.set_playback_muted(v)));
    step!(
        "Microphone level",
        profile.settings.microphone_volume,
        |v| manager.with_audio(|a| a.set_capture_volume(v))
    );
    step!("Microphone mute", profile.settings.microphone_muted, |v| {
        manager.with_audio(|a| a.set_capture_muted(v))
    });
    step!("Sidetone", profile.settings.sidetone, |v| manager
        .with_device(|d| d.set_sidetone(v)));
    step!("Auto shut-off", profile.settings.inactive_minutes, |v| {
        manager.with_device(|d| d.set_inactive_time(v))
    });

    // A preset and a custom curve are the same control; the curve wins when
    // both are stored, because it is the more specific of the two.
    if let Some(bands) = profile.settings.equalizer.clone() {
        match manager.with_device(|d| d.set_equalizer(&bands)) {
            Ok(()) => report.applied.push("Equaliser".into()),
            Err(e) => report.failed.push(FailedSetting {
                setting: "Equaliser".into(),
                reason: e.to_string(),
            }),
        }
    } else {
        step!("Equaliser preset", profile.settings.equalizer_preset, |v| {
            manager.with_device(|d| d.set_equalizer_preset(v))
        });
    }

    drop(manager);
    store.last_applied = Some(id);
    profiles::save(&store)?;
    Ok(report)
}

// ---------------------------------------------------------------------------
// Application settings
// ---------------------------------------------------------------------------

use crate::settings::AppSettings;

#[tauri::command]
pub fn get_settings(app: State<'_, AppState>) -> AppSettings {
    app.settings.lock().clone()
}

/// Store preferences and put the ones with a side effect into effect.
///
/// Autostart is the only setting that touches anything outside this
/// application: it writes a desktop entry. If that write fails the setting is
/// reported as failed rather than saved as if it had worked.
#[tauri::command]
pub async fn set_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> DeviceResult<AppSettings> {
    use tauri_plugin_autostart::ManagerExt;

    let settings = crate::settings::load_normalised(settings);
    let manager = app.autolaunch();
    let wanted = settings.start_with_system;
    let result = if wanted {
        manager.enable()
    } else {
        manager.disable()
    };
    if let Err(e) = result {
        return Err(DeviceError::Transport(format!(
            "could not change the autostart entry: {e}"
        )));
    }

    crate::settings::save(&settings)?;
    *state.settings.lock() = settings.clone();
    Ok(settings)
}

/// Write a plain-text report of what this application can see.
///
/// Everything in it is a reading or a version string; nothing is inferred.
/// Returned as a path rather than dumped into the window so it can be attached
/// to a bug report without retyping.
#[tauri::command]
pub async fn export_diagnostics(app: State<'_, AppState>) -> DeviceResult<String> {
    let snapshot = build_snapshot(&app);
    let discovered = app.devices.lock().discover();
    let settings = app.settings.lock().clone();

    let mut out = String::new();
    out.push_str("Headset Control Center diagnostics\n");
    out.push_str(&format!("version: {}\n", env!("CARGO_PKG_VERSION")));
    out.push_str(&format!("os: {} {}\n", std::env::consts::OS, std::env::consts::ARCH));
    out.push_str(&format!("simulated: {}\n\n", snapshot.mock_mode));

    out.push_str(&format!("connection: {:?}\n", snapshot.connection));
    if let Some(err) = &snapshot.host_error {
        out.push_str(&format!("host error: {err}\n"));
    }

    out.push_str("\ndiscovered devices:\n");
    if discovered.is_empty() {
        out.push_str("  none\n");
    }
    for d in &discovered {
        out.push_str(&format!(
            "  {} [{:04x}:{:04x}] {}\n",
            d.info.name,
            d.info.vendor_id,
            d.info.product_id,
            d.unavailable.as_deref().unwrap_or("available")
        ));
    }

    let section = |title: &str, value: String| format!("\n{title}:\n{value}\n");
    if let Some(device) = &snapshot.device {
        out.push_str(&section(
            "connected device",
            serde_json::to_string_pretty(device).unwrap_or_default(),
        ));
    }
    if let Some(caps) = &snapshot.capabilities {
        out.push_str(&section(
            "capabilities",
            serde_json::to_string_pretty(caps).unwrap_or_default(),
        ));
    }
    if let Some(state) = &snapshot.state {
        out.push_str(&section(
            "state",
            serde_json::to_string_pretty(state).unwrap_or_default(),
        ));
    }
    if let Some(audio) = &snapshot.audio {
        out.push_str(&section(
            "audio",
            serde_json::to_string_pretty(audio).unwrap_or_default(),
        ));
    }
    if let Some(e) = &snapshot.state_error {
        out.push_str(&format!("\nstate error: {e}\n"));
    }
    if let Some(e) = &snapshot.audio_error {
        out.push_str(&format!("audio error: {e}\n"));
    }
    out.push_str(&section(
        "settings",
        serde_json::to_string_pretty(&settings).unwrap_or_default(),
    ));

    let path = crate::storage::path_for("diagnostics.txt");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| DeviceError::Transport(format!("could not create {}: {e}", parent.display())))?;
    }
    std::fs::write(&path, out)
        .map_err(|e| DeviceError::Transport(format!("could not write {}: {e}", path.display())))?;
    Ok(path.display().to_string())
}

/// The build's own version, so the About panel cannot drift from the package.
#[tauri::command]
pub fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Take the tray and notification text from the interface.
///
/// Called once the language is known and again whenever it changes, so there
/// is only ever one set of translations in the project.
#[tauri::command]
pub fn set_native_strings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    strings: crate::system::strings::NativeStrings,
) {
    *state.strings.lock() = strings;
    let snapshot = build_snapshot(&state);
    crate::system::tray::update(&app, &snapshot);
}

/// Put the virtual game and chat outputs in place, or take them away.
///
/// This is the one setting that changes the audio topology of the whole
/// session, so it is never turned on by inference — only here, and only by
/// someone who asked for it.
#[tauri::command]
pub async fn set_chatmix_routing(app: State<'_, AppState>, enabled: bool) -> DeviceResult<bool> {
    let device = app.devices.lock().info();
    if enabled {
        let device = device.ok_or(DeviceError::NotConnected)?;
        app.chatmix
            .lock()
            .enable(device.vendor_id, device.product_id)?;
    } else {
        app.chatmix.lock().disable();
    }

    let mut settings = app.settings.lock();
    settings.chatmix_routing = enabled;
    crate::settings::save(&settings)?;
    Ok(enabled)
}
