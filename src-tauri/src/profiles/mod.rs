//! Saved settings, stored by this application rather than on the headset.
//!
//! The Arctis 7+ has no onboard profile memory: there is no "save to device"
//! command in its protocol, and inventing a button that pretends otherwise is
//! exactly the kind of thing this application does not do. Applying a profile
//! means sending each of its settings to the device one at a time, and the
//! interface says so.
//!
//! Every field is optional on purpose. A profile that only sets the equaliser
//! should not silently reset the microphone level to whatever it happened to
//! be when the profile was created.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::device::error::DeviceResult;

/// Bumped when the stored shape changes; `migrate` handles older files.
pub const CURRENT_VERSION: u32 = 1;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct ProfileSettings {
    pub volume: Option<i64>,
    pub muted: Option<bool>,
    pub microphone_volume: Option<i64>,
    pub microphone_muted: Option<bool>,
    pub sidetone: Option<u8>,
    pub inactive_minutes: Option<u8>,
    pub equalizer: Option<Vec<f32>>,
    pub equalizer_preset: Option<u8>,
}

impl ProfileSettings {
    pub fn is_empty(&self) -> bool {
        *self == Self::default()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub settings: ProfileSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStore {
    pub version: u32,
    pub profiles: Vec<Profile>,
    /// The profile last applied. Not "the profile currently in effect": the
    /// headset can be changed from its own controls and would not tell us.
    pub last_applied: Option<String>,
}

impl Default for ProfileStore {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            profiles: Vec::new(),
            last_applied: None,
        }
    }
}

pub const FILE: &str = "profiles.json";

/// `$XDG_CONFIG_HOME/headset-control-center/profiles.json`, or the usual
/// `~/.config` fallback.
pub fn config_path() -> PathBuf {
    crate::storage::path_for(FILE)
}

/// Bring an older file up to the current shape.
///
/// There is only one version so far, so this is the identity — but the hook
/// exists now, because adding it after users have files is the hard way.
fn migrate(mut store: ProfileStore) -> ProfileStore {
    if store.version == 0 {
        store.version = CURRENT_VERSION;
    }
    store
}

pub fn load() -> ProfileStore {
    migrate(crate::storage::load(FILE))
}

/// Write atomically: a half-written profile file is worse than none.
pub fn save(store: &ProfileStore) -> DeviceResult<()> {
    crate::storage::save(FILE, store)
}

/// Ids only have to be unique within one file, and they never leave it.
pub fn new_id() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("p{nanos:x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_settings_are_recognised() {
        assert!(ProfileSettings::default().is_empty());
        assert!(!ProfileSettings {
            volume: Some(40),
            ..Default::default()
        }
        .is_empty());
    }

    #[test]
    fn absent_fields_stay_absent_through_a_round_trip() {
        // A profile that only sets the equaliser must not acquire a volume.
        let settings = ProfileSettings {
            equalizer: Some(vec![0.0; 10]),
            ..Default::default()
        };
        let text = serde_json::to_string(&settings).unwrap();
        let back: ProfileSettings = serde_json::from_str(&text).unwrap();
        assert_eq!(back, settings);
        assert!(back.volume.is_none());
        assert!(back.sidetone.is_none());
    }

    #[test]
    fn a_file_from_an_older_version_is_migrated_not_discarded() {
        let older = r#"{"version":0,"profiles":[{"id":"p1","name":"Night","settings":{"volume":20}}],"lastApplied":null}"#;
        let store = migrate(serde_json::from_str(older).unwrap());
        assert_eq!(store.version, CURRENT_VERSION);
        assert_eq!(store.profiles.len(), 1);
        assert_eq!(store.profiles[0].settings.volume, Some(20));
    }

    #[test]
    fn unknown_fields_do_not_break_loading() {
        // A file written by a newer build should still load what it can.
        let text = r#"{"version":1,"profiles":[],"lastApplied":null,"somethingNew":42}"#;
        let store: ProfileStore = serde_json::from_str(text).unwrap();
        assert_eq!(store.version, 1);
    }

    #[test]
    fn ids_do_not_collide_on_successive_calls() {
        let a = new_id();
        let b = new_id();
        assert_ne!(a, b);
    }
}
