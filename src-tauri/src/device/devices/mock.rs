//! A simulated headset, so the whole interface can be built and demonstrated
//! with no hardware attached.
//!
//! It advertises the same capability shape as the Arctis 7+ — including the
//! coarse five-step battery — so that UI built against it does not quietly
//! assume granularity real hardware will not deliver. Its [`DeviceInfo::is_mock`]
//! flag is set, and the interface says so on screen: a mock that looks
//! identical to a real device is how fake hardware support gets shipped.

use std::time::Instant;

use crate::device::error::DeviceResult;
use crate::device::protocol::DeviceProtocol;
use crate::device::types::*;
use crate::eq::{EqCodec, ARCTIS_7_PLUS_BAND_FREQUENCIES, ARCTIS_7_PLUS_PRESETS};

const BATTERY_LEVELS: u8 = 5;
/// How long the simulated battery takes to drop one of its five levels.
const SECONDS_PER_LEVEL: u64 = 90;

pub struct MockDevice {
    info: DeviceInfo,
    capabilities: Capabilities,
    started: Instant,
    powered_on: bool,
    sidetone: u8,
    inactive: u8,
    equalizer: Vec<f32>,
    preset: Option<u8>,
}

impl Default for MockDevice {
    fn default() -> Self {
        Self::new()
    }
}

impl MockDevice {
    pub fn new() -> Self {
        Self {
            info: DeviceInfo {
                id: "mock-headset".into(),
                name: "Mock Headset".into(),
                vendor_id: 0x0000,
                product_id: 0x0000,
                serial: Some("MOCK-0000-0001".into()),
                firmware_version: Some("1.0.0".into()),
                hardware_revision: Some("A1".into()),
                connection: "Simulated".into(),
                is_mock: true,
                verified: true,
            },
            capabilities: Capabilities {
                volume: true,
                mute: true,
                microphone_volume: true,
                microphone_mute: true,
                chatmix: true,
                software_profiles: true,
                onboard_profiles: false,
                firmware_update: false,
                rgb: false,
                spatial_audio: false,
                noise_reduction: false,
                battery: Some(BatterySupport {
                    steps: BATTERY_LEVELS,
                }),
                sidetone: Some(SidetoneSupport {
                    labels: ["Off", "Low", "Medium", "High"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                }),
                equalizer: Some(EqualizerSupport {
                    bands: 10,
                    frequencies: ARCTIS_7_PLUS_BAND_FREQUENCIES.to_vec(),
                    min_db: EqCodec::STEELSERIES_NOVA.min_db,
                    max_db: EqCodec::STEELSERIES_NOVA.max_db,
                    step_db: EqCodec::STEELSERIES_NOVA.step_db(),
                    hardware: true,
                    preset_names: ARCTIS_7_PLUS_PRESETS
                        .iter()
                        .map(|p| p.name.to_string())
                        .collect(),
                }),
                inactive_time: Some(InactiveTimeSupport { max_minutes: 90 }),
            },
            started: Instant::now(),
            powered_on: true,
            sidetone: 0,
            inactive: 30,
            equalizer: vec![0.0; 10],
            preset: Some(0),
        }
    }

    /// Drains one level at a time and wraps, so a long-running session shows
    /// the gauge changing without ever leaving the five real levels.
    fn simulated_battery(&self) -> u8 {
        let elapsed = self.started.elapsed().as_secs() / SECONDS_PER_LEVEL;
        let level = (BATTERY_LEVELS as u64 - 1) - (elapsed % BATTERY_LEVELS as u64);
        (level as u8) * (100 / (BATTERY_LEVELS - 1))
    }

    /// Sweeps the dial slowly so the read-only ChatMix display is visibly live.
    fn simulated_chatmix(&self) -> ChatMixState {
        let phase = (self.started.elapsed().as_secs() % 60) as f32 / 60.0;
        let game = (50.0 + 50.0 * (phase * std::f32::consts::TAU).sin()) as u8;
        ChatMixState {
            game: game.min(100),
            chat: 100u8.saturating_sub(game),
        }
    }

    pub fn set_powered_on(&mut self, on: bool) {
        self.powered_on = on;
    }
}

impl DeviceProtocol for MockDevice {
    fn info(&self) -> &DeviceInfo {
        &self.info
    }

    fn capabilities(&self) -> &Capabilities {
        &self.capabilities
    }

