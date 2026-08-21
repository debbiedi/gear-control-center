//! Equalizer value conversion.
//!
//! Kept separate from any device implementation because it is pure arithmetic:
//! it is the part of the hardware protocol that can be tested exhaustively
//! without a headset plugged in.

use crate::device::error::{DeviceError, DeviceResult};

/// Maps a gain in dB onto the single byte a device expects, and back.
///
/// SteelSeries encodes each band as `baseline + gain_db * steps_per_db`, so
/// 0 dB is not 0 — it is the baseline. Getting this backwards would send a
/// full -12 dB cut to every band while the UI showed a flat curve.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EqCodec {
    pub baseline: u8,
    pub steps_per_db: f32,
    pub min_db: f32,
    pub max_db: f32,
}

impl EqCodec {
    /// Encoding used by the SteelSeries Arctis 7+ and its Nova siblings:
    /// `byte = 0x18 + 2 * dB`, giving 0.5 dB resolution across +/-12 dB.
    pub const STEELSERIES_NOVA: EqCodec = EqCodec {
        baseline: 0x18,
        steps_per_db: 2.0,
        min_db: -12.0,
        max_db: 12.0,
    };

    /// Smallest gain change the encoding can represent.
    pub fn step_db(&self) -> f32 {
        1.0 / self.steps_per_db
    }

    /// Encode one band. Out-of-range gains are rejected rather than clamped —
    /// a silently clamped value would leave the UI showing a curve the device
    /// is not playing.
    pub fn to_byte(&self, db: f32) -> DeviceResult<u8> {
        if !db.is_finite() || db < self.min_db || db > self.max_db {
            return Err(DeviceError::InvalidParameter(format!(
                "band gain {db} dB is outside the supported range {}..{} dB",
                self.min_db, self.max_db
            )));
        }
        let raw = f32::from(self.baseline) + db * self.steps_per_db;
        Ok(raw.round() as u8)
    }

    /// Decode one band back to dB.
    pub fn to_db(&self, byte: u8) -> f32 {
        (f32::from(byte) - f32::from(self.baseline)) / self.steps_per_db
    }

    /// Encode a whole curve.
    pub fn encode_curve(&self, bands_db: &[f32], expected: usize) -> DeviceResult<Vec<u8>> {
        if bands_db.len() != expected {
            return Err(DeviceError::InvalidParameter(format!(
                "this device needs exactly {expected} bands, got {}",
                bands_db.len()
            )));
        }
        bands_db.iter().map(|db| self.to_byte(*db)).collect()
    }

    pub fn decode_curve(&self, bytes: &[u8]) -> Vec<f32> {
        bytes.iter().map(|b| self.to_db(*b)).collect()
    }
}

/// A named factory curve stored in the device firmware.
#[derive(Debug, Clone, Copy)]
pub struct EqPreset {
    pub name: &'static str,
    /// Raw per-band bytes, exactly as the device expects them.
    pub bytes: [u8; 10],
}

/// The four presets the Arctis 7+ ships with.
///
/// Stored as raw bytes rather than dB so that what we send is byte-identical
/// to what the vendor software sends, with no rounding drift in between.
pub const ARCTIS_7_PLUS_PRESETS: [EqPreset; 4] = [
    EqPreset {
        name: "Flat",
        bytes: [0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18],
    },
    EqPreset {
        name: "Bass Boost",
        bytes: [0x1f, 0x20, 0x1a, 0x15, 0x15, 0x16, 0x16, 0x16, 0x16, 0x23],
    },
    EqPreset {
        name: "Smiley",
        bytes: [0x1e, 0x1b, 0x15, 0x10, 0x10, 0x13, 0x1b, 0x1e, 0x20, 0x1f],
    },
    EqPreset {
        name: "Focus",
        bytes: [0x0e, 0x16, 0x11, 0x13, 0x20, 0x24, 0x1f, 0x11, 0x18, 0x11],
    },
];

