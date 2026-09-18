//! SteelSeries Aerox 3 Wireless.
//!
//! Protocol source: `flozz/rivalcfg`, `rivalcfg/devices/aerox3_wireless_wired.py`
//! and `aerox3_wireless_wireless.py`, cross-checked against a physical device —
//! the battery command was run against this machine's own mouse and agreed with
//! `rivalcfg --battery-level` to the level.
//!
//! The wired and wireless halves of this mouse are separate USB products with
//! separate command encodings: in 2.4 GHz mode every opcode carries an extra
//! bit and the device answers each write. One implementation covers both, with
//! [`Aerox3Wireless::wireless`] deciding which encoding is in force.
//!
//! See `docs/protocol.md` for the full command table.

use crate::device::error::{DeviceError, DeviceResult};
use crate::device::protocol::DeviceProtocol;
use crate::device::transport::Transport;
use crate::device::types::*;

pub const VENDOR_ID: u16 = 0x1038;

/// 2.4 GHz receiver. Opcodes carry [`WIRELESS_FLAG`] and every write is
/// answered.
pub const PRODUCT_IDS_WIRELESS: [u16; 2] = [
    0x1838, // Aerox 3 Wireless
    0x1878, // Aerox 3 Wireless CS2 Dragon Lore Edition
];

/// The same mouse on its charging cable, which enumerates as a different
/// product and takes the plain opcodes.
pub const PRODUCT_IDS_WIRED: [u16; 2] = [
    0x183a, // Aerox 3 Wireless (wired mode)
    0x187a, // Aerox 3 Wireless CS2 Dragon Lore Edition (wired mode)
];

/// The vendor HID interface that carries control traffic — the same usage page
/// the Arctis uses, on the same interface number.
pub const CONTROL_INTERFACE: i32 = 3;
pub const CONTROL_USAGE_PAGE: u16 = 0xffc0;
pub const CONTROL_USAGE: u16 = 0x0001;

/// Set on every opcode in 2.4 GHz mode. The receiver uses it to tell a command
/// meant for the mouse from one meant for itself.
const WIRELESS_FLAG: u8 = 0b0100_0000;

/// Bytes the mouse sends back after a write in wireless mode. Nothing in it is
/// used, but it has to be taken off the queue or the next read returns the
/// answer to the previous command.
const READBACK_LEN: usize = 64;

/// Long enough for an answer that is coming, short enough not to be felt as
/// the window freezing — the device lock is held for the duration.
const READ_TIMEOUT_MS: i32 = 300;

pub(crate) const CMD_DPI: u8 = 0x2d;
pub(crate) const CMD_POLLING_RATE: u8 = 0x2b;
pub(crate) const CMD_ZONE_COLOR: u8 = 0x21;
pub(crate) const CMD_RAINBOW: u8 = 0x22;
pub(crate) const CMD_DIM_TIMER: u8 = 0x23;
pub(crate) const CMD_REACTIVE_COLOR: u8 = 0x26;
pub(crate) const CMD_DEFAULT_LIGHTING: u8 = 0x27;
pub(crate) const CMD_SLEEP_TIMER: u8 = 0x29;
pub(crate) const CMD_SAVE: u8 = 0x11;
pub(crate) const CMD_BATTERY: u8 = 0x92;

/// Battery byte: high bit is the charging flag, the rest is a level.
const BATTERY_CHARGING_FLAG: u8 = 0b1000_0000;
/// Levels the mouse reports, counting empty: 0, 5, 10 … 100.
const BATTERY_STEPS: u8 = 21;

pub const MAX_SLEEP_MINUTES: u8 = 20;
pub const MAX_DIM_SECONDS: u16 = 1200;
pub const MAX_DPI_PRESETS: u8 = 5;
/// Lighting zones, top to bottom, as they sit on the shell.
pub const ZONES: [&str; 3] = ["Top", "Middle", "Bottom"];
/// Effects, in the order [`DeviceProtocol::set_lighting_effect`] indexes them.
pub const EFFECTS: [&str; 2] = ["Static", "Rainbow"];

/// Report rates the mouse accepts, and the byte each is sent as. Descending
/// bytes for ascending rates is the device's own ordering, not a mistake.
const POLLING_RATES: [(u16, u8); 4] = [(125, 0x03), (250, 0x02), (500, 0x01), (1000, 0x00)];