    fn read_state(&mut self) -> DeviceResult<DeviceState> {
        Ok(DeviceState {
            connection: ConnectionState::Connected,
            powered_on: self.powered_on,
            battery: self.powered_on.then(|| BatteryState {
                percent: self.simulated_battery(),
                charging: false,
            }),
            chatmix: Some(self.simulated_chatmix()),
            sidetone_level: Some(self.sidetone),
            inactive_minutes: Some(self.inactive),
            equalizer_db: Some(self.equalizer.clone()),
            equalizer_preset: self.preset,
        })
    }

    fn set_sidetone(&mut self, level: u8) -> DeviceResult<()> {
        if level > 3 {
            return Err(crate::device::error::DeviceError::InvalidParameter(
                format!("sidetone has four steps (0-3), got {level}"),
            ));
        }
        self.sidetone = level;
        Ok(())
    }

    fn set_inactive_time(&mut self, minutes: u8) -> DeviceResult<()> {
        if minutes > 90 {
            return Err(crate::device::error::DeviceError::InvalidParameter(
                format!("auto-shutdown accepts 0-90 minutes, got {minutes}"),
            ));
        }
        self.inactive = minutes;
        Ok(())
    }

    fn set_equalizer(&mut self, bands_db: &[f32]) -> DeviceResult<()> {
        // Validated through the same codec as real hardware, so the mock
        // rejects exactly what the device would reject.
        EqCodec::STEELSERIES_NOVA.encode_curve(bands_db, 10)?;
        self.equalizer = bands_db.to_vec();
        self.preset = None;
        Ok(())
    }

    fn set_equalizer_preset(&mut self, preset: u8) -> DeviceResult<()> {
        let entry = ARCTIS_7_PLUS_PRESETS.get(preset as usize).ok_or_else(|| {
            crate::device::error::DeviceError::InvalidParameter(format!(
                "there are {} presets, got {preset}",
                ARCTIS_7_PLUS_PRESETS.len()
            ))
        })?;
        self.equalizer = EqCodec::STEELSERIES_NOVA.decode_curve(&entry.bytes);
        self.preset = Some(preset);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::device::error::DeviceError;

    #[test]
    fn the_mock_identifies_itself_as_one() {
        let d = MockDevice::new();
        assert!(d.info().is_mock);
    }

    #[test]
    fn simulated_battery_only_ever_reports_real_levels() {
        let d = MockDevice::new();
        assert!([0, 25, 50, 75, 100].contains(&d.simulated_battery()));
    }

    #[test]
    fn a_powered_off_headset_reports_no_battery() {
        let mut d = MockDevice::new();
        d.set_powered_on(false);
        let state = d.read_state().unwrap();
        assert!(!state.powered_on);
        assert!(state.battery.is_none());
        // The dongle still knows the dial position while the headset is off.
        assert!(state.chatmix.is_some());
    }

    #[test]
    fn the_mock_rejects_what_the_hardware_would_reject() {
        let mut d = MockDevice::new();
        assert!(matches!(
            d.set_sidetone(4),
            Err(DeviceError::InvalidParameter(_))
        ));
        assert!(d.set_inactive_time(91).is_err());
        assert!(d.set_equalizer(&[0.0; 9]).is_err(), "wrong band count");
        assert!(d.set_equalizer(&[13.0; 10]).is_err(), "gain out of range");
        assert!(d.set_equalizer_preset(4).is_err());
    }

    #[test]
    fn accepted_settings_are_reflected_back() {
        let mut d = MockDevice::new();
        d.set_sidetone(2).unwrap();
        d.set_inactive_time(15).unwrap();
        let state = d.read_state().unwrap();
        assert_eq!(state.sidetone_level, Some(2));
        assert_eq!(state.inactive_minutes, Some(15));
    }

    #[test]
    fn choosing_a_preset_replaces_the_custom_curve_and_vice_versa() {
        let mut d = MockDevice::new();
        d.set_equalizer_preset(1).unwrap();
        assert_eq!(d.read_state().unwrap().equalizer_preset, Some(1));

        d.set_equalizer(&[1.0; 10]).unwrap();
        let state = d.read_state().unwrap();
        assert_eq!(state.equalizer_preset, None, "a custom curve is not a preset");
        assert_eq!(state.equalizer_db, Some(vec![1.0; 10]));
    }

    #[test]
    fn the_mock_claims_no_capability_the_reference_hardware_lacks() {
        let c = MockDevice::new().capabilities().clone();
        assert!(!c.rgb);
        assert!(!c.onboard_profiles);
        assert!(!c.firmware_update);
    }
}
