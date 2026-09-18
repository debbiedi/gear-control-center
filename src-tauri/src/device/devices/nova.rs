//! SteelSeries Arctis Nova 7 family — implemented from documentation.
//!
//! These share the Arctis 7+'s control channel and its `00 b0` status request,
//! but read the answer differently: the byte that means "powered off" on the
//! 7+ carries the charging state here, and the battery byte is a percentage on
//! some models and one of five levels on others, decided by product id.
//!
//! Nobody has run this against the hardware, so it is registered as
//! [`Verification::Documented`] and the manager refuses to write to it. It
//! reads, and it says plainly that it is only reading. Promoting it needs one
//! person with the headset, the probe's output, and a note saying the numbers
//! matched what the headset showed.
//!
//! Source: `Sapd/HeadsetControl`, `lib/devices/steelseries_arctis_nova_7.hpp`
//! and `lib/devices/protocols/steelseries_protocol.hpp`.

use crate::device::error::{DeviceError, DeviceResult};
use crate::device::protocol::DeviceProtocol;
use crate::device::transport::Transport;
use crate::device::types::{
    BatteryState, BatterySupport, Capabilities, ChatMixState, ConnectionState, DeviceInfo,
    DeviceState, EqualizerSupport, InactiveTimeSupport, SidetoneSupport,
};

pub const VENDOR_ID: u16 = 0x1038;

/// Every id the upstream implementation lists for this model.
///
/// The Nova 7P (`0x220a`) is deliberately absent: upstream handles it
/// separately because its sidetone and ChatMix do not work the same way, and
/// claiming it here would be claiming something nobody has checked.
pub const PRODUCT_IDS: [u16; 12] = [
    0x2202, 0x22a1, 0x227e, 0x2206, 0x2258, 0x229e, 0x22ad, 0x223a, 0x22a9, 0x227a, 0x22a4, 0x22a5,
];

/// Models that answer with one of five levels rather than a percentage.
const DISCRETE_BATTERY_IDS: [u16; 5] = [0x2202, 0x2206, 0x223a, 0x227a, 0x22a4];

pub const CONTROL_INTERFACE: i32 = 3;
pub const CONTROL_USAGE_PAGE: u16 = 0xffc0;
pub const CONTROL_USAGE: u16 = 0x0001;

const REPORT_SIZE: usize = 64;
const RESPONSE_BUF: usize = 128;
const READ_TIMEOUT_MS: i32 = 300;
const CMD_STATUS: u8 = 0xb0;

/// Byte 3: zero means the headset is not connected to its dongle; one and two
/// both mean it is charging.
const STATUS_BYTE: usize = 3;
const OFFLINE: u8 = 0x00;
const CHARGING: [u8; 2] = [0x01, 0x02];
const BATTERY_BYTE: usize = 2;
const GAME_BYTE: usize = 4;
const CHAT_BYTE: usize = 5;
const CHATMIX_MAX: u8 = 100;
const DISCRETE_LEVELS: u8 = 5;
const MAX_INACTIVE_MINUTES: u8 = 90;

pub fn reports_percentage(product_id: u16) -> bool {
    !DISCRETE_BATTERY_IDS.contains(&product_id)
}

/// What the documentation says these can do.
///
/// Battery resolution genuinely differs between models, which is why this
/// takes the product id: showing four segments for a headset that reports a
/// real percentage would throw away most of what it said.
pub fn capabilities(product_id: u16) -> Capabilities {
    Capabilities {
        volume: true,
        mute: true,
        microphone_volume: true,
        microphone_mute: true,
        chatmix: true,
        software_profiles: true,
        battery: Some(BatterySupport {
            steps: if reports_percentage(product_id) {
                101
            } else {
                DISCRETE_LEVELS
            },
        }),
        sidetone: Some(SidetoneSupport {
            labels: vec!["Off".into(), "Low".into(), "Medium".into(), "High".into()],
        }),
        equalizer: Some(EqualizerSupport {
            bands: 10,
            frequencies: crate::eq::ARCTIS_7_PLUS_BAND_FREQUENCIES.to_vec(),
            min_db: -10.0,
            max_db: 10.0,
            step_db: 0.5,
            hardware: true,
            preset_names: vec![
                "Flat".into(),
                "Bass Boost".into(),
                "Focus".into(),
                "Smiley".into(),
            ],
        }),
        inactive_time: Some(InactiveTimeSupport {
            max_minutes: MAX_INACTIVE_MINUTES,
        }),
        ..Capabilities::none()
    }
}

pub struct Status {
    pub powered_on: bool,
    pub battery_percent: u8,
    pub charging: bool,
    pub game: u8,
    pub chat: u8,
}

/// Read one status report.
///
/// `percentage` comes from the product id rather than from the report: the two
/// encodings are indistinguishable in the bytes — 4 is either four per cent or
/// a full battery — so the model has to decide.
pub fn parse_status(buf: &[u8], percentage: bool) -> DeviceResult<Status> {
    if buf.len() <= CHAT_BYTE {
        return Err(DeviceError::Protocol(format!(
            "status report was {} bytes, needs at least {}",
            buf.len(),
            CHAT_BYTE + 1
        )));
    }

    let status = buf[STATUS_BYTE];
    let raw = buf[BATTERY_BYTE];
    let battery_percent = if percentage {
        raw.min(100)
    } else {
        if raw >= DISCRETE_LEVELS {
            return Err(DeviceError::Protocol(format!(
                "battery level {raw} is outside the reported range 0..{}",
                DISCRETE_LEVELS - 1
            )));
        }
        raw * (100 / (DISCRETE_LEVELS - 1))
    };

    Ok(Status {
        powered_on: status != OFFLINE,
        battery_percent,
        charging: CHARGING.contains(&status),
        game: buf[GAME_BYTE].min(CHATMIX_MAX),
        chat: buf[CHAT_BYTE].min(CHATMIX_MAX),
    })
}