/// Every resolution the TrueMove Air sensor accepts, and the byte that selects
/// it. The sensor quantises: the steps are 100 CPI apart but the bytes are not
/// consecutive, so this is a table and not a formula.
const DPI_VALUES: [(u32, u8); 180] = [
    (100, 0x00), (200, 0x02), (300, 0x03), (400, 0x04), (500, 0x05), (600, 0x06),
    (700, 0x07), (800, 0x09), (900, 0x0a), (1000, 0x0b), (1100, 0x0c), (1200, 0x0d),
    (1300, 0x0e), (1400, 0x10), (1500, 0x11), (1600, 0x12), (1700, 0x13), (1800, 0x14),
    (1900, 0x16), (2000, 0x17), (2100, 0x18), (2200, 0x19), (2300, 0x1a), (2400, 0x1b),
    (2500, 0x1d), (2600, 0x1e), (2700, 0x1f), (2800, 0x20), (2900, 0x21), (3000, 0x23),
    (3100, 0x25), (3200, 0x26), (3300, 0x27), (3400, 0x28), (3500, 0x29), (3600, 0x2a),
    (3700, 0x2c), (3800, 0x2d), (3900, 0x2e), (4000, 0x2f), (4100, 0x30), (4200, 0x32),
    (4300, 0x33), (4400, 0x34), (4500, 0x35), (4600, 0x36), (4700, 0x38), (4800, 0x39),
    (4900, 0x3a), (5000, 0x3b), (5100, 0x3c), (5200, 0x3e), (5300, 0x3f), (5400, 0x40),
    (5500, 0x41), (5600, 0x42), (5700, 0x44), (5800, 0x45), (5900, 0x46), (6000, 0x47),
    (6100, 0x48), (6200, 0x4a), (6300, 0x4b), (6400, 0x4c), (6500, 0x4d), (6600, 0x4e),
    (6700, 0x50), (6800, 0x51), (6900, 0x52), (7000, 0x53), (7100, 0x54), (7200, 0x56),
    (7300, 0x57), (7400, 0x58), (7500, 0x59), (7600, 0x5a), (7700, 0x5c), (7800, 0x5d),
    (7900, 0x5e), (8000, 0x5f), (8100, 0x60), (8200, 0x62), (8300, 0x63), (8400, 0x64),
    (8500, 0x65), (8600, 0x66), (8700, 0x68), (8800, 0x69), (8900, 0x6a), (9000, 0x6b),
    (9100, 0x6c), (9200, 0x6e), (9300, 0x6f), (9400, 0x70), (9500, 0x71), (9600, 0x72),
    (9700, 0x74), (9800, 0x75), (9900, 0x76), (10000, 0x77), (10100, 0x78), (10200, 0x7a),
    (10300, 0x7b), (10400, 0x7c), (10500, 0x7d), (10600, 0x7e), (10700, 0x80), (10800, 0x81),
    (10900, 0x82), (11000, 0x83), (11100, 0x84), (11200, 0x86), (11300, 0x87), (11400, 0x88),
    (11500, 0x89), (11600, 0x8a), (11700, 0x8c), (11800, 0x8d), (11900, 0x8e), (12000, 0x8f),
    (12100, 0x90), (12200, 0x92), (12300, 0x93), (12400, 0x94), (12500, 0x95), (12600, 0x96),
    (12700, 0x98), (12800, 0x99), (12900, 0x9a), (13000, 0x9b), (13100, 0x9c), (13200, 0x9e),
    (13300, 0x9f), (13400, 0xa0), (13500, 0xa1), (13600, 0xa2), (13700, 0xa4), (13800, 0xa5),
    (13900, 0xa6), (14000, 0xa7), (14100, 0xa8), (14200, 0xaa), (14300, 0xab), (14400, 0xac),
    (14500, 0xad), (14600, 0xae), (14700, 0xb0), (14800, 0xb1), (14900, 0xb2), (15000, 0xb3),
    (15100, 0xb4), (15200, 0xb5), (15300, 0xb6), (15400, 0xb7), (15500, 0xb8), (15600, 0xb9),
    (15700, 0xba), (15800, 0xbb), (15900, 0xbc), (16000, 0xbd), (16100, 0xbf), (16200, 0xc0),
    (16300, 0xc2), (16400, 0xc3), (16500, 0xc4), (16600, 0xc5), (16700, 0xc6), (16800, 0xc7),
    (16900, 0xc9), (17000, 0xca), (17100, 0xcb), (17200, 0xcc), (17300, 0xcd), (17400, 0xcf),
    (17500, 0xd0), (17600, 0xd1), (17700, 0xd2), (17800, 0xd3), (17900, 0xd5), (18000, 0xd6),];

