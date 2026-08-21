//! SteelSeries Arctis 7+ (and its PS5/Xbox/Destiny variants).
//!
//! Protocol sources, which agree byte-for-byte and were cross-checked against
//! each other rather than guessed:
//!   - Sapd/HeadsetControl, `lib/devices/steelseries_arctis_7_plus.hpp`
//!   - linux-arctis-manager, `devices/arctis_7_plus.yaml`
//! See `docs/protocol.md` for the full command table.

use crate::device::error::{DeviceError, DeviceResult};
use crate::device::protocol::DeviceProtocol;
use crate::device::transport::Transport;
use crate::device::types::*;
use crate::eq::{EqCodec, ARCTIS_7_PLUS_BAND_FREQUENCIES, ARCTIS_7_PLUS_PRESETS};

pub const VENDOR_ID: u16 = 0x1038;
pub const PRODUCT_IDS: [u16; 4] = [
    0x220e, // Arctis 7+
    0x2212, // Arctis 7+ PS5
    0x2216, // Arctis 7+ Xbox
    0x2236, // Arctis 7+ Destiny
];

/// The vendor HID interface that carries control traffic. Interfaces 4 and 5
/// exist too but are the consumer-control page and an undocumented channel.
pub const CONTROL_INTERFACE: i32 = 3;
pub const CONTROL_USAGE_PAGE: u16 = 0xffc0;
pub const CONTROL_USAGE: u16 = 0x0001;

/// Every command is a fixed 64-byte report, zero-padded at the end.
const REPORT_SIZE: usize = 64;
/// Responses are read into a larger buffer than the report size, matching the
/// reference implementations.
const RESPONSE_BUF: usize = 128;
const READ_TIMEOUT_MS: i32 = 2_000;

const CMD_STATUS: u8 = 0xb0;
const CMD_SIDETONE: u8 = 0x39;
const CMD_INACTIVE_TIME: u8 = 0xa3;
const CMD_EQUALIZER: u8 = 0x33;

const STATUS_SIGNATURE: u8 = 0xb0;
const POWER_OFF: u8 = 0x01;
const MAX_INACTIVE_MINUTES: u8 = 90;
const EQ_BANDS: usize = 10;
const CHATMIX_MAX: u8 = 0x64;

/// Battery is reported as one of five discrete levels, not a percentage.
const BATTERY_LEVELS: u8 = 5;

pub fn capabilities() -> Capabilities {
    Capabilities {
        // Volume and mute are USB Audio Class feature units on the dongle,
        // driven through ALSA rather than this HID channel.
        volume: true,
        mute: true,
        microphone_volume: true,
        microphone_mute: true,
        chatmix: true,
        software_profiles: true,
        // The headset has no profile memory: no command exists to store one,
        // so the UI must never offer "save to device".
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
            bands: EQ_BANDS as u8,
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
        inactive_time: Some(InactiveTimeSupport {
            max_minutes: MAX_INACTIVE_MINUTES,
        }),
    }
}

/// What a status report tells us. Separated from the transport so it can be
/// tested against captured bytes with no hardware present.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StatusReport {
    pub powered_on: bool,
    pub battery_percent: u8,
    pub charging: bool,
    pub game: u8,
    pub chat: u8,
}

/// Decode a raw status report.
///
/// Note the asymmetry the reference implementations both document: when the
/// headset is powered off the dongle still returns valid ChatMix figures, so
/// the dial is readable even while the battery reading is meaningless.
pub fn parse_status(buf: &[u8]) -> DeviceResult<StatusReport> {
    if buf.len() < 6 {
        return Err(DeviceError::Protocol(format!(
            "status report was {} bytes, expected at least 6",
            buf.len()
        )));
    }
    if buf[0] != STATUS_SIGNATURE {
        return Err(DeviceError::Protocol(format!(
            "status report started with {:#04x}, expected {STATUS_SIGNATURE:#04x}",
            buf[0]
        )));
    }

    let powered_on = buf[1] != POWER_OFF;
    let level = buf[2];
    if level >= BATTERY_LEVELS {
        return Err(DeviceError::Protocol(format!(
            "battery level {level} is outside the reported range 0..{}",
            BATTERY_LEVELS - 1
        )));
    }

    Ok(StatusReport {
        powered_on,
        // Five levels, evenly spaced: 0 / 25 / 50 / 75 / 100.
        battery_percent: level * (100 / (BATTERY_LEVELS - 1)),
        charging: buf[3] == 0x01,
        game: buf[4].min(CHATMIX_MAX),
        chat: buf[5].min(CHATMIX_MAX),
    })
}

