//! The background reader.
//!
//! The interface used to poll from JavaScript, which meant every open window
//! had its own idea of when to ask and the answer arrived one IPC round trip
//! late. Reading here instead gives one reader, one cadence, and a push to
//! whatever is listening.
//!
//! It also covers hot-plug: a device appearing is noticed on the next pass and
//! opened, and one disappearing surfaces as a failed read, which demotes the
//! connection rather than leaving stale numbers on screen. That is why there is
//! no separate udev watcher — a one-second scan of a bus that has four devices
//! on it costs less than the machinery to avoid it.
//!
//! What this file does *not* do is keep devices in order. Releasing a handle
//! that has stopped answering, and re-sending settings to one that has just
//! come on, both belong to the device layer; this one supplies the cadence and
//! publishes what came back.

use std::collections::HashMap;
use std::{thread, time::Duration};

use tauri::{AppHandle, Emitter, Manager};

use crate::commands::{build_snapshot, AppState};
use crate::system::tray;

/// How often the device is read. Fast enough that the ChatMix dial and the
/// volume wheel feel live, slow enough to be invisible in CPU terms.
const INTERVAL: Duration = Duration::from_millis(900);

/// Event name the interface subscribes to.
pub const SNAPSHOT_EVENT: &str = "device://snapshot";

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        // One reading per device, so a headset crossing the threshold does not
        // silence the warning a mouse is about to need.
        let mut last_percent: HashMap<String, u8> = HashMap::new();
        loop {
        {
            let state = app.state::<AppState>();

            // Pick up whatever is on the bus and not already open. A device
            // that was switched off and back on, or plugged in while the window
            // was sitting there, should not need the window to be poked.
            state.devices.lock().open_all();

            let snapshot = build_snapshot(&state);
            follow_the_dial(&state, &snapshot);

            tray::update(&app, &snapshot);
            notify_on_low_battery(&app, &state, &snapshot, &mut last_percent);
            if let Err(e) = app.emit(SNAPSHOT_EVENT, &snapshot) {
                log::warn!("could not publish device state: {e}");
            }
        }
            thread::sleep(INTERVAL);
        }
    });
}

/// Keep the virtual outputs in step with the wheel on the headset.
///
/// Also puts them back after a reconnect: the setting is what the user asked
/// for, and a headset that was switched off and on again should not silently
/// lose the split.
fn follow_the_dial(state: &AppState, snapshot: &crate::commands::Snapshot) {
    if !state.settings.lock().chatmix_routing {
        return;
    }
    let Some(device) = snapshot.device.as_ref() else {
        return;
    };
    let mut routing = state.chatmix.lock();
    if !routing.is_active() {
        if let Err(e) = routing.enable(device.vendor_id, device.product_id) {
            log::warn!("chatmix routing could not be restored: {e}");
            return;
        }
    }
    if let Some(mix) = snapshot.state.as_ref().and_then(|s| s.chatmix.as_ref()) {
        routing.apply(mix.game, mix.chat);
    }
}

/// Warn once as a battery crosses the threshold downwards.
///
/// Once, not every second: a warning tied to "battery is low" rather than
/// "battery just became low" would fire nine hundred times before the user
/// noticed the first one. Tracked per device, because two devices cross the
/// same threshold at different times and one must not stand in for the other.
fn notify_on_low_battery(
    app: &AppHandle,
    state: &AppState,
    snapshot: &crate::commands::Snapshot,
    last_percent: &mut HashMap<String, u8>,
) {
    // A device that has gone quiet or been unplugged loses its reading, so
    // coming back at a low level warns again rather than being taken for a
    // level it never left.
    last_percent.retain(|id, _| snapshot.devices.iter().any(|d| &d.id == id));

    for device in &snapshot.devices {
        notify_for_one(app, state, device, last_percent);
    }
}

fn notify_for_one(
    app: &AppHandle,
    state: &AppState,
    device: &crate::device::DeviceSummary,
    last_percent: &mut HashMap<String, u8>,
) {
    use tauri_plugin_notification::NotificationExt;

    let Some(battery) = device.battery.as_ref() else {
        last_percent.remove(&device.id);
        return;
    };
    let settings = state.settings.lock().clone();
    let previous = last_percent.insert(device.id.clone(), battery.percent);

    if !settings.low_battery_notification || battery.charging {
        return;
    }
    let threshold = settings.low_battery_percent;
    let crossed = previous.is_some_and(|p| p > threshold) && battery.percent <= threshold;
    if !crossed {
        return;
    }
    let text = state.strings.lock().clone();
    let name = device.name.as_str();
    if let Err(e) = app
        .notification()
        .builder()
        .title(crate::system::strings::fill(
            &text.low_battery_title,
            "device",
            name,
        ))
        .body(crate::system::strings::fill(
            &text.low_battery_body,
            "percent",
            &battery.percent.to_string(),
        ))
        .show()
    {
        log::warn!("could not show the low battery notification: {e}");
    }
}
