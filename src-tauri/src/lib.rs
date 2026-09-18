pub mod audio;
pub mod commands;
pub mod device;
pub mod eq;
pub mod profiles;
pub mod settings;
pub mod storage;
pub mod system;

use tauri::Manager;

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
                // Closed rather than hidden: the tray builds a window when one
                // is asked for, and a built window is one whose title bar
                // works.
                if let Some(window) = app.webview_windows().values().next() {
                    let _ = window.close();
                }
            }
            Ok(())
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
            commands::set_dpi_presets,
            commands::set_polling_rate,
            commands::set_lighting_color,
            commands::set_lighting_effect,
            commands::set_reactive_color,
            commands::set_dim_timer,
            commands::save_to_device,
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
        .run(|handle, event| match event {
            // Closing the window does not end the application: the headset
            // goes on being read and the tray entry stays, which is the whole
            // point of the setting. Quitting is done from the tray.
            tauri::RunEvent::ExitRequested { api, .. } => {
                let close_to_tray = handle
                    .try_state::<AppState>()
                    .map(|s| s.settings.lock().close_to_tray)
                    .unwrap_or(false);
                if close_to_tray {
                    api.prevent_exit();
                }
            }
            // Quitting must take the virtual outputs with it. A hard kill
            // cannot be caught here, which is why every start reconciles.
            tauri::RunEvent::Exit => {
                handle.state::<AppState>().chatmix.lock().disable();
                system::ipc::cleanup();
            }
            _ => {}
        });
}
