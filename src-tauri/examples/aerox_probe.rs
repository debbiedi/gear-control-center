//! Read a connected Aerox 3 Wireless through this crate's own device layer.
//!
//! What it is for: the registry marks a device verified only when someone has
//! run this build against the hardware. This is that run, and it reads only —
//! it will not change a setting on somebody's mouse to prove a point.
//!
//! Its answer is worth something because a wrongly framed command gets no
//! answer at all: the report id, the wireless flag and the opcode all have to
//! be right before a single byte comes back.
//!
//!     cargo run --example aerox_probe

use headset_cc_lib::device::devices::aerox3_wireless;
use headset_cc_lib::device::DeviceManager;

fn main() {
    let mut manager = DeviceManager::new();
    if let Some(error) = manager.api_error() {
        eprintln!("the HID subsystem did not start: {error}");
        std::process::exit(1);
    }

    let found = manager.discover();
    println!("devices on the bus this build knows:");
    for device in &found {
        println!(
            "  {} [{:04x}:{:04x}] {}",
            device.info.name,
            device.info.vendor_id,
            device.info.product_id,
            device.unavailable.as_deref().unwrap_or("available"),
        );
    }

    let mouse = found.iter().find(|d| {
        d.info.vendor_id == aerox3_wireless::VENDOR_ID
            && (aerox3_wireless::PRODUCT_IDS_WIRELESS.contains(&d.info.product_id)
                || aerox3_wireless::PRODUCT_IDS_WIRED.contains(&d.info.product_id))
    });
    let Some(mouse) = mouse else {
        eprintln!("\nno Aerox 3 Wireless found");
        std::process::exit(1);
    };
    if let Some(reason) = &mouse.unavailable {
        eprintln!("\nthe mouse is here but cannot be opened: {reason}");
        std::process::exit(1);
    }

    let info = match manager.connect(Some(&mouse.info.id)) {
        Ok(info) => info,
        Err(e) => {
            eprintln!("\ncould not open the mouse: {e}");
            std::process::exit(1);
        }
    };
    println!("\nopened {} ({})", info.name, info.id);

    let caps = manager.capabilities().expect("an open device has capabilities");
    if let Some(dpi) = &caps.dpi {
        println!(
            "  sensor      {} steps, {}-{} CPI, {} presets",
            dpi.values.len(),
            dpi.values[0],
            dpi.values[dpi.values.len() - 1],
            dpi.max_presets,
        );
    }
    if let Some(rate) = &caps.polling_rate {
        println!("  report rate {:?} Hz", rate.rates);
    }
    if let Some(light) = &caps.lighting {
        println!("  lighting    {:?}", light.zones);
    }

    match manager.state() {
        Ok(state) => {
            println!("\nreading:");
            println!("  powered on  {}", state.powered_on);
            match state.battery {
                Some(b) => println!("  battery     {}% {}", b.percent, if b.charging { "(charging)" } else { "" }),
                // Silence is the mouse asleep, not a failure — move it.
                None => println!("  battery     no reading (asleep?)"),
            }
            // And now the part the rewrite exists for: both devices held at
            // once. Nothing is read from them here — `read_all` is what
            // re-sends remembered settings, and this probe does not write.
            let opened = manager.open_all();
            println!("\nheld open together: {}", manager.open_count());
            for info in &opened {
                println!("  also opened {}", info.name);
            }

            println!("\nnothing was written to the device.");
        }
        Err(e) => {
            eprintln!("\nthe mouse did not answer: {e}");
            std::process::exit(1);
        }
    }
}
