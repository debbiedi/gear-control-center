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

/// Sensor resolutions a pointing device accepts.
///
/// A list rather than a range because the sensor quantises: the TrueMove Air
/// takes 100 CPI steps but not every one of them maps to a distinct value, so
/// offering a smooth 100-18000 slider would promise a precision the hardware
/// does not have. The UI snaps to these.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DpiSupport {
    /// Every resolution the sensor will take, ascending, in CPI.
    pub values: Vec<u32>,
    /// How many presets the device stores and cycles through with its button.
    pub max_presets: u8,
}

/// Report rates a device accepts, in Hz.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PollingRateSupport {
    pub rates: Vec<u16>,
}

/// Addressable lighting.
///
/// `zones` names each LED in the order the device addresses them, so the UI
/// can label the controls with what the owner actually sees on the device
/// rather than "Zone 1".
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LightingSupport {
    pub zones: Vec<String>,
    /// Effects the device can be left running, in the order it numbers them.
    pub effects: Vec<String>,
    /// Whether the device can flash a colour on a button press.
    pub reactive: bool,
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
    /// Shared with headsets: both families call it "go to sleep after N idle
    /// minutes", so there is one capability rather than two names for it.
    pub inactive_time: Option<InactiveTimeSupport>,
    pub dpi: Option<DpiSupport>,
    pub polling_rate: Option<PollingRateSupport>,
    pub lighting: Option<LightingSupport>,
    /// True when the device can be told to keep its current settings through a
    /// power cycle. Not the same as `onboard_profiles`: there is one set of
    /// settings, not a set of named ones.
    pub onboard_memory: bool,
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
            dpi: None,
            polling_rate: None,
            lighting: None,
            onboard_memory: false,
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
    /// False for a device implemented from documentation that nobody has
    /// confirmed on hardware. Such a device is read-only.
    pub verified: bool,
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

/// Where the lighting currently stands.
///
/// Every field is what this application last sent. The Aerox answers no
/// read command for its lighting, so there is nothing else to report — and
/// reporting the device's factory defaults as if they were live would be a
/// guess. Before anything is sent, this is absent rather than invented.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LightingState {
    /// One RGB triple per zone, in the order [`LightingSupport::zones`] names.
    pub colors: Vec<[u8; 3]>,
    /// Index into [`LightingSupport::effects`].
    pub effect: Option<u8>,
    /// Colour flashed on a button press, or `None` when reactive is off.
    pub reactive_color: Option<[u8; 3]>,
    /// Idle seconds before the lighting dims. 0 disables dimming.
    pub dim_seconds: Option<u16>,
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
    /// The resolutions the device is set to cycle through, in CPI.
    pub dpi_presets: Option<Vec<u32>>,
    /// Which of those is selected, as an index into `dpi_presets`.
    pub dpi_active: Option<u8>,
    pub polling_rate: Option<u16>,
    pub lighting: Option<LightingState>,
}

/// What has been sent to a device that it will not report back.
///
/// Sidetone, the auto shut-off timer and the equaliser have no read command
/// on any supported headset, and neither do a mouse's resolution, report rate
/// or lighting. The only record of them is the record of what
/// was sent — so that is what is kept, and sent again when the headset comes
/// back, rather than assumed to have survived the power cycle.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Sent {
    pub sidetone: Option<u8>,
    pub inactive_minutes: Option<u8>,
    pub equalizer_db: Option<Vec<f32>>,
    pub equalizer_preset: Option<u8>,
    pub dpi_presets: Option<Vec<u32>>,
    pub dpi_active: Option<u8>,
    pub polling_rate: Option<u16>,
    pub lighting: Option<LightingState>,
}

impl Sent {
    pub fn is_empty(&self) -> bool {
        *self == Self::default()
    }
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
            dpi_presets: None,
            dpi_active: None,
            polling_rate: None,
            lighting: None,
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
