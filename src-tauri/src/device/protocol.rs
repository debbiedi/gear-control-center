use super::error::{DeviceError, DeviceResult};
use super::types::{Capabilities, DeviceInfo, DeviceState, Sent};

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

    /// What this handle has sent that the device will not report back, so
    /// the manager can send it again after a reconnect. A device that is
    /// read-only, or that reports everything, has nothing to say here.
    fn sent(&self) -> Sent {
        Sent::default()
    }

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

    /// Set the resolutions the device cycles through, and which is selected.
    ///
    /// One command, not one per preset: the device replaces the whole list at
    /// once, so sending them separately would leave it briefly holding a list
    /// nobody asked for.
    fn set_dpi_presets(&mut self, _dpis: &[u32], _active: u8) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("dpi"))
    }

    fn set_polling_rate(&mut self, _hz: u16) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("polling_rate"))
    }

    /// Light one zone a fixed colour. Zones are indexed as
    /// [`crate::device::types::LightingSupport::zones`] names them.
    fn set_lighting_color(&mut self, _zone: u8, _rgb: [u8; 3]) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("lighting"))
    }

    /// Run one of the device's own effects, indexed as
    /// [`crate::device::types::LightingSupport::effects`] lists them.
    fn set_lighting_effect(&mut self, _effect: u8) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("lighting_effect"))
    }

    /// Flash a colour on a button press, or `None` to stop.
    fn set_reactive_color(&mut self, _rgb: Option<[u8; 3]>) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("reactive_color"))
    }

    /// Idle seconds before the lighting dims. 0 disables dimming.
    fn set_dim_timer(&mut self, _seconds: u16) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("dim_timer"))
    }

    /// Commit the current settings to the device's own memory.
    ///
    /// Offered as its own command rather than run after every write: this puts
    /// the settings in flash, and a slider that saved on each drag would write
    /// to it a hundred times to move one number.
    fn save_to_device(&mut self) -> DeviceResult<()> {
        Err(DeviceError::Unsupported("onboard_memory"))
    }

    /// Release the underlying handle. Called on unplug and on app exit.
    fn disconnect(&mut self) -> DeviceResult<()> {
        Ok(())
    }
}
