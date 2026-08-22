pub mod audio;
pub mod commands;
pub mod device;
pub mod eq;
pub mod profiles;
pub mod settings;
pub mod storage;
pub mod system;

use tauri::{Manager, WindowEvent};

use commands::AppState;

/// `--simulated` starts against the stand-in device; `--minimised` starts with
/// the window hidden, which is what the autostart entry passes.
fn has_flag(flag: &str) -> bool {
    std::env::args().any(|a| a == flag)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch hands its arguments to the
        // running instance instead of opening a second window onto the same
        // headset, which only one process can hold anyway.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            system::tray::show_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimised"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(AppState::with_simulation(has_flag("--simulated")))
        .setup(|app| {
            // Clear anything a previous run left in the sound server before
            // anything else touches it.
            app.state::<AppState>().chatmix.lock().reconcile();
            system::tray::create(app.handle())?;
            system::watcher::spawn(app.handle().clone());
            system::ipc::spawn(app.handle().clone());

            if has_flag("--minimised") {
                if let Some(window) = app.webview_windows().values().next() {
                    // Minimised, not hidden, for the same reason closing is:
                    // a surface that is destroyed and rebuilt comes back with
                    // a decoration that no longer takes clicks. The surface
                    // this window is given at startup is the one it keeps.
                    let _ = window.minimize();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let close_to_tray = window
                    .try_state::<AppState>()
                    .map(|s| s.settings.lock().close_to_tray)
                    .unwrap_or(false);
                if close_to_tray {
                    // Keep reading the headset in the background — the tray
                    // entry is the point of the setting.
                    //
                    // Minimised rather than hidden: on Wayland `hide()`
                    // destroys the toplevel surface, and the one built to
                    // replace it comes back with a decoration the compositor
                    // draws but no longer routes clicks to. The window looked
                    // fine and its own close and minimise buttons did nothing.
                    // Minimising keeps the surface, so the decoration keeps
                    // working.
                    api.prevent_close();
                    // Out of the task bar as well: the tray entry is where it
                    // lives while it is closed, and two places to click on the
                    // same hidden window is one too many.
                    let _ = window.set_skip_taskbar(true);
                    let _ = window.minimize();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_snapshot,
            commands::discover_devices,
            commands::connect_device,
            commands::disconnect_device,
            commands::set_mock_mode,
            commands::set_sidetone,
            commands::set_inactive_time,
            commands::set_equalizer,
            commands::set_equalizer_preset,
            commands::set_volume,
            commands::set_muted,
            commands::set_microphone_volume,
            commands::set_microphone_muted,
            commands::list_profiles,
            commands::save_profile,
            commands::rename_profile,
            commands::delete_profile,
            commands::capture_profile,
            commands::apply_profile,
            commands::get_settings,
            commands::set_settings,
            commands::export_diagnostics,
            commands::app_version,
            commands::set_native_strings,
            commands::set_chatmix_routing,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the application")
        .run(|handle, event| {
            // Quitting must take the virtual outputs with it. A hard kill
            // cannot be caught here, which is why every start reconciles.
            if matches!(event, tauri::RunEvent::Exit) {
                handle.state::<AppState>().chatmix.lock().disable();
                system::ipc::cleanup();
            }
        });
}