/// Nominal band centre frequencies shown in the UI.
///
/// `[unverified]` — the protocol carries ten positional gains and never names
/// their frequencies, and SteelSeries does not publish them. These are the
/// standard ten-band ISO centres and are used for labelling only; they do not
/// affect a single byte sent to the device.
pub const ARCTIS_7_PLUS_BAND_FREQUENCIES: [u32; 10] =
    [31, 62, 125, 250, 500, 1_000, 2_000, 4_000, 8_000, 16_000];

#[cfg(test)]
mod tests {
    use super::*;

    const C: EqCodec = EqCodec::STEELSERIES_NOVA;

    #[test]
    fn zero_db_is_the_baseline_not_zero() {
        assert_eq!(C.to_byte(0.0).unwrap(), 0x18);
    }

    #[test]
    fn range_endpoints_map_to_encoding_endpoints() {
        assert_eq!(C.to_byte(12.0).unwrap(), 0x30);
        assert_eq!(C.to_byte(-12.0).unwrap(), 0x00);
    }

    #[test]
    fn half_db_steps_are_representable() {
        assert_eq!(C.to_byte(0.5).unwrap(), 0x19);
        assert_eq!(C.to_byte(-0.5).unwrap(), 0x17);
        assert_eq!(C.to_byte(3.5).unwrap(), 0x1f);
        assert_eq!(C.step_db(), 0.5);
    }

    #[test]
    fn out_of_range_is_rejected_not_clamped() {
        assert!(C.to_byte(12.5).is_err());
        assert!(C.to_byte(-12.5).is_err());
        assert!(C.to_byte(f32::NAN).is_err());
        assert!(C.to_byte(f32::INFINITY).is_err());
    }

    #[test]
    fn encoding_round_trips_across_the_whole_range() {
        let mut db = -12.0_f32;
        while db <= 12.0 {
            let byte = C.to_byte(db).unwrap();
            assert!(
                (C.to_db(byte) - db).abs() < f32::EPSILON,
                "{db} dB did not round-trip"
            );
            db += 0.5;
        }
    }

    #[test]
    fn curve_length_must_match_the_device() {
        assert!(C.encode_curve(&[0.0; 10], 10).is_ok());
        assert!(C.encode_curve(&[0.0; 9], 10).is_err());
        assert!(C.encode_curve(&[0.0; 11], 10).is_err());
    }

    #[test]
    fn flat_preset_is_genuinely_flat() {
        let flat = ARCTIS_7_PLUS_PRESETS[0];
        assert_eq!(flat.name, "Flat");
        assert!(C.decode_curve(&flat.bytes).iter().all(|db| *db == 0.0));
    }

    /// Guards the preset tables against a transcription slip: every stored
    /// byte must decode to a gain the device can actually accept.
    #[test]
    fn every_preset_byte_decodes_inside_the_supported_range() {
        for preset in ARCTIS_7_PLUS_PRESETS {
            for byte in preset.bytes {
                let db = C.to_db(byte);
                assert!(
                    db >= C.min_db && db <= C.max_db,
                    "preset {} has byte {byte:#04x} decoding to {db} dB",
                    preset.name
                );
                assert_eq!(C.to_byte(db).unwrap(), byte, "preset {}", preset.name);
            }
        }
    }

    #[test]
    fn bass_boost_lifts_the_low_bands_and_cuts_the_mids() {
        let curve = C.decode_curve(&ARCTIS_7_PLUS_PRESETS[1].bytes);
        assert_eq!(curve[0], 3.5);
        assert_eq!(curve[1], 4.0);
        assert!(curve[3] < 0.0, "expected a mid cut, got {}", curve[3]);
    }

    #[test]
    fn one_frequency_label_per_band() {
        assert_eq!(
            ARCTIS_7_PLUS_BAND_FREQUENCIES.len(),
            ARCTIS_7_PLUS_PRESETS[0].bytes.len()
        );
    }
}
