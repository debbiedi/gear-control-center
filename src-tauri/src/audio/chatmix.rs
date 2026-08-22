//! Splitting game and chat audio, so the dial on the headset does something.
//!
//! The headset reports two levels — one per side of its wheel — and until now
//! the application only displayed them. On Windows the vendor software creates
//! two playback devices and attenuates them against each other; this does the
//! same thing with two null sinks looped back into the headset's real output.
//! Applications are assigned to "Game" or "Chat" by the user in their usual
//! volume mixer, and the wheel then does what it is for.
//!
//! ## Why `pactl` and not libpulse
//!
//! Loading modules through a persistent libpulse connection would have them
//! unloaded automatically when the process dies. That is a real advantage, and
//! it costs a callback-driven mainloop that is hard to test and easy to get
//! subtly wrong. The alternative is cheap and self-healing: our modules carry
//! a marker in their arguments, and every start clears any that a previous run
//! left behind. The worst case is stray sinks between a hard kill and the next
//! launch, and they are gone at logout regardless.
//!
//! Nothing here runs unless the user turns it on: it changes the audio
//! topology of the whole session, which is not something to do on a guess.

use std::process::Command;

use crate::device::error::{DeviceError, DeviceResult};

/// Marks the modules as ours, so a previous run's leftovers can be recognised.
const MARKER: &str = "headset_cc";
const GAME_SINK: &str = "headset_cc_game";
const CHAT_SINK: &str = "headset_cc_chat";

