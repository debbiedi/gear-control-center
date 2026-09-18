//! A command-line probe for the device layer.
//!
//! Runs the same discovery, protocol and transport code the application uses,
//! without a window in the way. This is how hardware behaviour gets checked
//! before a control is wired to it — a claim about the headset should be
//! reproducible from a terminal, not only visible in a screenshot.
//!
//! Every device on the bus is opened, and a command acts on the one named by
//! `--device`, or on the first one otherwise. That mirrors the application:
//! a headset and a mouse are both held, and a command has to be aimed.
//!
//!     cargo run --example probe                  # read every device once
//!     cargo run --example probe -- watch         # read every second
//!     cargo run --example probe -- sidetone 2
//!     cargo run --example probe -- inactive 60
//!     cargo run --example probe -- preset 1
//!     cargo run --example probe -- eq 6 4 2 0 0 0 0 0 0 0
//!
//! Pointing devices, which need `--device` when a headset is also plugged in:
//!
//!     cargo run --example probe -- --device 1038:1838 dpi 400 800 1600
//!     cargo run --example probe -- --device 1038:1838 polling 1000
//!     cargo run --example probe -- --device 1038:1838 color 0 ff0000
//!     cargo run --example probe -- --device 1038:1838 effect 1
//!     cargo run --example probe -- --device 1038:1838 reactive off
//!     cargo run --example probe -- --device 1038:1838 dim 30
//!     cargo run --example probe -- --device 1038:1838 save

use gear_cc_lib::audio::chatmix::ChatMixRouting;
use gear_cc_lib::audio::AudioController;
use gear_cc_lib::device::DeviceManager;
use std::{thread, time::Duration};

/// A colour as `rrggbb`, or `off`.
fn colour(text: &str) -> Option<[u8; 3]> {
    if text.eq_ignore_ascii_case("off") {
        return None;
    }
    let hex = text.trim_start_matches('#');
    let byte = |i: usize| u8::from_str_radix(&hex[i..i + 2], 16).expect("two hex digits");
    Some([byte(0), byte(2), byte(4)])
}

fn main() {
    let mut args: Vec<String> = std::env::args().skip(1).collect();

    // `--device <id>` picks which of the open devices a command is aimed at.
    let wanted = args.iter().position(|a| a == "--device").map(|at| {
        let id = args.get(at + 1).expect("--device needs an id").clone();
        args.drain(at..=at + 1);
        id
    });

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

    // Everything at once, as the application does — then aim.
    let opened = manager.open_all();
    println!("\nopened {} device(s):", opened.len());
    for info in &opened {
        println!("  {} ({})", info.name, info.id);
    }
    if let Some(id) = &wanted {
        match manager.select(id) {
            Ok(info) => println!("\naimed at {} ({})", info.name, info.id),
            Err(e) => {
                println!("\ncannot aim at {id}: {e}");
                return;
            }
        }
    }
    match manager.info() {
        Some(info) => println!("selected: {} ({})\n", info.name, info.connection),
        None => {
            println!("nothing could be opened");
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
        "chatmix" => {
            let info = manager.info().expect("connected");
            let mut routing = ChatMixRouting::new();
            match rest.first().map(String::as_str) {
                Some("on") => {
                    let outcome = routing
                        .enable(info.vendor_id, info.product_id)
                        .map(|_| "chatmix routing enabled".to_string());
                    std::mem::forget(routing);
                    outcome
                }
                Some("off") => {
                    routing.reconcile();
                    Ok("chatmix routing removed".to_string())
                }
                Some("mix") => {
                    let game: u8 = rest[1].parse().expect("game");
                    let chat: u8 = rest[2].parse().expect("chat");
                    routing.enable(info.vendor_id, info.product_id).map(|()| {
                        routing.apply(game, chat);
                        // Left in place so the volumes can be inspected.
                        std::mem::forget(routing);
                        format!("mix -> game {game}, chat {chat}")
                    })
                }
                other => Ok(format!("unknown chatmix argument: {other:?}")),
            }
        }
        "dpi" => {
            let dpis: Vec<u32> = rest.iter().map(|v| v.parse().expect("CPI")).collect();
            manager
                .with_device(|d| d.set_dpi_presets(&dpis, 0))
                .map(|_| format!("resolutions -> {dpis:?}"))
        }
        "polling" => {
            let hz: u16 = rest[0].parse().expect("Hz");
            manager
                .with_device(|d| d.set_polling_rate(hz))
                .map(|_| format!("report rate -> {hz} Hz"))
        }
        "color" | "colour" => {
            let zone: u8 = rest[0].parse().expect("zone");
            let rgb = colour(&rest[1]).expect("a colour, not off");
            manager
                .with_device(|d| d.set_lighting_color(zone, rgb))
                .map(|_| format!("zone {zone} -> {rgb:?}"))
        }
        "effect" => {
            let index: u8 = rest[0].parse().expect("index");
            manager
                .with_device(|d| d.set_lighting_effect(index))
                .map(|_| format!("lighting effect -> {index}"))
        }
        "reactive" => {
            let rgb = colour(&rest[0]);
            manager
                .with_device(|d| d.set_reactive_color(rgb))
                .map(|_| format!("reactive colour -> {rgb:?}"))
        }
        "dim" => {
            let seconds: u16 = rest[0].parse().expect("seconds");
            manager
                .with_device(|d| d.set_dim_timer(seconds))
                .map(|_| format!("dim timer -> {seconds} s"))
        }
        "save" => manager
            .with_device(|d| d.save_to_device())
            .map(|_| "settings committed to the device".to_string()),
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
        // Every open device, because this is also how "two at once" is checked.
        for reading in manager.read_all() {
            match (&reading.state, &reading.state_error) {
                (Some(s), _) => println!(
                    "[{i:02}] {:<30} power={} battery={:?} chatmix={:?} dpi={:?} polling={:?}",
                    reading.info.name,
                    s.powered_on,
                    s.battery,
                    s.chatmix,
                    s.dpi_presets,
                    s.polling_rate,
                ),
                (None, Some(e)) => {
                    println!("[{i:02}] {:<30} read failed: {e}", reading.info.name)
                }
                (None, None) => {}
            }
        }
        if command == "watch" {
            thread::sleep(Duration::from_secs(1));
        }
    }
}
