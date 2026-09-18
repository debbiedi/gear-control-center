//! Text drawn by the native layer.
//!
//! The tray menu and the low-battery notification are the only strings this
//! side puts in front of a person. Rather than keeping a second set of
//! translations in Rust, the interface hands these over on startup and
//! whenever the language changes; the defaults here are English, so the tray
//! reads correctly during the second before the window has loaded.
//!
//! `{percent}` and `{device}` are substituted here, which lets a translation
//! move them wherever its grammar needs them.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeStrings {
    pub no_device: String,
    pub battery_unknown: String,
    pub battery_not_reported: String,
    pub battery: String,
    pub battery_charging: String,
    pub mute_output: String,
    pub unmute_output: String,
    pub mute_microphone: String,
    pub unmute_microphone: String,
    pub open: String,
    pub quit: String,
    pub low_battery_title: String,
    pub low_battery_body: String,
}

impl Default for NativeStrings {
    fn default() -> Self {
        Self {
            no_device: "No device detected".into(),
            battery_unknown: "Battery: —".into(),
            battery_not_reported: "Battery: not reported".into(),
            battery: "Battery: {percent}%".into(),
            battery_charging: "Battery: {percent}% · charging".into(),
            mute_output: "Mute output".into(),
            unmute_output: "Unmute output".into(),
            mute_microphone: "Mute microphone".into(),
            unmute_microphone: "Unmute microphone".into(),
            open: "Open Gear Control Center".into(),
            quit: "Quit".into(),
            low_battery_title: "{device} battery is low".into(),
            low_battery_body: "{percent}% remaining.".into(),
        }
    }
}

/// Fill one placeholder. Absent placeholders are left alone rather than
/// appended, so a translation that does not need the number simply omits it.
pub fn fill(template: &str, key: &str, value: &str) -> String {
    template.replace(&format!("{{{key}}}"), value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_placeholder_is_substituted_wherever_it_sits() {
        assert_eq!(fill("Battery: {percent}%", "percent", "75"), "Battery: 75%");
        // Some languages put the number first.
        assert_eq!(fill("{percent}% pil", "percent", "75"), "75% pil");
    }

    #[test]
    fn a_template_without_the_placeholder_is_returned_unchanged() {
        assert_eq!(fill("Pil zayıf", "percent", "75"), "Pil zayıf");
    }

    #[test]
    fn defaults_are_english_so_the_tray_reads_before_the_window_loads() {
        assert_eq!(NativeStrings::default().quit, "Quit");
    }
}