/// Whether this product id is the 2.4 GHz half of the pair.
pub fn is_wireless(product_id: u16) -> bool {
    PRODUCT_IDS_WIRELESS.contains(&product_id)
}

pub fn capabilities(product_id: u16) -> Capabilities {
    Capabilities {
        volume: false,
        mute: false,
        microphone_volume: false,
        microphone_mute: false,
        chatmix: false,
        // Profiles store headset settings only; a mouse profile would be a
        // different shape and is not offered rather than offered broken.
        software_profiles: false,
        onboard_profiles: false,
        firmware_update: false,
        rgb: true,
        spatial_audio: false,
        noise_reduction: false,
        // On the cable the mouse runs off the cable: it reports no level, and
        // a gauge there would be reporting the receiver's last guess.
        battery: is_wireless(product_id).then_some(BatterySupport {
            steps: BATTERY_STEPS,
        }),
        sidetone: None,
        equalizer: None,
        // The mouse calls this a sleep timer and the headset calls it auto
        // shut-off; both mean "power down after this many idle minutes".
        inactive_time: Some(InactiveTimeSupport {
            max_minutes: MAX_SLEEP_MINUTES,
        }),
        dpi: Some(DpiSupport {
            values: DPI_VALUES.iter().map(|(dpi, _)| *dpi).collect(),
            max_presets: MAX_DPI_PRESETS,
        }),
        polling_rate: Some(PollingRateSupport {
            rates: POLLING_RATES.iter().map(|(hz, _)| *hz).collect(),
        }),
        lighting: Some(LightingSupport {
            zones: ZONES.iter().map(|z| z.to_string()).collect(),
            effects: EFFECTS.iter().map(|e| e.to_string()).collect(),
            reactive: true,
        }),
        onboard_memory: true,
    }
}

/// The byte that selects a resolution, or the nearest one the sensor has.
///
/// Rounding rather than refusing: the caller works in CPI and the sensor works
/// in its own steps, so a value between two of them is answered with the
/// closer one instead of an error the user cannot act on. A value exactly
/// between two steps rounds up, which is the rule the reference implementation
/// uses — it matters only for the halfway cases, but it has to be one of them.
fn dpi_byte(cpi: u32) -> (u32, u8) {
    let mut best = DPI_VALUES[0];
    for candidate in DPI_VALUES {
        if candidate.0.abs_diff(cpi) <= best.0.abs_diff(cpi) {
            best = candidate;
        }
    }
    best
}

