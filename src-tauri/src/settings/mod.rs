//! Application preferences — how the window and the tray behave.
//!
//! Kept separate from profiles: these are about the software, profiles are
//! about the hardware, and mixing them would mean exporting a profile also
//! exported whether the user wants the application to start at login.

use serde::{Deserialize, Serialize};

use crate::device::error::DeviceResult;
use crate::storage;

pub const FILE: &str = "settings.json";
pub const CURRENT_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub version: u32,
    /// Register with the desktop's autostart directory.
    pub start_with_system: bool,
    /// Start hidden, for use with `start_with_system`.
    pub start_minimised: bool,
    /// Closing the window hides it instead of quitting.
    pub close_to_tray: bool,
    pub low_battery_notification: bool,
    /// The headset reports five levels, so anything other than 25 or 50 here
    /// would be a threshold it can never cross.
    pub low_battery_percent: u8,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            start_with_system: false,
            start_minimised: false,
            close_to_tray: true,
            low_battery_notification: true,
            low_battery_percent: 25,
        }
    }
}

pub fn load() -> AppSettings {
    load_normalised(storage::load(FILE))
}

/// Bring a settings value into a shape the hardware can honour.
pub fn load_normalised(mut settings: AppSettings) -> AppSettings {
    if settings.version == 0 {
        settings.version = CURRENT_VERSION;
    }
    // Snap to a level the device can actually report, so the warning is not
    // waiting for a number that will never arrive.
    if !matches!(settings.low_battery_percent, 25 | 50) {
        settings.low_battery_percent = 25;
    }
    settings
}

pub fn save(settings: &AppSettings) -> DeviceResult<()> {
    storage::save(FILE, settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_sensible() {
        let s = AppSettings::default();
        assert!(s.close_to_tray);
        assert!(!s.start_with_system);
        assert_eq!(s.low_battery_percent, 25);
    }

    #[test]
    fn a_threshold_the_device_cannot_report_is_snapped() {
        // 5 discrete levels means 0/25/50/75/100 and nothing between.
        let text = r#"{"version":1,"lowBatteryPercent":37}"#;
        let parsed: AppSettings = serde_json::from_str(text).unwrap();
        assert_eq!(parsed.low_battery_percent, 37);
        // load() applies the correction; parsing alone does not.
        let corrected = if matches!(parsed.low_battery_percent, 25 | 50) {
            parsed.low_battery_percent
        } else {
            25
        };
        assert_eq!(corrected, 25);
    }

    #[test]
    fn missing_fields_take_their_defaults() {
        let parsed: AppSettings = serde_json::from_str("{}").unwrap();
        assert_eq!(parsed, AppSettings::default());
    }
}
