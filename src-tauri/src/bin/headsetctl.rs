//! The command line.
//!
//! Reads the same device layer the window does. Because only one process can
//! hold the control interface, this asks a running window over its socket when
//! there is one, and opens the device itself when there is not — the person
//! typing does not have to know which.

use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;

use headset_cc_lib::commands::{build_snapshot, AppState};
use headset_cc_lib::system::ipc::{self, Summary};

const USAGE: &str = "\
headsetctl — control a supported headset from the shell

  headsetctl                     what the headset is doing
  headsetctl --json              the same as one JSON object
  headsetctl --waybar            a Waybar custom module object
  headsetctl set <name> <value>  change one setting
  headsetctl watch               print a line whenever something changes

Settings: sidetone 0-3 · volume · mic · mute 0|1 · mic-mute 0|1
          auto-off <minutes> · eq-preset <index>

Values that the device would refuse are refused here too, with the reason.
";

/// Talk to a running window, if there is one.
struct Running(UnixStream);

impl Running {
    fn find() -> Option<Self> {
        UnixStream::connect(ipc::socket_path()).ok().map(Self)
    }

    fn ask(&mut self, request: &str) -> Result<String, String> {
        writeln!(self.0, "{request}").map_err(|e| e.to_string())?;
        let mut line = String::new();
        BufReader::new(&self.0)
            .read_line(&mut line)
            .map_err(|e| e.to_string())?;
        Ok(line)
    }
}

fn summary_directly() -> Summary {
    let state = AppState::new();
    // A device that will not open is not an error here: the snapshot says so.
    let _ = state.devices.lock().connect(None);
    Summary::from(&build_snapshot(&state))
}

fn read_summary() -> Result<Summary, String> {
    match Running::find() {
        Some(mut running) => {
            let body = running.ask(r#"{"op":"snapshot"}"#)?;
            serde_json::from_str(&body).map_err(|e| format!("unreadable answer: {e}"))
        }
        None => Ok(summary_directly()),
    }
}

fn set(key: &str, value: i64) -> Result<(), String> {
    match Running::find() {
        Some(mut running) => {
            let request = serde_json::json!({"op": "set", "key": key, "value": value});
            let body = running.ask(&request.to_string())?;
            let answer: serde_json::Value =
                serde_json::from_str(&body).map_err(|e| format!("unreadable answer: {e}"))?;
            match answer.get("error").and_then(|e| e.as_str()) {
                Some(error) => Err(error.to_string()),
                None => Ok(()),
            }
        }
        None => {
            let state = AppState::new();
            state
                .devices
                .lock()
                .connect(None)
                .map_err(|e| e.to_string())?;
            ipc::apply(&state, key, value)
        }
    }
}

fn describe(summary: &Summary) -> String {
    let Some(device) = summary.device.as_ref() else {
        return "No headset connected.\n".into();
    };
    let field = |name: &str, value: String| format!("  {name:<12}{value}\n");
    let level = |l: &ipc::Level| {
        format!(
            "{} / {}{}",
            l.value,
            l.max,
            if l.muted { " (muted)" } else { "" }
        )
    };

    let mut out = format!("{device}\n");
    out.push_str(&field(
        "Power",
        if summary.powered_on { "on" } else { "off" }.into(),
    ));
    out.push_str(&field(
        "Battery",
        match summary.battery_percent {
            // Not reported is not zero. The headset is off, or this model does
            // not say — either way, inventing a number would be worse.
            Some(percent) => format!(
                "{percent}%{}",
                if summary.charging { " (charging)" } else { "" }
            ),
            None => "not reported".into(),
        },
    ));
    if let (Some(game), Some(chat)) = (summary.game, summary.chat) {
        out.push_str(&field("ChatMix", format!("game {game} / chat {chat}")));
    }
    if let Some(volume) = summary.volume.as_ref() {
        out.push_str(&field("Volume", level(volume)));
    }
    if let Some(microphone) = summary.microphone.as_ref() {
        out.push_str(&field("Microphone", level(microphone)));
    }
    if summary.chatmix_routing {
        out.push_str(&field("Routing", "game and chat outputs in place".into()));
    }
    out
}

/// Waybar's custom module reads exactly these four fields.
fn waybar(summary: &Summary) -> String {
    let name = summary.device.as_deref().unwrap_or("No headset");
    let (text, percentage, class) = match summary.battery_percent {
        Some(percent) if summary.charging => (format!("{percent}%"), percent, "charging"),
        Some(percent) => (format!("{percent}%"), percent, "discharging"),
        None if summary.connected => ("off".to_string(), 0, "off"),
        None => (String::new(), 0, "absent"),
    };
    serde_json::json!({
        "text": text,
        "tooltip": if text.is_empty() { name.to_string() } else { format!("{name} — {text}") },
        "percentage": percentage,
        "class": class,
    })
    .to_string()
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let first = args.first().map(String::as_str).unwrap_or("status");

    let result = match first {
        "-h" | "--help" | "help" => {
            print!("{USAGE}");
            return;
        }
        "set" => {
            let (Some(key), Some(raw)) = (args.get(1), args.get(2)) else {
                eprintln!("set needs a name and a value, for example: headsetctl set sidetone 2");
                std::process::exit(2);
            };
            match raw.parse::<i64>() {
                Ok(value) => set(key, value).map(|()| String::new()),
                Err(_) => Err(format!("{raw} is not a number")),
            }
        }
        "watch" => {
            let mut previous = String::new();
            loop {
                match read_summary() {
                    Ok(snapshot) => {
                        let line = describe(&snapshot);
                        if line != previous {
                            print!("{line}");
                            let _ = std::io::stdout().flush();
                            previous = line;
                        }
                    }
                    Err(e) => {
                        eprintln!("{e}");
                        std::process::exit(1);
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(900));
            }
        }
        "--json" => read_summary().and_then(|s| {
            serde_json::to_string(&s).map_err(|e| format!("could not encode: {e}"))
        }),
        "--waybar" => read_summary().map(|s| waybar(&s)),
        "status" | "-" => read_summary().map(|s| describe(&s)),
        other => Err(format!("unknown argument: {other}\n\n{USAGE}")),
    };

    match result {
        Ok(text) if text.is_empty() => {}
        Ok(text) => print!("{text}"),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
