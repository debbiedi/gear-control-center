//! Small, versioned JSON files under the user's config directory.
//!
//! Deliberately plain: three files, human-readable, in the place a Linux user
//! would look for them — preferences, profiles, and what each headset was last
//! sent. Nothing here is a database, and a user who edits one
//! by hand and gets it wrong loses that file's contents, not the application.

use std::path::{Path, PathBuf};

use serde::{de::DeserializeOwned, Serialize};

use crate::device::error::{DeviceError, DeviceResult};

/// What this directory was called before the application was renamed.
///
/// The name of the directory follows the name of the application, so renaming
/// it moved everybody's settings out from under them. This is how they are
/// picked back up.
const PREVIOUS_NAME: &str = "headset-control-center";

fn base_dir() -> PathBuf {
    std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn config_dir() -> PathBuf {
    let base = base_dir();
    let current = base.join("gear-control-center");
    // Once per process, and only ever when there is nothing here yet.
    static ADOPTED: std::sync::Once = std::sync::Once::new();
    ADOPTED.call_once(|| adopt(&base.join(PREVIOUS_NAME), &current));
    current
}

/// Bring the previous name's files across, if there are any and this name has
/// none.
///
/// Copied rather than moved, and only into an empty place. Moving would leave
/// anyone who goes back to the old build with nothing, and writing into a
/// directory that already has files in it could overwrite newer ones — neither
/// is worth the few kilobytes saved. A file that will not copy is logged and
/// stepped over: losing one setting is better than failing to start.
fn adopt(previous: &Path, current: &Path) {
    if current.exists() || !previous.is_dir() {
        return;
    }
    let Ok(entries) = std::fs::read_dir(previous) else {
        return;
    };
    if let Err(e) = std::fs::create_dir_all(current) {
        log::warn!("could not create {}: {e}", current.display());
        return;
    }

    let mut brought = 0;
    for entry in entries.flatten() {
        if !entry.file_type().is_ok_and(|t| t.is_file()) {
            continue;
        }
        let to = current.join(entry.file_name());
        match std::fs::copy(entry.path(), &to) {
            Ok(_) => brought += 1,
            Err(e) => log::warn!("could not bring {} across: {e}", entry.path().display()),
        }
    }
    if brought > 0 {
        log::info!(
            "brought {brought} file(s) across from {}",
            previous.display()
        );
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn write(dir: &Path, name: &str, body: &str) {
        std::fs::create_dir_all(dir).unwrap();
        std::fs::write(dir.join(name), body).unwrap();
    }

    fn temp(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "gear-cc-test-{label}-{}-{:?}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn settings_written_under_the_old_name_are_picked_back_up() {
        // The rename must not cost anyone their profiles.
        let base = temp("adopt");
        let previous = base.join(PREVIOUS_NAME);
        write(&previous, "settings.json", r#"{"version":1}"#);
        write(&previous, "profiles.json", r#"{"profiles":[]}"#);

        let current = base.join("gear-control-center");
        adopt(&previous, &current);

        assert_eq!(
            std::fs::read_to_string(current.join("settings.json")).unwrap(),
            r#"{"version":1}"#
        );
        assert!(current.join("profiles.json").exists());
        // Copied, not moved: an older build still finds its own files.
        assert!(previous.join("settings.json").exists());
    }

    #[test]
    fn files_already_under_the_new_name_are_left_alone() {
        // Running again must not drag a stale copy over a newer file.
        let base = temp("keep");
        let previous = base.join(PREVIOUS_NAME);
        write(&previous, "settings.json", "old");
        let current = base.join("gear-control-center");
        write(&current, "settings.json", "new");

        adopt(&previous, &current);

        assert_eq!(
            std::fs::read_to_string(current.join("settings.json")).unwrap(),
            "new"
        );
    }

    #[test]
    fn a_fresh_install_with_no_previous_directory_is_not_an_error() {
        let base = temp("fresh");
        let current = base.join("gear-control-center");
        adopt(&base.join(PREVIOUS_NAME), &current);
        assert!(!current.exists(), "nothing is created out of nothing");
    }
}
