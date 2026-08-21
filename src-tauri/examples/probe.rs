//! A command-line probe for the device layer.
//!
//! Runs the same discovery, protocol and transport code the application uses,
//! without a window in the way. This is how hardware behaviour gets checked
//! before a control is wired to it — a claim about the headset should be
//! reproducible from a terminal, not only visible in a screenshot.
//!
//!     cargo run --example probe                  # read once
//!     cargo run --example probe -- watch         # read every second
//!     cargo run --example probe -- sidetone 2
//!     cargo run --example probe -- inactive 60
//!     cargo run --example probe -- preset 1
//!     cargo run --example probe -- eq 6 4 2 0 0 0 0 0 0 0

use headset_cc_lib::audio::AudioController;
use headset_cc_lib::device::DeviceManager;
use std::{thread, time::Duration};

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut manager = DeviceManager::new();

    let found = manager.discover();
    println!("discovered {} device(s)", found.len());
    for d in &found {
        println!(
            "  {} [{:04x}:{:04x}] {}",
            d.info.name,
            d.info.vendor_id,
            d.info.product_id,
            d.unavailable.as_deref().unwrap_or("available")
        );
    }
    if found.is_empty() {
        return;
    }

    match manager.connect(None) {
        Ok(info) => println!("connected: {} ({})\n", info.name, info.connection),
        Err(e) => {
            println!("connect failed: {e}");
            return;
        }
    }

    let command = args.first().map(String::as_str).unwrap_or("read");
    let rest = &args[args.len().min(1)..];

    let outcome = match command {
        "sidetone" => {
            let level: u8 = rest[0].parse().expect("level");
            manager.with_device(|d| d.set_sidetone(level)).map(|_| format!("sidetone -> {level}"))
        }
        "inactive" => {
            let minutes: u8 = rest[0].parse().expect("minutes");
            manager
                .with_device(|d| d.set_inactive_time(minutes))
                .map(|_| format!("auto shut-off -> {minutes} min"))
        }
        "preset" => {
            let index: u8 = rest[0].parse().expect("index");
            manager
                .with_device(|d| d.set_equalizer_preset(index))
                .map(|_| format!("equaliser preset -> {index}"))
        }
        "eq" => {
            let bands: Vec<f32> = rest.iter().map(|v| v.parse().expect("dB")).collect();
            manager
                .with_device(|d| d.set_equalizer(&bands))
                .map(|_| format!("equaliser -> {bands:?}"))
        }
        "audio" | "vol" | "mic" | "mute" | "micmute" => {
            let info = manager.info().expect("connected");
            let mut audio = AudioController::new(info.vendor_id, info.product_id);
            match command {
                "vol" => audio
                    .set_playback_volume(rest[0].parse().expect("value"))
                    .map(|_| format!("volume -> {}", rest[0])),
                "mic" => audio
                    .set_capture_volume(rest[0].parse().expect("value"))
                    .map(|_| format!("mic level -> {}", rest[0])),
                "mute" => audio
                    .set_playback_muted(rest[0] == "on")
                    .map(|_| format!("mute -> {}", rest[0])),
                "micmute" => audio
                    .set_capture_muted(rest[0] == "on")
                    .map(|_| format!("mic mute -> {}", rest[0])),
                _ => Ok(String::new()),
            }
            .map(|msg| {
                match audio.state() {
                    Ok(s) => println!("audio: {}", serde_json::to_string(&s).unwrap()),
                    Err(e) => println!("audio read failed: {e}"),
                }
                msg
            })
        }
        "watch" | "read" => Ok(String::new()),
        other => {
            println!("unknown command: {other}");
            return;
        }
    };

    match outcome {
        Ok(msg) if !msg.is_empty() => println!("OK  {msg}"),
        Err(e) => println!("ERR {e}"),
        _ => {}
    }

    let rounds = if command == "watch" { 60 } else { 1 };
    for i in 0..rounds {
        match manager.state() {
            Ok(s) => println!(
                "[{i:02}] power={} battery={:?} chatmix={:?}",
                s.powered_on, s.battery, s.chatmix
            ),
            Err(e) => println!("[{i:02}] read failed: {e}"),
        }
        if command == "watch" {
            thread::sleep(Duration::from_secs(1));
        }
    }
}