fn pactl(args: &[&str]) -> DeviceResult<String> {
    let output = Command::new("pactl").args(args).output().map_err(|e| {
        DeviceError::Transport(format!(
            "pactl could not be run ({e}). It comes with libpulse; without it \
             game and chat audio cannot be split."
        ))
    })?;
    if !output.status.success() {
        return Err(DeviceError::Transport(format!(
            "pactl {}: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Module indices in `pactl list short modules` output that are ours.
///
/// Split out so the parsing is testable without a sound server.
fn our_modules(listing: &str) -> Vec<u32> {
    listing
        .lines()
        .filter(|line| line.contains(MARKER))
        .filter_map(|line| line.split('\t').next()?.trim().parse().ok())
        .collect()
}

/// The PulseAudio sink belonging to one USB device.
///
/// Matched on the vendor and product ids the sound server publishes rather
/// than on the sink's name: names are built from the product string and two
/// headsets of the same model would collide.
fn device_sink(sinks_json: &str, vendor_id: u16, product_id: u16) -> Option<String> {
    let sinks: serde_json::Value = serde_json::from_str(sinks_json).ok()?;
    let wanted_vendor = format!("0x{vendor_id:04x}");
    let wanted_product = format!("0x{product_id:04x}");
    sinks.as_array()?.iter().find_map(|sink| {
        let properties = sink.get("properties")?;
        let vendor = properties.get("device.vendor.id")?.as_str()?;
        let product = properties.get("device.product.id")?.as_str()?;
        (vendor.eq_ignore_ascii_case(&wanted_vendor)
            && product.eq_ignore_ascii_case(&wanted_product))
        .then(|| sink.get("name")?.as_str().map(str::to_string))?
    })
}

/// The dial reports each side's level directly, so it maps straight onto the
/// two sinks' volumes — no curve, no interpretation.
fn volume_argument(level: u8) -> String {
    format!("{}%", level.min(100))
}

#[derive(Default)]
pub struct ChatMixRouting {
    modules: Vec<u32>,
    /// Last levels written, so a poll that changed nothing costs nothing.
    last: Option<(u8, u8)>,
}

impl ChatMixRouting {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_active(&self) -> bool {
        !self.modules.is_empty()
    }

    /// Remove anything a previous run left behind. Called at startup and
    /// before enabling, so a hard kill cannot accumulate sinks.
    pub fn reconcile(&mut self) {
        let Ok(listing) = pactl(&["list", "short", "modules"]) else {
            return;
        };
        for index in our_modules(&listing) {
            let _ = pactl(&["unload-module", &index.to_string()]);
        }
        self.modules.clear();
        self.last = None;
    }

    pub fn enable(&mut self, vendor_id: u16, product_id: u16) -> DeviceResult<()> {
        self.reconcile();

        let sinks = pactl(&["-f", "json", "list", "sinks"])?;
        let target = device_sink(&sinks, vendor_id, product_id).ok_or_else(|| {
            DeviceError::Transport(
                "the headset has no playback device in the sound server, so there is \
                 nothing to route game and chat audio into"
                    .into(),
            )
        })?;

        // Two sinks for applications to be assigned to, each looped into the
        // headset. If the second half fails the first is undone rather than
        // left behind as half a feature.
        let plan: [(&str, &str); 2] = [(GAME_SINK, "Headset — Game"), (CHAT_SINK, "Headset — Chat")];
        for (name, description) in plan {
            if let Err(e) = self.load_pair(name, description, &target) {
                self.disable();
                return Err(e);
            }
        }
        Ok(())
    }

    fn load_pair(&mut self, name: &str, description: &str, target: &str) -> DeviceResult<()> {
        let sink_index = self.load(
            "module-null-sink",
            &[
                format!("sink_name={name}"),
                format!("sink_properties=device.description=\"{description}\""),
            ],
        )?;
        let loop_index = self.load(
            "module-loopback",
            &[
                format!("source={name}.monitor"),
                format!("sink={target}"),
                "latency_msec=20".into(),
                // Keep the loop pointed at the headset even if the user's
                // default output changes underneath it.
                "sink_dont_move=true".into(),
                format!("source_dont_move=true"),
            ],
        )?;
        log::info!("chatmix: {name} -> {target} (modules {sink_index}, {loop_index})");
        Ok(())
    }

    fn load(&mut self, module: &str, args: &[String]) -> DeviceResult<u32> {
        let mut call = vec!["load-module".to_string(), module.to_string()];
        call.extend(args.iter().cloned());
        let borrowed: Vec<&str> = call.iter().map(String::as_str).collect();
        let index: u32 = pactl(&borrowed)?
            .trim()
            .parse()
            .map_err(|_| DeviceError::Protocol(format!("{module} returned no module index")))?;
        self.modules.push(index);
        Ok(index)
    }

    pub fn disable(&mut self) {
        // Newest first: the loopback goes before the sink it reads from.
        for index in self.modules.drain(..).rev() {
            if let Err(e) = pactl(&["unload-module", &index.to_string()]) {
                log::warn!("chatmix: could not unload module {index}: {e}");
            }
        }
        self.last = None;
    }

    /// Push the dial's position onto the two sinks. Best effort: a sound
    /// server that refuses is logged, not surfaced as a device error.
    pub fn apply(&mut self, game: u8, chat: u8) {
        if !self.is_active() || self.last == Some((game, chat)) {
            return;
        }
        self.last = Some((game, chat));
        for (sink, level) in [(GAME_SINK, game), (CHAT_SINK, chat)] {
            if let Err(e) = pactl(&["set-sink-volume", sink, &volume_argument(level)]) {
                log::warn!("chatmix: could not set {sink}: {e}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_our_own_modules_are_recognised() {
        let listing = "\
6\tmodule-device-restore\t
27\tmodule-null-sink\tsink_name=headset_cc_game sink_properties=device.description=\"Headset — Game\"
28\tmodule-loopback\tsource=headset_cc_game.monitor sink=alsa_output.usb
31\tmodule-null-sink\tsink_name=someone_elses_sink
";
        assert_eq!(our_modules(listing), vec![27, 28]);
    }

    #[test]
    fn a_listing_with_nothing_of_ours_leaves_everything_alone() {
        let listing = "6\tmodule-device-restore\t\n7\tmodule-null-sink\tsink_name=other\n";
        assert!(our_modules(listing).is_empty());
    }

    #[test]
    fn the_sink_is_found_by_the_ids_not_by_its_name() {
        let json = r#"[
          {"name":"alsa_output.pci-hdmi","properties":{"device.vendor.id":"0x1002"}},
          {"name":"alsa_output.usb-SteelSeries_Arctis_7_-00.pro-output-0",
           "properties":{"device.vendor.id":"0x1038","device.product.id":"0x220e"}}
        ]"#;
        assert_eq!(
            device_sink(json, 0x1038, 0x220e).as_deref(),
            Some("alsa_output.usb-SteelSeries_Arctis_7_-00.pro-output-0")
        );
    }

    #[test]
    fn a_device_with_no_playback_side_is_reported_as_absent() {
        let json = r#"[{"name":"x","properties":{"device.vendor.id":"0x1002"}}]"#;
        assert!(device_sink(json, 0x1038, 0x220e).is_none());
    }

    #[test]
    fn malformed_output_is_absence_rather_than_a_panic() {
        assert!(device_sink("not json", 0x1038, 0x220e).is_none());
        assert!(our_modules("").is_empty());
    }

    #[test]
    fn the_dial_maps_straight_onto_volume() {
        assert_eq!(volume_argument(0), "0%");
        assert_eq!(volume_argument(100), "100%");
        // The protocol caps at 100; anything beyond is a misread, not a boost.
        assert_eq!(volume_argument(230), "100%");
    }
}
