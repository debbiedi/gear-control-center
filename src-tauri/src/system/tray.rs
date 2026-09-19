//! The system tray entry.
//!
//! What belongs here is what someone wants without opening a window: is the
//! headset connected, how much battery is left, and the two mutes. Everything
//! else stays in the application.

use parking_lot::Mutex;
use tauri::{
    menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Wry,
};

use crate::commands::{AppState, Snapshot};
use crate::system::strings::fill;

pub const TRAY_ID: &str = "main";

/// Handles kept so the menu can be rewritten as the device changes — and as
/// the language changes, which is why even the fixed entries are held here.
pub struct TrayItems {
    /// Two lines per open device — its name and its reading — in the order the
    /// menu shows them. Held behind a lock because, unlike the rest of the
    /// menu, this part is rebuilt when a device appears or goes away.
    devices: Mutex<Vec<MenuItem<Wry>>>,
    /// The device ids those lines belong to, so a rebuild happens when the set
    /// of devices changes rather than on every reading.
    device_ids: Mutex<Vec<String>>,
    mute: MenuItem<Wry>,
    microphone: MenuItem<Wry>,
    show: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    // Disabled entries: readings, not actions.
    let status = MenuItem::with_id(app, "status", "No device detected", false, None::<&str>)?;
    let mute = MenuItem::with_id(app, "toggle-mute", "Mute output", true, None::<&str>)?;
    let microphone =
        MenuItem::with_id(app, "toggle-microphone", "Mute microphone", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Open Gear Control Center", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // One placeholder line until the first reading arrives and says what is
    // actually attached.
    let menu = compose(app, &[&status], &mute, &microphone, &show, &quit)?;

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
        devices: Mutex::new(vec![status]),
        device_ids: Mutex::new(Vec::new()),
        mute,
        microphone,
        show,
        quit,
    });
    Ok(())
}

