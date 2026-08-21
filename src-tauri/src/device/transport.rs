use super::error::{DeviceError, DeviceResult};

/// A raw byte channel to a device.
///
/// Deliberately dumb: it moves bytes and nothing else. Report padding, command
/// framing and response parsing all live in the protocol layer, so swapping
/// hidraw for libusb changes only this file.
pub trait Transport: Send {
    fn write(&mut self, payload: &[u8]) -> DeviceResult<()>;
    fn read_timeout(&mut self, buf: &mut [u8], timeout_ms: i32) -> DeviceResult<usize>;
    fn describe(&self) -> String;
}

/// Transport over a HID interface, via hidapi's hidraw backend on Linux and
/// the native HID stack elsewhere.
///
/// HID is the primary transport because it needs no driver installation on
/// Windows. If a platform refuses to expose the vendor interface as HID, a
/// libusb-backed `Transport` can be added beside this one without touching the
/// protocol or manager layers.
pub struct HidTransport {
    device: hidapi::HidDevice,
    path: String,
}

impl HidTransport {
    pub fn open(api: &hidapi::HidApi, path: &std::ffi::CStr) -> DeviceResult<Self> {
        let device = api.open_path(path).map_err(|e| match e {
            // hidapi collapses "permission denied" and "already claimed" into
            // the same generic failure, so we cannot reliably tell them apart
            // here. The manager re-checks and produces a precise message.
            other => DeviceError::Transport(other.to_string()),
        })?;
        Ok(Self {
            device,
            path: path.to_string_lossy().into_owned(),
        })
    }
}

impl Transport for HidTransport {
    fn write(&mut self, payload: &[u8]) -> DeviceResult<()> {
        self.device.write(payload)?;
        Ok(())
    }

    fn read_timeout(&mut self, buf: &mut [u8], timeout_ms: i32) -> DeviceResult<usize> {
        Ok(self.device.read_timeout(buf, timeout_ms)?)
    }

    fn describe(&self) -> String {
        format!("hid:{}", self.path)
    }
}
