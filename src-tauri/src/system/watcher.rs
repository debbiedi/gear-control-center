//! The background reader.
//!
//! The interface used to poll from JavaScript, which meant every open window
//! had its own idea of when to ask and the answer arrived one IPC round trip
//! late. Reading here instead gives one reader, one cadence, and a push to
//! whatever is listening.
//!
//! It also covers hot-plug: a dongle appearing is noticed on the next pass and
//! opened, and a dongle disappearing surfaces as a failed read, which demotes
//! the connection rather than leaving stale numbers on screen. That is why
//! there is no separate udev watcher — a one-second scan of a bus that has
//! four devices on it costs less than the machinery to avoid it.

use std::{thread, time::Duration};

use tauri::{AppHandle, Emitter, Manager};

use crate::commands::{build_snapshot, AppState};
use crate::system::tray;

/// How often the device is read. Fast enough that the ChatMix dial and the
/// volume wheel feel live, slow enough to be invisible in CPU terms.
const INTERVAL: Duration = Duration::from_millis(900);

/// Consecutive failed reads before the handle is dropped.
///
/// One failure is a hiccup. Three in a row means the dongle is gone, and
/// holding a dead handle would leave the application stuck reporting
/// "Reconnecting" for ever — including after the dongle came back, because
/// rediscovery only runs when nothing is open.
const FAILURES_BEFORE_RELEASE: u8 = 3;

/// Event name the interface subscribes to.
pub const SNAPSHOT_EVENT: &str = "device://snapshot";

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last_percent: Option<u8> = None;
        let mut failures: u8 = 0;
        let mut was_on = false;
        loop {
        {
            let state = app.state::<AppState>();

            // Reconnect on its own. A headset that was switched off and back on
            // should not need the window to be poked.
            let needs_device = {
                let manager = state.devices.lock();
                manager.info().is_none()
            };
            if needs_device {
                let mut manager = state.devices.lock();
                let available = manager
                    .discover()
                    .into_iter()
                    .find(|d| d.unavailable.is_none())
                    .map(|d| d.info.id);
                if let Some(id) = available {
                    match manager.connect(Some(&id)) {
                        Ok(info) => log::info!("connected to {}", info.name),
                        Err(e) => log::debug!("could not open {id}: {e}"),
                    }
                }
            }

            let snapshot = build_snapshot(&state);
            follow_the_dial(&state, &snapshot);

            // The headset coming on — at start, after a power cycle, after the
            // dongle is plugged back in — is when it has to be told its
            // settings again. The three it does not report back would
            // otherwise read "unknown" here and sit at its own defaults there.
            let on_now = snapshot.state.as_ref().is_some_and(|s| s.powered_on);
            if on_now && !was_on {
                state.devices.lock().restore();
            }
            was_on = on_now;

            if snapshot.state_error.is_some() {
                failures = failures.saturating_add(1);
                if failures >= FAILURES_BEFORE_RELEASE {
                    log::warn!("releasing the device after {failures} failed reads");
                    state.devices.lock().disconnect();
                    failures = 0;
                    last_percent = None;
                }
            } else {
                failures = 0;
            }

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

/// Warn once as the battery crosses the threshold downwards.
///
/// Once, not every second: the headset reports five levels, so a warning tied
/// to "battery is low" rather than "battery just became low" would fire nine
/// hundred times before the user noticed the first one.
fn notify_on_low_battery(
    app: &AppHandle,
    state: &AppState,
    snapshot: &crate::commands::Snapshot,
    last_percent: &mut Option<u8>,
) {
    use tauri_plugin_notification::NotificationExt;

    let Some(battery) = snapshot.state.as_ref().and_then(|s| s.battery.as_ref()) else {
        *last_percent = None;
        return;
    };
    let settings = state.settings.lock().clone();
    let previous = last_percent.replace(battery.percent);

    if !settings.low_battery_notification || battery.charging {
        return;
    }
    let threshold = settings.low_battery_percent;
    let crossed = previous.is_some_and(|p| p > threshold) && battery.percent <= threshold;
    if !crossed {
        return;
    }
    let text = state.strings.lock().clone();
    let name = snapshot
        .device
        .as_ref()
        .map(|d| d.name.as_str())
        .unwrap_or("Headset");
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