/// Build a padded command report. The leading zero is the HID report ID; over
/// a libusb transport it would be omitted, which is why framing lives here and
/// not in [`Transport`].
fn command(opcode: u8, args: &[u8]) -> [u8; REPORT_SIZE] {
    let mut report = [0u8; REPORT_SIZE];
    report[1] = opcode;
    report[2..2 + args.len()].copy_from_slice(args);
    report
}

pub struct Arctis7Plus {
    transport: Box<dyn Transport>,
    info: DeviceInfo,
    capabilities: Capabilities,
    /// Last curve we sent. The device has no read-back command, so this is our
    /// only record of what it is playing — and it is dropped on reconnect
    /// rather than assumed to have survived.
    last_equalizer: Option<Vec<f32>>,
    last_preset: Option<u8>,
    last_sidetone: Option<u8>,
    last_inactive: Option<u8>,
}

impl Arctis7Plus {
    pub fn new(transport: Box<dyn Transport>, info: DeviceInfo) -> Self {
        Self {
            transport,
            info,
            capabilities: capabilities(),
            last_equalizer: None,
            last_preset: None,
            last_sidetone: None,
            last_inactive: None,
        }
    }

    fn read_status(&mut self) -> DeviceResult<StatusReport> {
        self.transport.write(&command(CMD_STATUS, &[]))?;
        let mut buf = [0u8; RESPONSE_BUF];
        let read = self.transport.read_timeout(&mut buf, READ_TIMEOUT_MS)?;
        if read == 0 {
            return Err(DeviceError::Protocol(
                "the device did not answer a status request".into(),
            ));
        }
        parse_status(&buf[..read])
    }

    fn send_equalizer_bytes(&mut self, bytes: &[u8]) -> DeviceResult<()> {
        let mut args = [0u8; EQ_BANDS + 1];
        args[..EQ_BANDS].copy_from_slice(bytes);
        self.transport.write(&command(CMD_EQUALIZER, &args))
    }
}

impl DeviceProtocol for Arctis7Plus {
    fn info(&self) -> &DeviceInfo {
        &self.info
    }

    fn capabilities(&self) -> &Capabilities {
        &self.capabilities
    }

    fn read_state(&mut self) -> DeviceResult<DeviceState> {
        let status = self.read_status()?;
        Ok(DeviceState {
            connection: ConnectionState::Connected,
            powered_on: status.powered_on,
            // Suppressed while the headset is off: the dongle keeps returning
            // the last figure, and showing it would look like a live reading.
            battery: status.powered_on.then_some(BatteryState {
                percent: status.battery_percent,
                charging: status.charging,
            }),
            chatmix: Some(ChatMixState {
                game: status.game,
                chat: status.chat,
            }),
            sidetone_level: self.last_sidetone,
            inactive_minutes: self.last_inactive,
            equalizer_db: self.last_equalizer.clone(),
            equalizer_preset: self.last_preset,
        })
    }

    fn set_sidetone(&mut self, level: u8) -> DeviceResult<()> {
        if level > 3 {
            return Err(DeviceError::InvalidParameter(format!(
                "sidetone has four hardware steps (0-3), got {level}"
            )));
        }
        self.transport.write(&command(CMD_SIDETONE, &[level]))?;
        self.last_sidetone = Some(level);
        Ok(())
    }

    fn set_inactive_time(&mut self, minutes: u8) -> DeviceResult<()> {
        if minutes > MAX_INACTIVE_MINUTES {
            return Err(DeviceError::InvalidParameter(format!(
                "auto-shutdown accepts 0-{MAX_INACTIVE_MINUTES} minutes, got {minutes}"
            )));
        }
        self.transport
            .write(&command(CMD_INACTIVE_TIME, &[minutes]))?;
        self.last_inactive = Some(minutes);
        Ok(())
    }

    fn set_equalizer(&mut self, bands_db: &[f32]) -> DeviceResult<()> {
        let bytes = EqCodec::STEELSERIES_NOVA.encode_curve(bands_db, EQ_BANDS)?;
        self.send_equalizer_bytes(&bytes)?;
        self.last_equalizer = Some(bands_db.to_vec());
        self.last_preset = None;
        Ok(())
    }

