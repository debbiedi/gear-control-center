//! The system tray entry.
//!
//! What belongs here is what someone wants without opening a window: is the
//! headset connected, how much battery is left, and the two mutes. Everything
//! else stays in the application.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Wry,
};

use crate::commands::{AppState, Snapshot};

pub const TRAY_ID: &str = "main";

/// Handles kept so the menu can be rewritten as the device changes.
pub struct TrayItems {
    status: MenuItem<Wry>,
    battery: MenuItem<Wry>,
    mute: MenuItem<Wry>,
    microphone: MenuItem<Wry>,
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    // Disabled entries: readings, not actions.
    let status = MenuItem::with_id(app, "status", "No device detected", false, None::<&str>)?;
    let battery = MenuItem::with_id(app, "battery", "Battery: —", false, None::<&str>)?;
    let mute = MenuItem::with_id(app, "toggle-mute", "Mute output", true, None::<&str>)?;
    let microphone =
        MenuItem::with_id(app, "toggle-microphone", "Mute microphone", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Open Headset Control Center", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &status,
            &battery,
            &PredefinedMenuItem::separator(app)?,
            &mute,
            &microphone,
            &PredefinedMenuItem::separator(app)?,
            &show,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("Headset Control Center")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_window(app),
            "quit" => app.exit(0),
            "toggle-mute" => toggle(app, true),
            "toggle-microphone" => toggle(app, false),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }
    builder.build(app)?;

    app.manage(TrayItems {
        status,
        battery,
        mute,
        microphone,
    });
    Ok(())
}

pub fn show_window(app: &AppHandle) {
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Flip one of the two mutes. Reads the current value first rather than
/// tracking it here, so the menu cannot drift out of step with the hardware.
fn toggle(app: &AppHandle, playback: bool) {
    let state = app.state::<AppState>();
    let mut manager = state.devices.lock();
    let current = manager.audio_state().and_then(Result::ok);
    let Some(audio) = current else { return };
    let control = if playback {
        audio.playback.as_ref()
    } else {
        audio.capture.as_ref()
    };
    let Some(control) = control else { return };
    let next = !control.muted;
    let result = if playback {
        manager.with_audio(|a| a.set_playback_muted(next))
    } else {
        manager.with_audio(|a| a.set_capture_muted(next))
    };
    if let Err(e) = result {
        log::warn!("tray mute failed: {e}");
    }
}

/// Rewrite the menu and tooltip from the latest reading.
pub fn update(app: &AppHandle, snapshot: &Snapshot) {
    let Some(items) = app.try_state::<TrayItems>() else {
        return;
    };

    let name = snapshot
        .device
        .as_ref()
        .map(|d| d.name.clone())
        .unwrap_or_else(|| "No device detected".into());
    let _ = items.status.set_text(&name);

    let battery = match snapshot.state.as_ref().and_then(|s| s.battery.as_ref()) {
        Some(b) if b.charging => format!("Battery: {}% · charging", b.percent),
        Some(b) => format!("Battery: {}%", b.percent),
        None if snapshot.device.is_some() => "Battery: not reported".into(),
        None => "Battery: —".into(),
    };
    let _ = items.battery.set_text(&battery);

    let playback = snapshot.audio.as_ref().and_then(|a| a.playback.as_ref());
    let capture = snapshot.audio.as_ref().and_then(|a| a.capture.as_ref());
    let _ = items.mute.set_text(match playback {
        Some(c) if c.muted => "Unmute output",
        _ => "Mute output",
    });
    let _ = items.mute.set_enabled(playback.is_some());
    let _ = items.microphone.set_text(match capture {
        Some(c) if c.muted => "Unmute microphone",
        _ => "Mute microphone",
    });
    let _ = items.microphone.set_enabled(capture.is_some());

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let tooltip = match snapshot.state.as_ref().and_then(|s| s.battery.as_ref()) {
            Some(b) => format!("{name} — {}%", b.percent),
            None => name,
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}