/// Put the menu together: the device lines, then the actions.
///
/// Separated out because the device lines are rebuilt while the rest is not,
/// and both paths have to produce the same shape of menu.
fn compose(
    app: &AppHandle,
    devices: &[&MenuItem<Wry>],
    mute: &MenuItem<Wry>,
    microphone: &MenuItem<Wry>,
    show: &MenuItem<Wry>,
    quit: &MenuItem<Wry>,
) -> tauri::Result<Menu<Wry>> {
    let first = PredefinedMenuItem::separator(app)?;
    let second = PredefinedMenuItem::separator(app)?;
    let mut items: Vec<&dyn IsMenuItem<Wry>> = Vec::with_capacity(devices.len() + 5);
    for device in devices {
        items.push(*device);
    }
    items.push(&first);
    items.push(mute);
    items.push(microphone);
    items.push(&second);
    items.push(show);
    items.push(quit);
    Menu::with_items(app, &items)
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

/// One device's two lines in the menu.
struct DeviceLine {
    id: String,
    name: String,
    battery: String,
}

/// What the menu should say. Computed anywhere, applied only on the main thread.
struct TrayView {
    /// Every open device, the selected one first. Never empty: with nothing
    /// attached it holds a single line saying so.
    devices: Vec<DeviceLine>,
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
    apply_devices(app, &items, &view);
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

/// Put the device lines in the menu.
///
/// Rebuilding the menu is only done when the set of devices has changed —
/// plugging one in, switching one off. A reading that moves from 55% to 50%
/// rewrites two labels and leaves the menu alone, because rebuilding it a
/// second is both wasteful and, on GTK, visible.
fn apply_devices(app: &AppHandle, items: &TrayItems, view: &TrayView) {
    let ids: Vec<String> = view.devices.iter().map(|d| d.id.clone()).collect();
    let same_devices = *items.device_ids.lock() == ids;

    if same_devices {
        for (line, pair) in view.devices.iter().zip(items.devices.lock().chunks(2)) {
            if let [name, battery] = pair {
                let _ = name.set_text(&line.name);
                let _ = battery.set_text(&line.battery);
            }
        }
        return;
    }

    let mut built: Vec<MenuItem<Wry>> = Vec::with_capacity(view.devices.len() * 2);
    for line in &view.devices {
        // Disabled: these are readings, not actions. Switching device is done
        // in the window, where there is room to say what each one can do.
        let name = MenuItem::with_id(app, format!("name-{}", line.id), &line.name, false, None::<&str>);
        let battery =
            MenuItem::with_id(app, format!("battery-{}", line.id), &line.battery, false, None::<&str>);
        match (name, battery) {
            (Ok(name), Ok(battery)) => {
                built.push(name);
                built.push(battery);
            }
            _ => {
                log::warn!("could not build the tray entry for {}", line.name);
                return;
            }
        }
    }

    let refs: Vec<&MenuItem<Wry>> = built.iter().collect();
    let menu = match compose(app, &refs, &items.mute, &items.microphone, &items.show, &items.quit) {
        Ok(menu) => menu,
        Err(e) => {
            log::warn!("could not rebuild the tray menu: {e}");
            return;
        }
    };
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    if let Err(e) = tray.set_menu(Some(menu)) {
        log::warn!("could not install the tray menu: {e}");
        return;
    }
    // Only once the menu is actually in place, so a failed rebuild leaves the
    // handles pointing at what is still on screen.
    *items.devices.lock() = built;
    *items.device_ids.lock() = ids;
}

/// The device lines, in the order the menu shows them.
///
/// Its own function because this is where the menu can quietly go wrong —
/// listing the devices in whatever order the bus enumerated them, or showing
/// an empty menu when nothing is attached — and neither needs a window to
/// test.
fn device_lines(
    devices: &[crate::device::DeviceSummary],
    selected: Option<&str>,
    text: &crate::system::strings::NativeStrings,
) -> Vec<DeviceLine> {
    if devices.is_empty() {
        return vec![DeviceLine {
            id: String::new(),
            name: text.no_device.clone(),
            battery: text.battery_unknown.clone(),
        }];
    }

    let reading = |device: &crate::device::DeviceSummary| match device.battery {
        Some(b) if b.charging => fill(&text.battery_charging, "percent", &b.percent.to_string()),
        Some(b) => fill(&text.battery, "percent", &b.percent.to_string()),
        // Powered on but saying nothing is not the same as switched off, and
        // the two have their own words.
        None if device.powered_on => text.battery_not_reported.clone(),
        None => text.battery_unknown.clone(),
    };

    // The selected device leads, because it is the one the mutes below act on.
    // A stable sort, so the rest keep the order they were discovered in.
    let mut ordered: Vec<&crate::device::DeviceSummary> = devices.iter().collect();
    ordered.sort_by_key(|d| Some(d.id.as_str()) != selected);

    ordered
        .iter()
        .map(|d| DeviceLine {
            id: d.id.clone(),
            name: d.name.clone(),
            battery: reading(d),
        })
        .collect()
}

fn describe(app: &AppHandle, snapshot: &Snapshot) -> Option<TrayView> {
    let text = app.state::<AppState>().strings.lock().clone();
    let devices = device_lines(&snapshot.devices, snapshot.selected.as_deref(), &text);

    let playback = snapshot.audio.as_ref().and_then(|a| a.playback.as_ref());
    let capture = snapshot.audio.as_ref().and_then(|a| a.capture.as_ref());
    // Everything, on one line: hovering the icon should not tell you less than
    // opening the menu would.
    let tooltip = devices
        .iter()
        .map(|d| format!("{} — {}", d.name, d.battery))
        .collect::<Vec<_>>()
        .join(" · ");

    Some(TrayView {
        devices,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::device::types::BatteryState;
    use crate::device::DeviceSummary;
    use crate::device::types::ConnectionState;
    use crate::system::strings::NativeStrings;

    fn device(id: &str, name: &str, battery: Option<BatteryState>, on: bool) -> DeviceSummary {
        DeviceSummary {
            id: id.into(),
            name: name.into(),
            connection: ConnectionState::Connected,
            battery,
            powered_on: on,
            verified: true,
        }
    }

    fn charge(percent: u8, charging: bool) -> Option<BatteryState> {
        Some(BatteryState { percent, charging })
    }

    #[test]
    fn every_open_device_gets_a_line() {
        // The whole point of the change: a mouse beside a headset should not
        // have to be selected before its battery can be seen.
        let text = NativeStrings::default();
        let lines = device_lines(
            &[
                device("1038:220e", "Arctis 7+", charge(50, false), true),
                device("1038:1838", "Aerox 3 Wireless", charge(100, false), true),
            ],
            Some("1038:220e"),
            &text,
        );
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].name, "Arctis 7+");
        assert_eq!(lines[0].battery, "Battery: 50%");
        assert_eq!(lines[1].name, "Aerox 3 Wireless");
        assert_eq!(lines[1].battery, "Battery: 100%");
    }

    #[test]
    fn the_selected_device_comes_first_whatever_order_the_bus_gave() {
        // The mutes below act on the selected device, so it has to be the one
        // at the top — otherwise the menu reads as though they belong to the
        // device above them.
        let text = NativeStrings::default();
        let bus = [
            device("1038:1838", "Aerox 3 Wireless", charge(100, false), true),
            device("1038:220e", "Arctis 7+", charge(50, false), true),
        ];
        let lines = device_lines(&bus, Some("1038:220e"), &text);
        assert_eq!(lines[0].name, "Arctis 7+");
        assert_eq!(lines[1].name, "Aerox 3 Wireless");
    }

    #[test]
    fn the_rest_keep_the_order_they_were_found_in() {
        let text = NativeStrings::default();
        let bus = [
            device("a", "First", charge(10, false), true),
            device("b", "Second", charge(20, false), true),
            device("c", "Third", charge(30, false), true),
        ];
        let lines = device_lines(&bus, Some("c"), &text);
        let names: Vec<&str> = lines.iter().map(|l| l.name.as_str()).collect();
        assert_eq!(names, ["Third", "First", "Second"]);
    }

    #[test]
    fn nothing_attached_still_says_something() {
        // An empty menu would look broken; it has to say what it knows.
        let text = NativeStrings::default();
        let lines = device_lines(&[], None, &text);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].name, text.no_device);
    }

    #[test]
    fn a_device_that_is_off_reads_differently_from_one_that_is_silent() {
        let text = NativeStrings::default();
        let lines = device_lines(
            &[
                device("on", "Awake", None, true),
                device("off", "Asleep", None, false),
            ],
            Some("on"),
            &text,
        );
        assert_eq!(lines[0].battery, text.battery_not_reported);
        assert_eq!(lines[1].battery, text.battery_unknown);
    }

    #[test]
    fn charging_is_said_rather_than_left_to_the_number() {
        let text = NativeStrings::default();
        let lines = device_lines(&[device("d", "Charging one", charge(40, true), true)], None, &text);
        assert!(lines[0].battery.contains("charging"), "{}", lines[0].battery);
    }
}