    fn set_equalizer_preset(&mut self, preset: u8) -> DeviceResult<()> {
        let entry = ARCTIS_7_PLUS_PRESETS
            .get(preset as usize)
            .ok_or_else(|| {
                DeviceError::InvalidParameter(format!(
                    "this device has {} presets (0-{}), got {preset}",
                    ARCTIS_7_PLUS_PRESETS.len(),
                    ARCTIS_7_PLUS_PRESETS.len() - 1
                ))
            })?;
        let bytes = entry.bytes;
        self.send_equalizer_bytes(&bytes)?;
        self.last_equalizer = Some(EqCodec::STEELSERIES_NOVA.decode_curve(&bytes));
        self.last_preset = Some(preset);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn status_bytes(power: u8, battery: u8, charging: u8, game: u8, chat: u8) -> Vec<u8> {
        vec![STATUS_SIGNATURE, power, battery, charging, game, chat]
    }

    #[test]
    fn battery_levels_map_to_the_five_values_the_device_reports() {
        for (level, expected) in [(0u8, 0u8), (1, 25), (2, 50), (3, 75), (4, 100)] {
            let s = parse_status(&status_bytes(0x00, level, 0, 0, 0)).unwrap();
            assert_eq!(s.battery_percent, expected, "level {level}");
        }
    }

    #[test]
    fn power_byte_one_means_the_headset_is_off() {
        assert!(!parse_status(&status_bytes(0x01, 4, 0, 0, 0)).unwrap().powered_on);
        for on in [0x00u8, 0x02, 0x03] {
            assert!(parse_status(&status_bytes(on, 4, 0, 0, 0)).unwrap().powered_on);
        }
    }

    #[test]
    fn charging_is_read_from_the_cable_byte() {
        assert!(parse_status(&status_bytes(0x00, 2, 0x01, 0, 0)).unwrap().charging);
        assert!(!parse_status(&status_bytes(0x00, 2, 0x00, 0, 0)).unwrap().charging);
    }

    #[test]
    fn chatmix_reads_both_halves_of_the_dial() {
        let s = parse_status(&status_bytes(0x00, 4, 0, 0x64, 0x00)).unwrap();
        assert_eq!((s.game, s.chat), (100, 0));
        let s = parse_status(&status_bytes(0x00, 4, 0, 0x32, 0x32)).unwrap();
        assert_eq!((s.game, s.chat), (50, 50));
    }

    #[test]
    fn a_report_without_the_signature_is_rejected() {
        let mut bytes = status_bytes(0x00, 2, 0, 0, 0);
        bytes[0] = 0xa0;
        assert!(matches!(
            parse_status(&bytes),
            Err(DeviceError::Protocol(_))
        ));
    }

    #[test]
    fn a_truncated_report_is_rejected_rather_than_read_past() {
        assert!(parse_status(&[STATUS_SIGNATURE, 0x00, 0x02]).is_err());
        assert!(parse_status(&[]).is_err());
    }

    #[test]
    fn an_impossible_battery_level_is_rejected_not_rescaled() {
        assert!(parse_status(&status_bytes(0x00, 5, 0, 0, 0)).is_err());
        assert!(parse_status(&status_bytes(0x00, 0xff, 0, 0, 0)).is_err());
    }

    #[test]
    fn commands_are_padded_reports_with_a_leading_report_id() {
        let cmd = command(CMD_SIDETONE, &[0x02]);
        assert_eq!(cmd.len(), REPORT_SIZE);
        assert_eq!(cmd[0], 0x00, "byte 0 is the HID report id");
        assert_eq!(cmd[1], 0x39);
        assert_eq!(cmd[2], 0x02);
        assert!(cmd[3..].iter().all(|b| *b == 0), "tail must be zero padding");
    }

    #[test]
    fn a_status_request_carries_no_arguments() {
        let cmd = command(CMD_STATUS, &[]);
        assert_eq!(&cmd[..2], &[0x00, 0xb0]);
        assert!(cmd[2..].iter().all(|b| *b == 0));
    }

    #[test]
    fn the_equalizer_command_leaves_a_trailing_zero_after_the_ten_bands() {
        let bytes = ARCTIS_7_PLUS_PRESETS[1].bytes;
        let mut args = [0u8; EQ_BANDS + 1];
        args[..EQ_BANDS].copy_from_slice(&bytes);
        let cmd = command(CMD_EQUALIZER, &args);
        assert_eq!(cmd[1], 0x33);
        assert_eq!(&cmd[2..12], &bytes);
        assert_eq!(cmd[12], 0x00);
    }

    #[test]
    fn capabilities_do_not_claim_hardware_the_device_lacks() {
        let c = capabilities();
        assert!(!c.rgb);
        assert!(!c.firmware_update);
        assert!(!c.onboard_profiles, "the headset has no profile memory");
        assert!(!c.noise_reduction);
        assert!(!c.spatial_audio);
        assert_eq!(c.battery.unwrap().steps, 5);
        assert_eq!(c.sidetone.unwrap().labels.len(), 4);
        let eq = c.equalizer.unwrap();
        assert_eq!(eq.bands, 10);
        assert!(eq.hardware);
    }
}
