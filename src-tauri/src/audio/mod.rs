//! Host-side control of the headset's own audio hardware.
//!
//! A USB Audio Class device exposes its volume and mute as feature units, and
//! the kernel surfaces those as ALSA mixer controls on the card it created for
//! the device. Writing them changes the hardware, not a software mixer —
//! which is why this belongs here and not in a PipeWire wrapper: turning the
//! headset down in this application turns it down for everything, exactly as
//! the dial on the cup would.
//!
//! Nothing above this module knows ALSA exists.

pub mod chatmix;

use alsa::mixer::{Mixer, Selem, SelemChannelId, SelemId};
use serde::Serialize;

use crate::device::error::{DeviceError, DeviceResult};

/// One mixer control, reported at the resolution ALSA actually offers.
///
/// `value` is a raw step, not a percentage: the Arctis 7+ playback control has
/// 78 positions and the capture control 84, and rounding those into 0–100
/// would make two neighbouring steps look identical.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct MixerControl {
    pub value: i64,
    pub min: i64,
    pub max: i64,
    /// Hundredths of a decibel, as ALSA reports them. `None` when the driver
    /// publishes no dB scale.
    pub db: Option<i64>,
    pub muted: bool,
}

impl MixerControl {
    /// Position within the range, for a slider that still snaps to real steps.
    pub fn percent(&self) -> u8 {
        let span = (self.max - self.min).max(1);
        (((self.value - self.min) * 100) / span).clamp(0, 100) as u8
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AudioState {
    pub playback: Option<MixerControl>,
    pub capture: Option<MixerControl>,
}

/// Finds and drives the ALSA card belonging to one USB device.
pub struct AudioController {
    vendor_id: u16,
    product_id: u16,
    /// Cached card index. Re-resolved whenever the card cannot be opened,
    /// because indices move when devices are replugged.
    card: Option<u32>,
}

impl AudioController {
    pub fn new(vendor_id: u16, product_id: u16) -> Self {
        Self {
            vendor_id,
            product_id,
            card: None,
        }
    }

    /// Locate the card the kernel created for this USB device.
    ///
    /// `/proc/asound/card*/usbid` is the only mapping that survives a rename:
    /// card names are derived from the product string and collide between two
    /// headsets of the same model.
    fn resolve_card(&self) -> Option<u32> {
        let wanted = format!("{:04x}:{:04x}", self.vendor_id, self.product_id);
        let entries = std::fs::read_dir("/proc/asound").ok()?;
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            let Some(index) = name.strip_prefix("card").and_then(|n| n.parse::<u32>().ok()) else {
                continue;
            };
            let usbid = std::fs::read_to_string(entry.path().join("usbid")).ok();
            if usbid.map(|s| s.trim().eq_ignore_ascii_case(&wanted)) == Some(true) {
                return Some(index);
            }
        }
        None
    }

    fn card_index(&mut self) -> DeviceResult<u32> {
        if let Some(index) = self.card {
            return Ok(index);
        }
        let index = self.resolve_card().ok_or_else(|| {
            DeviceError::Transport("the device has no audio card on this system".into())
        })?;
        self.card = Some(index);
        Ok(index)
    }

    fn with_mixer<T>(&mut self, op: impl FnOnce(&Mixer) -> DeviceResult<T>) -> DeviceResult<T> {
        let index = self.card_index()?;
        let mixer = match Mixer::new(&format!("hw:{index}"), false) {
            Ok(m) => m,
            Err(e) => {
                // The card moved or went away: forget it so the next call
                // looks it up again rather than failing forever.
                self.card = None;
                return Err(DeviceError::Transport(format!(
                    "could not open the device's mixer: {e}"
                )));
            }
        };
        op(&mixer)
    }

    pub fn state(&mut self) -> DeviceResult<AudioState> {
        self.with_mixer(|mixer| {
            Ok(AudioState {
                playback: find_playback(mixer).and_then(|s| read_playback(&s)),
                capture: find_capture(mixer).and_then(|s| read_capture(&s)),
            })
        })
    }

    pub fn set_playback_volume(&mut self, value: i64) -> DeviceResult<()> {
        self.with_mixer(|mixer| {
            let selem = find_playback(mixer).ok_or(DeviceError::Unsupported("volume"))?;
            let (min, max) = selem.get_playback_volume_range();
            if value < min || value > max {
                return Err(DeviceError::InvalidParameter(format!(
                    "volume {value} is outside the device range {min}..{max}"
                )));
            }
            selem
                .set_playback_volume_all(value)
                .map_err(|e| DeviceError::Transport(e.to_string()))
        })
    }

    pub fn set_playback_muted(&mut self, muted: bool) -> DeviceResult<()> {
        self.with_mixer(|mixer| {
            let selem = find_playback(mixer).ok_or(DeviceError::Unsupported("mute"))?;
            if !selem.has_playback_switch() {
                return Err(DeviceError::Unsupported("mute"));
            }
            selem
                .set_playback_switch_all(if muted { 0 } else { 1 })
                .map_err(|e| DeviceError::Transport(e.to_string()))
        })
    }

    pub fn set_capture_volume(&mut self, value: i64) -> DeviceResult<()> {
        self.with_mixer(|mixer| {
            let selem = find_capture(mixer).ok_or(DeviceError::Unsupported("microphone volume"))?;
            let (min, max) = selem.get_capture_volume_range();
            if value < min || value > max {
                return Err(DeviceError::InvalidParameter(format!(
                    "microphone level {value} is outside the device range {min}..{max}"
                )));
            }
            selem
                .set_capture_volume_all(value)
                .map_err(|e| DeviceError::Transport(e.to_string()))
        })
    }

    pub fn set_capture_muted(&mut self, muted: bool) -> DeviceResult<()> {
        self.with_mixer(|mixer| {
            let selem = find_capture(mixer).ok_or(DeviceError::Unsupported("microphone mute"))?;
            if !selem.has_capture_switch() {
                return Err(DeviceError::Unsupported("microphone mute"));
            }
            selem
                .set_capture_switch_all(if muted { 0 } else { 1 })
                .map_err(|e| DeviceError::Transport(e.to_string()))
        })
    }
}

/// Pick controls by what they can do, not by name.
///
/// The Arctis 7+ calls them "PCM" and "Mic", but the names are chosen by the
/// driver from the device's own strings and vary between models. Capability is
/// the stable property.
fn find_playback<'a>(mixer: &'a Mixer) -> Option<Selem<'a>> {
    mixer
        .iter()
        .filter_map(Selem::new)
        .find(|s| s.has_playback_volume())
}

