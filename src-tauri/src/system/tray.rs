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
use crate::system::strings::fill;

pub const TRAY_ID: &str = "main";

/// Handles kept so the menu can be rewritten as the device changes — and as
/// the language changes, which is why even the fixed entries are held here.
pub struct TrayItems {
    status: MenuItem<Wry>,
    battery: MenuItem<Wry>,
    mute: MenuItem<Wry>,
    microphone: MenuItem<Wry>,
    show: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    // Disabled entries: readings, not actions.
    let status = MenuItem::with_id(app, "status", "No device detected", false, None::<&str>)?;
    let battery = MenuItem::with_id(app, "battery", "Battery: —", false, None::<&str>)?;
    let mute = MenuItem::with_id(app, "toggle-mute", "Mute output", true, None::<&str>)?;
    let microphone =
        MenuItem::with_id(app, "toggle-microphone", "Mute microphone", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Open Gear Control Center", true, None::<&str>)?;
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
        .tooltip("Gear Control Center")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_window(app),
            "quit" => {
                let handle = app.clone();
                if let Err(e) = app.run_on_main_thread(move || handle.exit(0)) {
                    log::warn!("could not reach the main thread to quit: {e}");
                }
            }
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
        show,
        quit,
    });
    Ok(())
}

/// Bring the window back.
///
/// Showing, unminimising and focusing are all GTK operations, and the two
/// places that call this — the tray menu and a second launch handing over its
/// arguments — both run on threads that are not the main loop. The menu's text
/// was moved onto the main thread once already; these were missed, which is
/// why the window could come back from the tray with its own title bar
/// buttons dead.
pub fn show_window(app: &AppHandle) {
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || {
        if let Some(window) = handle.webview_windows().values().next() {
            let _ = window.unminimize();
            let _ = window.set_focus();
            return;
        }
        // Closing to the tray closes the window outright, so there is nothing
        // to bring back — one is built.
        //
        // Wayland leaves no third option. Hiding a window destroys its surface,
        // and the replacement comes back with a decoration the compositor
        // draws but does not route clicks to: the title bar buttons stop
        // working. Minimising keeps the surface but cannot be undone —
        // xdg-shell lets a client minimise itself and gives it no way back.
        // A window that is built is a window that works.
        let Some(config) = handle.config().app.windows.first().cloned() else {
            log::warn!("no window is declared in the configuration to build");
            return;
        };
        match tauri::WebviewWindowBuilder::from_config(&handle, &config) {
            Ok(builder) => {
                if let Err(e) = builder.build() {
                    log::warn!("could not build the window: {e}");
                }
            }
            Err(e) => log::warn!("could not read the window configuration: {e}"),
        }
    }) {
        log::warn!("could not reach the main thread to show the window: {e}");
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

/// What the menu should say. Computed anywhere, applied only on the main thread.
struct TrayView {
    status: String,
    battery: String,
    mute: String,
    mute_enabled: bool,
    microphone: String,
    microphone_enabled: bool,
    open: String,
    quit: String,
    tooltip: String,
}

/// Rewrite the menu and tooltip from the latest reading.
///
/// The menu items are GTK objects and belong to the main thread. This is
/// called from the reader thread once a second; touching them directly from
/// there is undefined behaviour, and it intermittently wedged the GTK event
/// loop — which is what left the window's own close and minimise buttons
/// unresponsive. The text is built here and applied over there.
pub fn update(app: &AppHandle, snapshot: &Snapshot) {
    let Some(view) = describe(app, snapshot) else {
        return;
    };
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || apply(&handle, view)) {
        log::warn!("could not reach the main thread to update the tray: {e}");
    }
}

fn apply(app: &AppHandle, view: TrayView) {
    let Some(items) = app.try_state::<TrayItems>() else {
        return;
    };
    let _ = items.status.set_text(&view.status);
    let _ = items.battery.set_text(&view.battery);
    let _ = items.mute.set_text(&view.mute);
    let _ = items.mute.set_enabled(view.mute_enabled);
    let _ = items.microphone.set_text(&view.microphone);
    let _ = items.microphone.set_enabled(view.microphone_enabled);
    let _ = items.show.set_text(&view.open);
    let _ = items.quit.set_text(&view.quit);
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(&view.tooltip));
    }
}

fn describe(app: &AppHandle, snapshot: &Snapshot) -> Option<TrayView> {
    let text = app.state::<AppState>().strings.lock().clone();

    let name = snapshot
        .device
        .as_ref()
        .map(|d| d.name.clone())
        .unwrap_or_else(|| text.no_device.clone());

    let battery = match snapshot.state.as_ref().and_then(|s| s.battery.as_ref()) {
        Some(b) if b.charging => fill(&text.battery_charging, "percent", &b.percent.to_string()),
        Some(b) => fill(&text.battery, "percent", &b.percent.to_string()),
        None if snapshot.device.is_some() => text.battery_not_reported.clone(),
        None => text.battery_unknown.clone(),
    };

    let playback = snapshot.audio.as_ref().and_then(|a| a.playback.as_ref());
    let capture = snapshot.audio.as_ref().and_then(|a| a.capture.as_ref());
    let tooltip = match snapshot.state.as_ref().and_then(|s| s.battery.as_ref()) {
        Some(b) => format!("{name} — {}%", b.percent),
        None => name.clone(),
    };

    Some(TrayView {
        status: name,
        battery,
        mute: match playback {
            Some(c) if c.muted => text.unmute_output.clone(),
            _ => text.mute_output.clone(),
        },
        mute_enabled: playback.is_some(),
        microphone: match capture {
            Some(c) if c.muted => text.unmute_microphone.clone(),
            _ => text.mute_microphone.clone(),
        },
        microphone_enabled: capture.is_some(),
        open: text.open.clone(),
        quit: text.quit.clone(),
        tooltip,
    })
}
