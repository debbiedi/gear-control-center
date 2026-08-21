use super::error::{DeviceError, DeviceResult};
use super::types::{Capabilities, DeviceInfo, DeviceState};

/// The single interface every device implementation exposes upward.
///
/// Unimplemented methods default to [`DeviceError::Unsupported`] rather than
/// panicking or pretending to succeed. A device that cannot set an equalizer
/// says so, and the UI shows "not supported by this device" — it never reports
/// a save that did not happen.
pub trait DeviceProtocol: Send {
    fn info(&self) -> &DeviceInfo;
    fn capabilities(&self) -> &Capabilities;

    /// Read everything the device will currently tell us.
    fn read_state(&mut self) -> DeviceResult<DeviceState>;

    fn set_sidetone(&mut self, _level: u8) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("sidetone"))
    }

    fn set_inactive_time(&mut self, _minutes: u8) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("inactive_time"))
    }

    /// Apply a full equalizer curve, one gain in dB per band.
    fn set_equalizer(&mut self, _bands_db: &[f32]) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("equalizer"))
    }

    fn set_equalizer_preset(&mut self, _preset: u8) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("equalizer_preset"))
    }

    /// Release the underlying handle. Called on unplug and on app exit.
    fn disconnect(&mut self) -> DeviceResult<()> {
        Ok(())
    }
}