fn find_capture<'a>(mixer: &'a Mixer) -> Option<Selem<'a>> {
    mixer
        .iter()
        .filter_map(Selem::new)
        .find(|s| s.has_capture_volume())
}

fn read_playback(selem: &Selem) -> Option<MixerControl> {
    let channel = SelemChannelId::mono();
    let (min, max) = selem.get_playback_volume_range();
    let value = selem.get_playback_volume(channel).ok()?;
    Some(MixerControl {
        value,
        min,
        max,
        db: selem.get_playback_vol_db(channel).ok().map(|d| d.0),
        muted: selem
            .get_playback_switch(channel)
            .map(|on| on == 0)
            .unwrap_or(false),
    })
}

fn read_capture(selem: &Selem) -> Option<MixerControl> {
    let channel = SelemChannelId::mono();
    let (min, max) = selem.get_capture_volume_range();
    let value = selem.get_capture_volume(channel).ok()?;
    Some(MixerControl {
        value,
        min,
        max,
        db: selem.get_capture_vol_db(channel).ok().map(|d| d.0),
        muted: selem
            .get_capture_switch(channel)
            .map(|on| on == 0)
            .unwrap_or(false),
    })
}

/// Selem lookups are by id in some ALSA bindings; keep the helper available
/// for devices that need an exact name rather than a capability match.
#[allow(dead_code)]
pub fn selem_id(name: &str) -> SelemId {
    SelemId::new(name, 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_spans_the_real_range() {
        let c = MixerControl { value: 0, min: 0, max: 77, db: None, muted: false };
        assert_eq!(c.percent(), 0);
        let c = MixerControl { value: 77, min: 0, max: 77, db: None, muted: false };
        assert_eq!(c.percent(), 100);
        let c = MixerControl { value: 54, min: 0, max: 77, db: None, muted: false };
        assert_eq!(c.percent(), 70);
    }

    #[test]
    fn percent_survives_a_degenerate_range() {
        // A driver that reports min == max must not divide by zero.
        let c = MixerControl { value: 5, min: 5, max: 5, db: None, muted: false };
        assert_eq!(c.percent(), 0);
    }
}

/// Either the real card or the stand-in used by the simulated device.
///
/// The simulation carries the same ranges as the hardware it stands in for, so
/// an interface built against it cannot assume a resolution the card will not
/// deliver.
pub enum AudioBackend {
    Alsa(AudioController),
    Simulated(AudioState),
}

impl AudioBackend {
    pub fn for_device(vendor_id: u16, product_id: u16, simulated: bool) -> Self {
        if simulated {
            Self::Simulated(AudioState {
                playback: Some(MixerControl {
                    value: 54,
                    min: 0,
                    max: 77,
                    db: Some(-2300),
                    muted: false,
                }),
                capture: Some(MixerControl {
                    value: 83,
                    min: 0,
                    max: 83,
                    db: Some(0),
                    muted: false,
                }),
            })
        } else {
            Self::Alsa(AudioController::new(vendor_id, product_id))
        }
    }

    pub fn state(&mut self) -> DeviceResult<AudioState> {
        match self {
            Self::Alsa(c) => c.state(),
            Self::Simulated(s) => Ok(s.clone()),
        }
    }

    pub fn set_playback_volume(&mut self, value: i64) -> DeviceResult<()> {
        match self {
            Self::Alsa(c) => c.set_playback_volume(value),
            Self::Simulated(s) => set_simulated(s.playback.as_mut(), "volume", value),
        }
    }

    pub fn set_playback_muted(&mut self, muted: bool) -> DeviceResult<()> {
        match self {
            Self::Alsa(c) => c.set_playback_muted(muted),
            Self::Simulated(s) => {
                s.playback
                    .as_mut()
                    .ok_or(DeviceError::Unsupported("mute"))?
                    .muted = muted;
                Ok(())
            }
        }
    }

    pub fn set_capture_volume(&mut self, value: i64) -> DeviceResult<()> {
        match self {
            Self::Alsa(c) => c.set_capture_volume(value),
            Self::Simulated(s) => set_simulated(s.capture.as_mut(), "microphone volume", value),
        }
    }

    pub fn set_capture_muted(&mut self, muted: bool) -> DeviceResult<()> {
        match self {
            Self::Alsa(c) => c.set_capture_muted(muted),
            Self::Simulated(s) => {
                s.capture
                    .as_mut()
                    .ok_or(DeviceError::Unsupported("microphone mute"))?
                    .muted = muted;
                Ok(())
            }
        }
    }
}

/// The simulation rejects exactly what the card rejects.
fn set_simulated(
    control: Option<&mut MixerControl>,
    what: &'static str,
    value: i64,
) -> DeviceResult<()> {
    let control = control.ok_or(DeviceError::Unsupported(what))?;
    if value < control.min || value > control.max {
        return Err(DeviceError::InvalidParameter(format!(
            "{what} {value} is outside the device range {}..{}",
            control.min, control.max
        )));
    }
    control.value = value;
    Ok(())
}