fn command(opcode: u8) -> [u8; REPORT_SIZE] {
    let mut report = [0u8; REPORT_SIZE];
    report[1] = opcode;
    report
}

pub struct ArctisNova7 {
    transport: Box<dyn Transport>,
    info: DeviceInfo,
    capabilities: Capabilities,
    percentage: bool,
}

impl ArctisNova7 {
    pub fn new(transport: Box<dyn Transport>, info: DeviceInfo) -> Self {
        let capabilities = capabilities(info.product_id);
        let percentage = reports_percentage(info.product_id);
        Self {
            transport,
            info,
            capabilities,
            percentage,
        }
    }
}

impl DeviceProtocol for ArctisNova7 {
    fn info(&self) -> &DeviceInfo {
        &self.info
    }

    fn capabilities(&self) -> &Capabilities {
        &self.capabilities
    }

    /// Reading is all this does. Every setter is left at the trait's default,
    /// and the manager refuses writes to an unconfirmed device before one
    /// could be reached anyway.
    fn read_state(&mut self) -> DeviceResult<DeviceState> {
        self.transport.write(&command(CMD_STATUS))?;
        let mut buf = [0u8; RESPONSE_BUF];
        let read = self.transport.read_timeout(&mut buf, READ_TIMEOUT_MS)?;
        if read == 0 {
            return Err(DeviceError::Protocol(
                "the device did not answer a status request".into(),
            ));
        }
        let status = parse_status(&buf[..read], self.percentage)?;
        Ok(DeviceState {
            connection: ConnectionState::Connected,
            powered_on: status.powered_on,
            battery: status.powered_on.then_some(BatteryState {
                percent: status.battery_percent,
                charging: status.charging,
            }),
            chatmix: Some(ChatMixState {
                game: status.game,
                chat: status.chat,
            }),
            // Nothing has been sent, so there is nothing to report back.
            sidetone_level: None,
            inactive_minutes: None,
            equalizer_db: None,
            equalizer_preset: None,
            dpi_presets: None,
            dpi_active: None,
            polling_rate: None,
            lighting: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn report(battery: u8, status: u8, game: u8, chat: u8) -> Vec<u8> {
        vec![0xb0, 0x00, battery, status, game, chat]
    }

    #[test]
    fn a_discrete_model_maps_its_five_levels() {
        let status = parse_status(&report(3, 0x03, 100, 100), false).unwrap();
        assert_eq!(status.battery_percent, 75);
    }

    #[test]
    fn a_percentage_model_is_taken_at_its_word() {
        let status = parse_status(&report(63, 0x03, 100, 100), true).unwrap();
        assert_eq!(status.battery_percent, 63);
    }

    #[test]
    fn the_two_encodings_are_told_apart_by_model_not_by_the_bytes() {
        // The same byte means very different things, which is exactly why the
        // product id decides and the report cannot.
        assert_eq!(parse_status(&report(4, 0x03, 0, 0), false).unwrap().battery_percent, 100);
        assert_eq!(parse_status(&report(4, 0x03, 0, 0), true).unwrap().battery_percent, 4);
    }

    #[test]
    fn a_zero_status_byte_means_the_headset_is_not_there() {
        let status = parse_status(&report(3, OFFLINE, 100, 100), false).unwrap();
        assert!(!status.powered_on);
    }

    #[test]
    fn both_documented_charging_values_are_charging() {
        for value in CHARGING {
            assert!(parse_status(&report(3, value, 0, 0), false).unwrap().charging);
        }
        assert!(!parse_status(&report(3, 0x03, 0, 0), false).unwrap().charging);
    }

    #[test]
    fn chatmix_is_read_from_the_two_halves_of_the_wheel() {
        let status = parse_status(&report(3, 0x03, 100, 40), false).unwrap();
        assert_eq!((status.game, status.chat), (100, 40));
    }

    #[test]
    fn a_truncated_report_is_rejected_rather_than_read_past() {
        assert!(parse_status(&[0xb0, 0x00, 0x03], false).is_err());
    }

    #[test]
    fn an_impossible_discrete_level_is_rejected_not_rescaled() {
        assert!(parse_status(&report(9, 0x03, 0, 0), false).is_err());
        // The same byte is a legitimate nine per cent on a percentage model.
        assert!(parse_status(&report(9, 0x03, 0, 0), true).is_ok());
    }

    #[test]
    fn the_battery_resolution_follows_the_model() {
        assert_eq!(capabilities(0x2202).battery.unwrap().steps, 5);
        assert_eq!(capabilities(0x22a1).battery.unwrap().steps, 101);
    }

    #[test]
    fn nothing_is_claimed_that_the_documentation_does_not_say() {
        let c = capabilities(0x2202);
        assert!(!c.rgb);
        assert!(!c.onboard_profiles);
        assert!(!c.firmware_update);
        assert!(!c.noise_reduction);
    }

    #[test]
    fn the_status_request_carries_no_arguments() {
        let sent = command(CMD_STATUS);
        assert_eq!(sent.len(), REPORT_SIZE);
        assert_eq!(sent[0], 0x00);
        assert_eq!(sent[1], CMD_STATUS);
        assert!(sent[2..].iter().all(|b| *b == 0));
    }
}
