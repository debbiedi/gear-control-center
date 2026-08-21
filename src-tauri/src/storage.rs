//! Small, versioned JSON files under the user's config directory.
//!
//! Deliberately plain: two files, human-readable, in the place a Linux user
//! would look for them. Nothing here is a database, and a user who edits one
//! by hand and gets it wrong loses that file's contents, not the application.

use std::path::PathBuf;

use serde::{de::DeserializeOwned, Serialize};

use crate::device::error::{DeviceError, DeviceResult};

pub fn config_dir() -> PathBuf {
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("headset-control-center")
}

pub fn path_for(file: &str) -> PathBuf {
    config_dir().join(file)
}

/// Read a file, falling back to the default when it is missing or unreadable.
///
/// A corrupt file is logged and stepped over rather than deleted: the user may
/// want to look at it, and silently replacing it would destroy the evidence.
pub fn load<T: DeserializeOwned + Default>(file: &str) -> T {
    let path = path_for(file);
    let Ok(text) = std::fs::read_to_string(&path) else {
        return T::default();
    };
    match serde_json::from_str(&text) {
        Ok(value) => value,
        Err(e) => {
            log::error!("could not read {}: {e}", path.display());
            T::default()
        }
    }
}

/// Write via a temporary file and a rename, so a crash mid-write cannot leave
/// half a file behind.
pub fn save<T: Serialize>(file: &str, value: &T) -> DeviceResult<()> {
    let path = path_for(file);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            DeviceError::Transport(format!("could not create {}: {e}", parent.display()))
        })?;
    }
    let text = serde_json::to_string_pretty(value)
        .map_err(|e| DeviceError::Protocol(format!("could not serialise {file}: {e}")))?;
    let temp = path.with_extension("tmp");
    std::fs::write(&temp, text)
        .map_err(|e| DeviceError::Transport(format!("could not write {}: {e}", temp.display())))?;
    std::fs::rename(&temp, &path)
        .map_err(|e| DeviceError::Transport(format!("could not replace {}: {e}", path.display())))
}
