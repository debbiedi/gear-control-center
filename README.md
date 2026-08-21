# Headset Control Center

A desktop application for controlling USB gaming headsets on Linux.
Tauri v2 and React in front, Rust and hidapi behind.

It is local software: no account, no telemetry, no network access. It talks to
the headset over USB and to nothing else.

![Dashboard](docs/screenshots/01-dashboard.png)

## Why this exists

Vendor software for these devices is Windows-only, and the Linux alternatives
are command-line tools. This is a full control panel — but one built on a rule
the vendor software does not follow:

> **A control exists only if it reaches the device.**

If the headset cannot do something, the application says so in the place you
would have looked for it. Nothing is simulated in software and presented as a
hardware feature, and no button reports success for a command that was never
sent.

Two consequences you can see immediately:

* **The battery gauge has four segments, not a percentage bar.** This headset
  reports five levels — 0, 25, 50, 75, 100. A smoothly moving percentage would
  be invented.
* **There is no "save to device" button**, because the hardware has no profile
  memory. Profiles are stored here and applied by sending each setting.

## Supported hardware

| Device | USB ids | Status |
| ------ | ------- | ------ |
| SteelSeries Arctis 7+ | `1038:220e` | Fully supported, verified against hardware |
| Arctis 7+ PS5 / Xbox / Destiny | `1038:2212`, `2216`, `2236` | Same protocol, untested `[unverified]` |
| Simulated device | — | Always available, for development |

Adding a device is one file under `src-tauri/src/device/devices/` and one
registry entry. No interface code changes — the interface is driven by what the
device reports it can do. See [docs/protocol.md](docs/protocol.md).

## What it does

* Battery level and charging state, at the device's own resolution
* ChatMix dial position, live
* Output volume and mute — the headset's own hardware controls, via ALSA
* Microphone level and mute
* Sidetone, four hardware steps
* Ten-band equaliser applied by the headset itself, plus its four firmware
  presets
* Auto shut-off timer
* Profiles, stored locally and applied setting by setting
* System tray with battery and both mutes; start with the system; low battery
  warning
* Diagnostics report for bug reports

### What it deliberately does not do

No RGB (the hardware has none), no firmware updating (no documented path), no
microphone noise reduction, gate or compressor (not in this hardware, and doing
it in software and calling it a device feature would be a lie), no onboard
profiles, no volume limiter. Each appears in the application marked
unsupported rather than being quietly absent.

## Install

Download the AppImage or the `.deb` from the releases page, or build it:

```bash
npm install
npm run tauri build          # AppImage + deb in src-tauri/target/release/bundle/
```

On a distribution with a recent toolchain, the AppImage step needs two
environment variables — `linuxdeploy` ships an old `strip` that cannot read
`.relr.dyn` sections, and its own AppImage needs FUSE unless told to extract
itself:

```bash
NO_STRIP=true APPIMAGE_EXTRACT_AND_RUN=1 npm run tauri build -- --bundles appimage
npm run tauri build -- --bundles deb        # the deb needs neither
```

No udev rule is needed on a current distribution — see
[docs/hardware.md](docs/hardware.md) if your headset is not detected.

## Running from source

```bash
npm install
npm run tauri dev
```

Without hardware attached:

```bash
npm run tauri dev -- -- --simulated
```

The same switch lives in **Settings → Use a simulated device**. Every reading
from it is labelled as simulated, everywhere it appears.

## Tests

```bash
npm run build                                     # typecheck and bundle
npm test                                          # interface arithmetic
cargo test --manifest-path src-tauri/Cargo.toml   # protocol, encoding, storage
```

The tests cover the places where a wrong number would either reach the hardware
or misrepresent what it reported: equaliser dB-to-byte encoding, battery level
mapping, mixer ranges, fader geometry, and profile round-trips.

The hardware itself is checked with a probe that runs the same device layer
without a window in the way:

```bash
cd src-tauri
cargo run --example probe            # read once
cargo run --example probe -- watch   # follow it
cargo run --example probe -- preset 1
```

## Architecture

The interface never touches USB:

```
React  →  Tauri command  →  DeviceManager  →  DeviceProtocol  →  Transport  →  hardware
                                          ↘  AudioBackend    →  ALSA
```

`Transport` exists so the HID backend can be swapped for libusb without any
layer above it changing. `DeviceProtocol` returns `Unsupported` for anything a
device cannot do, and the interface renders that as "not supported by this
device" rather than as an error.

A single background thread in Rust reads the device roughly once a second and
pushes a snapshot to the window. That one reader also covers hot-plug: a dongle
appearing is opened on the next pass, and one disappearing surfaces as a failed
read rather than as stale numbers left on screen.

## Documentation

* [Hardware notes](docs/hardware.md) — interfaces, permissions, what the device
  can and cannot do
* [Control protocol](docs/protocol.md) — the command table, its two independent
  sources, and how to add a device
* [Troubleshooting](docs/troubleshooting.md) — conflicts, permissions, bug
  reports

## Licence

Not yet chosen.
