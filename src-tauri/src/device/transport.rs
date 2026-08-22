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

/// A transport that answers from a script instead of from hardware.
///
/// The protocol layer's pure helpers were already covered, but the path that
/// matters — write a command, read the answer, parse it, remember what was
/// sent — had no seam to test through. This is that seam. It is also what
/// makes adding a device from a written specification safe: the commands can
/// be checked against the document without the hardware in the room.
///
/// Clone shares the same log, so a test can keep a handle after the device has
/// taken ownership of its copy.
#[cfg(test)]
#[derive(Clone, Default)]
pub struct FakeTransport {
    inner: std::sync::Arc<parking_lot::Mutex<FakeInner>>,
}

#[cfg(test)]
#[derive(Default)]
struct FakeInner {
    writes: Vec<Vec<u8>>,
    responses: std::collections::VecDeque<Result<Vec<u8>, String>>,
    write_error: Option<String>,
}

#[cfg(test)]
impl FakeTransport {
    pub fn new() -> Self {
        Self::default()
    }

    /// Queue the next reply to a read.
    pub fn queue(&self, bytes: &[u8]) -> &Self {
        self.inner.lock().responses.push_back(Ok(bytes.to_vec()));
        self
    }

    /// Queue a read that fails, as an unplugged dongle does.
    pub fn queue_failure(&self, message: &str) -> &Self {
        self.inner
            .lock()
            .responses
            .push_back(Err(message.to_string()));
        self
    }

    /// Make every write fail from now on.
    pub fn fail_writes(&self, message: &str) -> &Self {
        self.inner.lock().write_error = Some(message.to_string());
        self
    }

    /// Let writes through again, as a device does when it comes back.
    pub fn allow_writes(&self) -> &Self {
        self.inner.lock().write_error = None;
        self
    }

    pub fn writes(&self) -> Vec<Vec<u8>> {
        self.inner.lock().writes.clone()
    }

    /// The single write a test expects, or a panic naming what it got instead.
    pub fn only_write(&self) -> Vec<u8> {
        let writes = self.writes();
        assert_eq!(writes.len(), 1, "expected exactly one write, got {writes:?}");
        writes.into_iter().next().unwrap()
    }

    pub fn wrote_nothing(&self) -> bool {
        self.inner.lock().writes.is_empty()
    }
}

#[cfg(test)]
impl Transport for FakeTransport {
    fn write(&mut self, payload: &[u8]) -> DeviceResult<()> {
        let mut inner = self.inner.lock();
        if let Some(message) = inner.write_error.clone() {
            return Err(DeviceError::Transport(message));
        }
        inner.writes.push(payload.to_vec());
        Ok(())
    }

    fn read_timeout(&mut self, buf: &mut [u8], _timeout_ms: i32) -> DeviceResult<usize> {
        match self.inner.lock().responses.pop_front() {
            Some(Ok(bytes)) => {
                let len = bytes.len().min(buf.len());
                buf[..len].copy_from_slice(&bytes[..len]);
                Ok(len)
            }
            Some(Err(message)) => Err(DeviceError::Transport(message)),
            // Nothing queued is a device that said nothing, not a hang.
            None => Ok(0),
        }
    }

    fn describe(&self) -> String {
        "fake".into()
    }
}
