use serde::{Deserialize, Serialize};

/// How the app currently stands with respect to a device.
///
/// Text always accompanies the colour in the UI — `§18` of the project brief
/// forbids communicating state by colour alone.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionState {
    Connected,
    Disconnected,
    Connecting,
    Reconnecting,
    /// Something went wrong and we know what.
    Error { message: String },
    Unknown,
}

/// Granularity a device reports battery at.
///
/// This exists because the Arctis 7+ reports five discrete levels
/// (0/25/50/75/100), not a percentage. Storing `steps` forces the UI to render
/// a segmented gauge rather than inventing a smooth number the hardware never
/// gave us.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BatterySupport {
    /// Number of distinct levels the device can report, including empty.
    pub steps: u8,
}

/// Sidetone granularity. The Arctis 7+ has four hardware steps, so a 0-100
/// slider would be a lie; the UI renders `labels.len()` discrete options.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SidetoneSupport {
    pub labels: Vec<String>,
}

/// Equalizer shape the hardware accepts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EqualizerSupport {
    pub bands: u8,
    /// Nominal centre frequencies in Hz, for labelling only.
    pub frequencies: Vec<u32>,
    pub min_db: f32,
    pub max_db: f32,
    pub step_db: f32,
    /// True when the curve is applied by the headset itself rather than by
    /// software DSP on the host.
    pub hardware: bool,
    pub preset_names: Vec<String>,
}

/// Auto-shutdown timer support.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct InactiveTimeSupport {
    pub max_minutes: u8,
}

/// What a given device can actually do.
///
/// Absent capabilities are `false`/`None` and the UI hides or explicitly
/// disables the matching control. Nothing here may be optimistic: if a field
/// is true, a real command exists behind it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Capabilities {
    pub volume: bool,
    pub mute: bool,
    pub microphone_volume: bool,
    pub microphone_mute: bool,
    pub chatmix: bool,
    /// Profiles stored by this application, not by the headset.
    pub software_profiles: bool,
    /// Profiles the headset keeps in its own memory.
    pub onboard_profiles: bool,
    pub firmware_update: bool,
    pub rgb: bool,
    pub spatial_audio: bool,
    pub noise_reduction: bool,
    pub battery: Option<BatterySupport>,
    pub sidetone: Option<SidetoneSupport>,
    pub equalizer: Option<EqualizerSupport>,
    pub inactive_time: Option<InactiveTimeSupport>,
}

impl Capabilities {
    /// A device that can do nothing. Implementations opt in explicitly, so a
    /// new device cannot accidentally inherit a capability it lacks.
    pub fn none() -> Self {
        Self {
            volume: false,
            mute: false,
            microphone_volume: false,
            microphone_mute: false,
            chatmix: false,
            software_profiles: false,
            onboard_profiles: false,
            firmware_update: false,
            rgb: false,
            spatial_audio: false,
            noise_reduction: false,
            battery: None,
            sidetone: None,
            equalizer: None,
            inactive_time: None,
        }
    }
}

/// Static facts about a device, known from its descriptor or read once on
/// connect. Fields the hardware does not expose stay `None` and render as
/// "N/A" — never as a placeholder value.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub serial: Option<String>,
    pub firmware_version: Option<String>,
    pub hardware_revision: Option<String>,
    pub connection: String,
    /// True when this is the mock device, so the UI can say so plainly.
    pub is_mock: bool,
}

/// Battery reading. `percent` is always one of the discrete levels the device
/// supports — see [`BatterySupport`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BatteryState {
    pub percent: u8,
    pub charging: bool,
}

/// The ChatMix dial position, as reported by the headset's physical wheel.
/// Read-only: the wheel is hardware, we can observe it but not move it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatMixState {
    pub game: u8,
    pub chat: u8,
}

/// Everything that can change while a device stays connected.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DeviceState {
    pub connection: ConnectionState,
    /// False when the dongle is plugged in but the headset is powered down.
    pub powered_on: bool,
    pub battery: Option<BatteryState>,
    pub chatmix: Option<ChatMixState>,
    pub sidetone_level: Option<u8>,
    pub inactive_minutes: Option<u8>,
    pub equalizer_db: Option<Vec<f32>>,
    pub equalizer_preset: Option<u8>,
}

impl DeviceState {
    pub fn disconnected() -> Self {
        Self {
            connection: ConnectionState::Disconnected,
            powered_on: false,
            battery: None,
            chatmix: None,
            sidetone_level: None,
            inactive_minutes: None,
            equalizer_db: None,
            equalizer_preset: None,
        }
    }
}

/// A device we know how to talk to, before we have opened it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DiscoveredDevice {
    pub info: DeviceInfo,
    pub capabilities: Capabilities,
    /// Set when the device was found but cannot be opened, with the reason.
    pub unavailable: Option<String>,
}
