//! What was last sent to each headset, kept so it can be sent again.
//!
//! The headset does not report sidetone, auto shut-off or the equaliser back,
//! and the driver's record of them dies with the process. Without this file
//! every restart of the computer put those controls back to "unknown" on
//! screen — and, on a headset that had been powered down in between, back to
//! its own defaults in fact. The user set them once; that is kept.
//!
//! Keyed by vendor and product id, so an equaliser curve for one model is
//! never sent to another. Nothing here is ever *assumed* to be in effect: the
//! record is sent to the device, and only then reported as its state.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::device::error::DeviceResult;
use crate::device::types::{DeviceInfo, Sent};
use crate::storage;

pub const FILE: &str = "device-memory.json";
pub const CURRENT_VERSION: u32 = 1;

/// The shape on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct File {
    version: u32,
    devices: BTreeMap<String, Sent>,
}

impl Default for File {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            devices: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Memory {
    file: File,
    /// False for the copy tests and the stand-in device use: it remembers,
    /// but nothing reaches the user's config directory.
    on_disk: bool,
}

impl Memory {
    pub fn on_disk() -> Self {
        Self {
            file: migrate(storage::load(FILE)),
            on_disk: true,
        }
    }

    pub fn in_memory() -> Self {
        Self {
            file: File::default(),
            on_disk: false,
        }
    }

    pub fn key(info: &DeviceInfo) -> String {
        format!("{:04x}:{:04x}", info.vendor_id, info.product_id)
    }

    pub fn recall(&self, info: &DeviceInfo) -> Option<&Sent> {
        self.file.devices.get(&Self::key(info))
    }

    pub fn record(&mut self, info: &DeviceInfo, sent: Sent) -> DeviceResult<()> {
        self.file.devices.insert(Self::key(info), sent);
        if self.on_disk {
            storage::save(FILE, &self.file)
        } else {
            Ok(())
        }
    }
}

/// Bring an older file up to the current shape. One version so far.
fn migrate(mut file: File) -> File {
    if file.version == 0 {
        file.version = CURRENT_VERSION;
    }
    file
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info(vendor_id: u16, product_id: u16) -> DeviceInfo {
        DeviceInfo {
            id: format!("test-{vendor_id}-{product_id}"),
            name: "Test".into(),
            vendor_id,
            product_id,
            serial: None,
            firmware_version: None,
            hardware_revision: None,
            connection: "USB".into(),
            is_mock: false,
            verified: true,
        }
    }

    #[test]
    fn the_key_is_the_vendor_and_product_id() {
        assert_eq!(Memory::key(&info(0x1038, 0x220e)), "1038:220e");
    }

    #[test]
    fn what_is_recorded_for_one_model_is_recalled_for_it_and_no_other() {
        let mut memory = Memory::in_memory();
        let arctis = info(0x1038, 0x220e);
        let nova = info(0x1038, 0x2202);
        memory
            .record(
                &arctis,
                Sent {
                    sidetone: Some(2),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(memory.recall(&arctis).unwrap().sidetone, Some(2));
        assert!(memory.recall(&nova).is_none(), "a curve is per model");
    }

    #[test]
    fn a_later_record_replaces_the_earlier_one() {
        let mut memory = Memory::in_memory();
        let device = info(0x1038, 0x220e);
        let first = Sent { sidetone: Some(1), ..Default::default() };
        let second = Sent { sidetone: Some(3), inactive_minutes: Some(10), ..Default::default() };
        memory.record(&device, first).unwrap();
        memory.record(&device, second.clone()).unwrap();
        assert_eq!(memory.recall(&device), Some(&second));
    }

    #[test]
    fn the_file_survives_a_round_trip_and_ignores_what_it_does_not_know() {
        let text = r#"{"version":1,"devices":{"1038:220e":{"sidetone":2,"equalizerDb":[0.0,1.5],"somethingNew":true}},"extra":1}"#;
        let file: File = serde_json::from_str(text).unwrap();
        let sent = &file.devices["1038:220e"];
        assert_eq!(sent.sidetone, Some(2));
        assert_eq!(sent.equalizer_db.as_deref(), Some(&[0.0, 1.5][..]));
        assert_eq!(sent.inactive_minutes, None);
        let back: File = serde_json::from_str(&serde_json::to_string(&file).unwrap()).unwrap();
        assert_eq!(back.devices["1038:220e"], *sent);
    }

    #[test]
    fn an_older_file_is_migrated_not_discarded() {
        let file: File = serde_json::from_str(r#"{"version":0,"devices":{}}"#).unwrap();
        assert_eq!(migrate(file).version, CURRENT_VERSION);
    }
}
