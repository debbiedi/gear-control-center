use serde::Serialize;

/// Every failure a device operation can produce.
///
/// `Unsupported` is deliberately a first-class variant rather than an error
/// string: the UI branches on it to render "not supported by this device"
/// instead of an error toast. A protocol that cannot do something must return
/// this — never a silent success.
#[derive(Debug, thiserror::Error, Serialize, Clone, PartialEq, Eq)]
#[serde(tag = "kind", content = "detail", rename_all = "snake_case")]
pub enum DeviceError {
    /// The connected hardware genuinely lacks this feature.
    #[error("This feature is not supported by your device")]
    Unsupported(&'static str),

    /// The device was implemented from a written specification and nobody has
    /// confirmed this build against the hardware yet, so it is read-only.
    ///
    /// Distinct from `Unsupported` on purpose: the headset can do this, we
    /// simply will not send it a command we have never seen answered.
    #[error("This build has not been verified against your headset, so it only reads from it")]
    Unverified,

    /// The device is present but another process holds its control interface.
    #[error("The device is being controlled by another application")]
    Busy { holder: Option<String> },

    /// The dongle is connected but the headset itself is powered off.
    #[error("The headset is turned off")]
    Offline,

    /// No matching device is plugged in at all.
    #[error("No compatible device detected")]
    NotConnected,

    /// The transport layer failed (I/O, permissions, unplug mid-command).
    #[error("Unable to communicate with the device: {0}")]
    Transport(String),

    /// The device answered, but not with something we recognise.
    #[error("Unexpected response from the device: {0}")]
    Protocol(String),

    /// A caller passed a value the hardware cannot represent.
    #[error("Invalid value: {0}")]
    InvalidParameter(String),
}

pub type DeviceResult<T> = Result<T, DeviceError>;

impl From<hidapi::HidError> for DeviceError {
    fn from(e: hidapi::HidError) -> Self {
        DeviceError::Transport(e.to_string())
    }
}