fn polling_byte(hz: u16) -> DeviceResult<u8> {
    POLLING_RATES
        .iter()
        .find(|(rate, _)| *rate == hz)
        .map(|(_, byte)| *byte)
        .ok_or_else(|| {
            DeviceError::InvalidParameter(format!(
                "this device reports at {}, got {hz}",
                POLLING_RATES
                    .iter()
                    .map(|(r, _)| format!("{r} Hz"))
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        })
}

/// A duration as the three little-endian milliseconds bytes the mouse takes.
fn millis_le(millis: u32) -> [u8; 3] {
    [
        (millis & 0xff) as u8,
        ((millis >> 8) & 0xff) as u8,
        ((millis >> 16) & 0xff) as u8,
    ]
}

/// What a battery answer means.
///
/// The level byte counts from one, so a reported zero is the mouse saying it
/// has nothing to report — asleep, or not talking to its receiver — and not a
/// flat battery. Treated as "no reading" rather than as 0%, which would put a
/// red empty gauge on a mouse that is simply idle.
pub fn parse_battery(buf: &[u8]) -> DeviceResult<Option<BatteryState>> {
    if buf.len() < 2 {
        return Err(DeviceError::Protocol(format!(
            "battery answer was {} bytes, expected at least 2",
            buf.len()
        )));
    }
    let raw = buf[1];
    let charging = raw & BATTERY_CHARGING_FLAG != 0;
    let level = raw & !BATTERY_CHARGING_FLAG;
    if level == 0 {
        return Ok(None);
    }
    let percent = (level - 1).saturating_mul(5);
    if percent > 100 {
        return Err(DeviceError::Protocol(format!(
            "battery level byte {raw:#04x} decodes to {percent}%, which is out of range"
        )));
    }
    Ok(Some(BatteryState { percent, charging }))
}

pub struct Aerox3Wireless {
    transport: Box<dyn Transport>,
    info: DeviceInfo,
    capabilities: Capabilities,
    /// True in 2.4 GHz mode: opcodes carry [`WIRELESS_FLAG`] and writes are
    /// answered.
    wireless: bool,
    /// The mouse answers no read command for any of its settings, so these are
    /// the only record of what it holds. They die with this handle; what
    /// survives a restart is kept by the manager and sent again.
    last_dpi: Option<Vec<u32>>,
    last_dpi_active: Option<u8>,
    last_polling: Option<u16>,
    last_lighting: Option<LightingState>,
}

impl Aerox3Wireless {
    pub fn new(transport: Box<dyn Transport>, info: DeviceInfo) -> Self {
        let capabilities = capabilities(info.product_id);
        let wireless = is_wireless(info.product_id);
        Self {
            transport,
            info,
            capabilities,
            wireless,
            last_dpi: None,
            last_dpi_active: None,
            last_polling: None,
            last_lighting: None,
        }
    }

    /// Frame a command the way the device expects it.
    ///
    /// Byte 0 is the HID report id, which is always zero here. Unlike the
    /// Arctis, these reports are not padded to a fixed size: the reference
    /// implementation sends exactly as many bytes as the command has, and that
    /// is what the hardware was confirmed to accept.
    fn frame(&self, opcode: u8, args: &[u8]) -> Vec<u8> {
        let opcode = if self.wireless {
            opcode | WIRELESS_FLAG
        } else {
            opcode
        };
        let mut report = Vec::with_capacity(args.len() + 2);
        report.push(0x00);
        report.push(opcode);
        report.extend_from_slice(args);
        report
    }

    /// Send a command, and in wireless mode take the answer off the queue.
    ///
    /// The answer is discarded because it carries nothing we do not already
    /// know. Leaving it unread is what would matter: the next read would
    /// return it instead of what it asked for.
    fn send(&mut self, opcode: u8, args: &[u8]) -> DeviceResult<()> {
        let report = self.frame(opcode, args);
        self.transport.write(&report)?;
        if self.wireless {
            let mut sink = [0u8; READBACK_LEN];
            let _ = self.transport.read_timeout(&mut sink, READ_TIMEOUT_MS);
        }
        Ok(())
    }

    fn read_battery(&mut self) -> DeviceResult<Option<BatteryState>> {
        let report = self.frame(CMD_BATTERY, &[]);
        self.transport.write(&report)?;
        let mut buf = [0u8; READBACK_LEN];
        let read = self.transport.read_timeout(&mut buf, READ_TIMEOUT_MS)?;
        if read == 0 {
            // The write itself went through, so the receiver is still there
            // and this is the mouse being asleep. Reporting it as a failed
            // read would put the whole device into "reconnecting" and, three
            // passes later, drop a handle that is perfectly good.
            return Ok(None);
        }
        parse_battery(&buf[..read])
    }

    /// The lighting record, started from the device's own defaults if nothing
    /// has been sent yet.
    fn lighting_mut(&mut self) -> &mut LightingState {
        self.last_lighting.get_or_insert_with(|| LightingState {
            colors: vec![[0, 0, 0]; ZONES.len()],
            effect: None,
            reactive_color: None,
            dim_seconds: None,
        })
    }

    /// Tell the mouse what to do with its lighting when it powers on.
    ///
    /// Sent alongside the effect rather than exposed separately: a static
    /// colour that turned back into a rainbow after a sleep would read as a
    /// bug, and the two settings only ever want to agree.
    fn set_startup_lighting(&mut self, rainbow: bool) -> DeviceResult<()> {
        let args = if rainbow { [0x01, 0x00] } else { [0x00, 0x00] };
        self.send(CMD_DEFAULT_LIGHTING, &args)
    }
}

impl DeviceProtocol for Aerox3Wireless {
    fn info(&self) -> &DeviceInfo {
        &self.info
    }

    fn capabilities(&self) -> &Capabilities {
        &self.capabilities
    }

    /// Read what the mouse will tell us, which is its battery and nothing
    /// else. Everything else is the record of what this handle sent.
    fn read_state(&mut self) -> DeviceResult<DeviceState> {
        let battery = if self.capabilities.battery.is_some() {
            self.read_battery()?
        } else {
            None
        };
        Ok(DeviceState {
            connection: ConnectionState::Connected,
            // On the cable there is no level to read and the mouse is plainly
            // awake, so it is reported as on rather than as asleep.
            powered_on: battery.is_some() || self.capabilities.battery.is_none(),
            battery,
            chatmix: None,
            sidetone_level: None,
            inactive_minutes: None,
            equalizer_db: None,
            equalizer_preset: None,
            dpi_presets: self.last_dpi.clone(),
            dpi_active: self.last_dpi_active,
            polling_rate: self.last_polling,
            lighting: self.last_lighting.clone(),
        })
    }

    fn sent(&self) -> Sent {
        Sent {
            sidetone: None,
            inactive_minutes: None,
            equalizer_db: None,
            equalizer_preset: None,
            dpi_presets: self.last_dpi.clone(),
            dpi_active: self.last_dpi_active,
            polling_rate: self.last_polling,
            lighting: self.last_lighting.clone(),
        }
    }

    /// The mouse's sleep timer, which is the same idea as a headset's auto
    /// shut-off and is sent as milliseconds rather than minutes.
    fn set_inactive_time(&mut self, minutes: u8) -> DeviceResult<()> {
        if minutes > MAX_SLEEP_MINUTES {
            return Err(DeviceError::InvalidParameter(format!(
                "the sleep timer accepts 0-{MAX_SLEEP_MINUTES} minutes, got {minutes}"
            )));
        }
        let millis = u32::from(minutes) * 60_000;
        self.send(CMD_SLEEP_TIMER, &millis_le(millis))
    }

    fn set_dpi_presets(&mut self, dpis: &[u32], active: u8) -> DeviceResult<()> {
        if dpis.is_empty() {
            return Err(DeviceError::InvalidParameter(
                "the mouse needs at least one resolution".into(),
            ));
        }
        if dpis.len() > MAX_DPI_PRESETS as usize {
            return Err(DeviceError::InvalidParameter(format!(
                "this device stores {MAX_DPI_PRESETS} resolutions, got {}",
                dpis.len()
            )));
        }
        if active as usize >= dpis.len() {
            return Err(DeviceError::InvalidParameter(format!(
                "preset {active} was selected but only {} were given",
                dpis.len()
            )));
        }

        // Round to what the sensor has, and record the rounded figures — the
        // interface must show what the mouse is set to, not what was asked for.
        let resolved: Vec<(u32, u8)> = dpis.iter().map(|cpi| dpi_byte(*cpi)).collect();
        let mut args = Vec::with_capacity(resolved.len() + 2);
        args.push(dpis.len() as u8);
        args.push(active);
        args.extend(resolved.iter().map(|(_, byte)| *byte));
        self.send(CMD_DPI, &args)?;

        self.last_dpi = Some(resolved.iter().map(|(cpi, _)| *cpi).collect());
        self.last_dpi_active = Some(active);
        Ok(())
    }

    fn set_polling_rate(&mut self, hz: u16) -> DeviceResult<()> {
        let byte = polling_byte(hz)?;
        self.send(CMD_POLLING_RATE, &[byte])?;
        self.last_polling = Some(hz);
        Ok(())
    }

    fn set_lighting_color(&mut self, zone: u8, rgb: [u8; 3]) -> DeviceResult<()> {
        if zone as usize >= ZONES.len() {
            return Err(DeviceError::InvalidParameter(format!(
                "this device has {} lighting zones (0-{}), got {zone}",
                ZONES.len(),
                ZONES.len() - 1
            )));
        }
        self.send(
            CMD_ZONE_COLOR,
            &[0x01, zone, rgb[0], rgb[1], rgb[2]],
        )?;

        // Setting a colour is what stops the rainbow, so the record follows the
        // device: it is now showing a fixed colour.
        let lighting = self.lighting_mut();
        lighting.colors[zone as usize] = rgb;
        lighting.effect = Some(0);
        Ok(())
    }

    fn set_lighting_effect(&mut self, effect: u8) -> DeviceResult<()> {
        match effect {
            // Static: re-send the colours, which is what takes the rainbow off.
            0 => {
                let colors = self
                    .last_lighting
                    .as_ref()
                    .map(|l| l.colors.clone())
                    .unwrap_or_else(|| vec![[0, 0, 0]; ZONES.len()]);
                for (zone, rgb) in colors.iter().enumerate() {
                    self.send(
                        CMD_ZONE_COLOR,
                        &[0x01, zone as u8, rgb[0], rgb[1], rgb[2]],
                    )?;
                }
                self.set_startup_lighting(false)?;
            }
            1 => {
                self.send(CMD_RAINBOW, &[0xff])?;
                self.set_startup_lighting(true)?;
            }
            other => {
                return Err(DeviceError::InvalidParameter(format!(
                    "this device has {} effects (0-{}), got {other}",
                    EFFECTS.len(),
                    EFFECTS.len() - 1
                )))
            }
        }
        self.lighting_mut().effect = Some(effect);
        Ok(())
    }

    fn set_reactive_color(&mut self, rgb: Option<[u8; 3]>) -> DeviceResult<()> {
        let args = match rgb {
            Some(c) => [0x01, 0x00, c[0], c[1], c[2]],
            None => [0x00, 0x00, 0x00, 0x00, 0x00],
        };
        self.send(CMD_REACTIVE_COLOR, &args)?;
        self.lighting_mut().reactive_color = rgb;
        Ok(())
    }

    fn set_dim_timer(&mut self, seconds: u16) -> DeviceResult<()> {
        if seconds > MAX_DIM_SECONDS {
            return Err(DeviceError::InvalidParameter(format!(
                "the dim timer accepts 0-{MAX_DIM_SECONDS} seconds, got {seconds}"
            )));
        }
        let millis = u32::from(seconds) * 1_000;
        let mut args = vec![0x0f, 0x01, 0x00, 0x00];
        args.extend_from_slice(&millis_le(millis));
        self.send(CMD_DIM_TIMER, &args)?;
        self.lighting_mut().dim_seconds = Some(seconds);
        Ok(())
    }

    fn save_to_device(&mut self) -> DeviceResult<()> {
        self.send(CMD_SAVE, &[0x00])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::device::transport::FakeTransport;

    fn info(product_id: u16) -> DeviceInfo {
        DeviceInfo {
            id: format!("1038:{product_id:04x}"),
            name: "SteelSeries Aerox 3 Wireless".into(),
            vendor_id: VENDOR_ID,
            product_id,
            serial: None,
            firmware_version: None,
            hardware_revision: None,
            connection: "USB".into(),
            is_mock: false,
            verified: true,
        }
    }

    fn wireless(fake: &FakeTransport) -> Aerox3Wireless {
        Aerox3Wireless::new(Box::new(fake.clone()), info(PRODUCT_IDS_WIRELESS[0]))
    }

    fn wired(fake: &FakeTransport) -> Aerox3Wireless {
        Aerox3Wireless::new(Box::new(fake.clone()), info(PRODUCT_IDS_WIRED[0]))
    }

    #[test]
    fn the_same_command_is_framed_differently_on_the_cable_and_off_it() {
        // This is the whole reason one implementation covers two product ids.
        let radio = FakeTransport::new();
        wireless(&radio).set_polling_rate(1000).unwrap();
        let cable = FakeTransport::new();
        wired(&cable).set_polling_rate(1000).unwrap();

        assert_eq!(radio.only_write(), vec![0x00, CMD_POLLING_RATE | WIRELESS_FLAG, 0x00]);
        assert_eq!(cable.only_write(), vec![0x00, CMD_POLLING_RATE, 0x00]);
    }

    #[test]
    fn report_rates_are_sent_as_the_bytes_the_device_numbers_them_with() {
        // Ascending rates, descending bytes. Getting this backwards would set
        // 125 Hz on a mouse asked for 1000.
        for (hz, expected) in POLLING_RATES {
            let fake = FakeTransport::new();
            wireless(&fake).set_polling_rate(hz).unwrap();
            assert_eq!(fake.only_write()[2], expected, "{hz} Hz");
        }
    }

    #[test]
    fn a_report_rate_the_device_does_not_have_is_refused() {
        let fake = FakeTransport::new();
        assert!(matches!(
            wireless(&fake).set_polling_rate(8000),
            Err(DeviceError::InvalidParameter(_))
        ));
        assert!(fake.wrote_nothing(), "nothing is sent on a refusal");
    }

    #[test]
    fn resolutions_are_sent_as_a_count_a_selection_and_one_byte_each() {
        let fake = FakeTransport::new();
        wireless(&fake)
            .set_dpi_presets(&[400, 800, 1600], 1)
            .unwrap();

        let write = fake.only_write();
        assert_eq!(write[1], CMD_DPI | WIRELESS_FLAG);
        assert_eq!(write[2], 3, "three presets");
        assert_eq!(write[3], 1, "the second one is selected");
        assert_eq!(&write[4..], &[0x04, 0x09, 0x12], "400, 800, 1600");
    }

    #[test]
    fn a_resolution_between_two_the_sensor_has_is_rounded_and_reported_rounded() {
        // The sensor's steps are not every hundred. Asking for one it does not
        // have must not leave the interface showing a number it is not set to.
        let fake = FakeTransport::new();
        let mut mouse = wireless(&fake);
        // 1650 sits exactly between two steps the sensor has, and 1610 sits
        // nearer the lower one.
        mouse.set_dpi_presets(&[1650, 1610], 0).unwrap();

        let state = mouse.read_state().unwrap();
        assert_eq!(state.dpi_presets.as_deref(), Some(&[1700u32, 1600][..]));
    }

    #[test]
    fn more_resolutions_than_the_device_stores_are_refused() {
        let fake = FakeTransport::new();
        assert!(matches!(
            wireless(&fake).set_dpi_presets(&[400, 800, 1200, 1600, 2000, 2400], 0),
            Err(DeviceError::InvalidParameter(_))
        ));
        assert!(fake.wrote_nothing());
    }

    #[test]
    fn selecting_a_preset_that_was_not_given_is_refused() {
        let fake = FakeTransport::new();
        assert!(matches!(
            wireless(&fake).set_dpi_presets(&[800, 1600], 2),
            Err(DeviceError::InvalidParameter(_))
        ));
        assert!(fake.wrote_nothing());
    }

    #[test]
    fn the_sleep_timer_goes_out_as_milliseconds() {
        let fake = FakeTransport::new();
        wireless(&fake).set_inactive_time(MAX_SLEEP_MINUTES).unwrap();
        // 20 minutes is 1_200_000 ms, little endian.
        assert_eq!(&fake.only_write()[2..], &[0x80, 0x4f, 0x12]);
    }

    #[test]
    fn a_sleep_timer_longer_than_the_device_accepts_is_refused() {
        let fake = FakeTransport::new();
        assert!(matches!(
            wireless(&fake).set_inactive_time(MAX_SLEEP_MINUTES + 1),
            Err(DeviceError::InvalidParameter(_))
        ));
        assert!(fake.wrote_nothing());
    }

    #[test]
    fn colouring_a_zone_records_that_the_rainbow_has_stopped() {
        // The device has no command for "stop the rainbow": a colour is what
        // stops it. If the record did not follow, the interface would go on
        // showing an effect that is no longer running.
        let fake = FakeTransport::new();
        let mut mouse = wireless(&fake);
        mouse.set_lighting_effect(1).unwrap();
        mouse.set_lighting_color(1, [10, 20, 30]).unwrap();

        let lighting = mouse.read_state().unwrap().lighting.unwrap();
        assert_eq!(lighting.effect, Some(0), "static, not rainbow");
        assert_eq!(lighting.colors[1], [10, 20, 30]);
    }

    #[test]
    fn the_rainbow_is_also_set_as_what_the_mouse_wakes_up_doing() {
        // Otherwise a colour chosen here comes back as a rainbow after a sleep,
        // which reads as the application having forgotten.
        let fake = FakeTransport::new();
        wireless(&fake).set_lighting_effect(1).unwrap();

        let writes = fake.writes();
        assert_eq!(writes.len(), 2);
        assert_eq!(writes[0][1], CMD_RAINBOW | WIRELESS_FLAG);
        assert_eq!(writes[1][1], CMD_DEFAULT_LIGHTING | WIRELESS_FLAG);
        assert_eq!(&writes[1][2..], &[0x01, 0x00], "wake up in rainbow");
    }

    #[test]
    fn choosing_static_re_sends_the_colours_and_clears_the_startup_rainbow() {
        let fake = FakeTransport::new();
        let mut mouse = wireless(&fake);
        mouse.set_lighting_color(0, [1, 2, 3]).unwrap();
        mouse.set_lighting_color(2, [7, 8, 9]).unwrap();
        mouse.set_lighting_effect(0).unwrap();

        let writes = fake.writes();
        // Two colours, then one write per zone, then the startup setting.
        assert_eq!(writes.len(), 2 + ZONES.len() + 1);
        let startup = writes.last().unwrap();
        assert_eq!(startup[1], CMD_DEFAULT_LIGHTING | WIRELESS_FLAG);
        assert_eq!(&startup[2..], &[0x00, 0x00], "no effect on wake");
    }

    #[test]
    fn an_effect_the_device_does_not_have_is_refused() {
        let fake = FakeTransport::new();
        assert!(matches!(
            wireless(&fake).set_lighting_effect(7),
            Err(DeviceError::InvalidParameter(_))
        ));
    }

    #[test]
    fn a_reactive_colour_switches_off_with_a_different_shape_of_argument() {
        let on = FakeTransport::new();
        wireless(&on).set_reactive_color(Some([255, 0, 0])).unwrap();
        assert_eq!(&on.only_write()[2..], &[0x01, 0x00, 255, 0, 0]);

        let off = FakeTransport::new();
        wireless(&off).set_reactive_color(None).unwrap();
        assert_eq!(&off.only_write()[2..], &[0x00, 0x00, 0x00, 0x00, 0x00]);
    }

    #[test]
    fn the_battery_byte_carries_both_the_level_and_whether_it_is_charging() {
        // 0x15 is level 21, the top of the scale: (21 - 1) * 5.
        let full = parse_battery(&[0x00, 0x15]).unwrap().unwrap();
        assert_eq!(full.percent, 100);
        assert!(!full.charging);

        let charging = parse_battery(&[0x00, 0x15 | BATTERY_CHARGING_FLAG])
            .unwrap()
            .unwrap();
        assert_eq!(charging.percent, 100);
        assert!(charging.charging);

        let low = parse_battery(&[0x00, 0x02]).unwrap().unwrap();
        assert_eq!(low.percent, 5);
    }

    #[test]
    fn a_zero_level_is_no_reading_rather_than_an_empty_battery() {
        // The scale counts from one, so zero means the mouse said nothing —
        // asleep, or out of range. An empty gauge here would be a false alarm.
        assert!(parse_battery(&[0x00, 0x00]).unwrap().is_none());
        assert!(parse_battery(&[0x00, BATTERY_CHARGING_FLAG]).unwrap().is_none());
    }

    #[test]
    fn a_battery_answer_that_is_too_short_or_out_of_range_is_a_protocol_error() {
        assert!(matches!(
            parse_battery(&[0x00]),
            Err(DeviceError::Protocol(_))
        ));
        assert!(matches!(
            parse_battery(&[0x00, 0x7f]),
            Err(DeviceError::Protocol(_))
        ));
    }

    #[test]
    fn a_mouse_that_says_nothing_is_asleep_and_not_a_broken_connection() {
        // Nothing is queued, so the read comes back empty — which is what a
        // sleeping mouse does. The handle must survive it: dropping the device
        // here would disconnect a mouse that is merely idle.
        let fake = FakeTransport::new();
        let mut mouse = wireless(&fake);
        let state = mouse.read_state().expect("silence is not a failure");
        assert!(!state.powered_on);
        assert!(state.battery.is_none());
    }

    #[test]
    fn an_asleep_mouse_reads_as_off_rather_than_as_flat() {
        let fake = FakeTransport::new();
        fake.queue(&[0x00, 0x00]);
        let mut mouse = wireless(&fake);
        let state = mouse.read_state().unwrap();
        assert!(!state.powered_on);
        assert!(state.battery.is_none());
    }

    #[test]
    fn on_the_cable_there_is_no_battery_to_read_and_the_mouse_is_plainly_on() {
        let fake = FakeTransport::new();
        let mut mouse = wired(&fake);
        assert!(mouse.capabilities().battery.is_none());
        let state = mouse.read_state().unwrap();
        assert!(state.powered_on);
        assert!(state.battery.is_none());
        assert!(fake.wrote_nothing(), "no battery request goes out");
    }

    #[test]
    fn what_was_sent_is_what_is_offered_for_sending_again() {
        let fake = FakeTransport::new();
        let mut mouse = wireless(&fake);
        mouse.set_dpi_presets(&[800, 1600], 1).unwrap();
        mouse.set_polling_rate(500).unwrap();
        mouse.set_lighting_color(0, [1, 2, 3]).unwrap();

        let sent = mouse.sent();
        assert_eq!(sent.dpi_presets.as_deref(), Some(&[800u32, 1600][..]));
        assert_eq!(sent.dpi_active, Some(1));
        assert_eq!(sent.polling_rate, Some(500));
        assert_eq!(sent.lighting.unwrap().colors[0], [1, 2, 3]);
        // Nothing headset-shaped leaks into a mouse's record.
        assert!(mouse.sent().sidetone.is_none());
    }

    #[test]
    fn nothing_is_claimed_before_anything_has_been_sent() {
        let fake = FakeTransport::new();
        fake.queue(&[0x00, 0x15]);
        let mut mouse = wireless(&fake);
        let state = mouse.read_state().unwrap();
        assert!(state.dpi_presets.is_none(), "no invented defaults");
        assert!(state.polling_rate.is_none());
        assert!(state.lighting.is_none());
        assert!(mouse.sent().is_empty());
    }

    #[test]
    fn every_resolution_the_capability_advertises_can_actually_be_sent() {
        // The table is the capability: if the two could disagree, the UI would
        // offer a value the device would refuse.
        let caps = capabilities(PRODUCT_IDS_WIRELESS[0]);
        let advertised = caps.dpi.expect("the mouse has a sensor").values;
        assert_eq!(advertised.len(), DPI_VALUES.len());
        for cpi in advertised {
            let (resolved, _) = dpi_byte(cpi);
            assert_eq!(resolved, cpi, "{cpi} CPI is offered but does not map to itself");
        }
    }
}
