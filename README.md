# Headset Control Center

[![Licence: MIT](https://img.shields.io/badge/licence-MIT-d9a441.svg)](LICENSE)
[![Platform: Linux](https://img.shields.io/badge/platform-Linux-2a3238.svg)](#requirements)

A desktop control panel for USB gaming headsets on Linux. Tauri v2 and React in
front, Rust and hidapi behind.

It is local software: no account, no telemetry, no network access. It talks to
the headset over USB and to nothing else.

![Dashboard](docs/screenshots/01-dashboard.png)

## Why this exists

The vendor software for these headsets is Windows-only, and the Linux
alternatives are command-line tools. This is a full control panel — built on
one rule the vendor software does not follow:

> **A control exists only if it reaches the device.**

If the headset cannot do something, the application says so in the place you
would have looked for it. Nothing is done in software and presented as a
hardware feature, and no button reports success for a command that was never
sent.

Two consequences you can see in the first screenshot:

* **The battery gauge has four segments, not a percentage bar.** This headset
  reports five levels — 0, 25, 50, 75, 100. A smoothly moving percentage would
  be an invention, and a number that sat at exactly 75% for an hour would
  rightly cost you your trust in every other reading on the page.
* **There is no "save to device" button**, because the hardware has no profile
  memory. Profiles are stored by the application and applied by sending each
  setting, and the Profiles page says exactly that.

## Supported hardware

| Device | USB ids | Status |
| ------ | ------- | ------ |
| SteelSeries Arctis 7+ | `1038:220e` | Fully supported, verified against hardware |
| Arctis 7+ PS5 / Xbox / Destiny | `1038:2212`, `2216`, `2236` | Same protocol, untested |
| Simulated device | — | Always available, for development |

Other headsets are not supported yet, and will not be added on guesswork — see
[Adding a device](#adding-a-device).

## Install

### AppImage

Download it from [Releases](../../releases), make it executable, run it.
Nothing is installed.

```bash
chmod +x headset-control-center-0.1.1-x86_64.AppImage
./headset-control-center-0.1.1-x86_64.AppImage
```

**Read this before downloading.** The published AppImage was built on Arch
Linux against **glibc 2.44**, so it starts only on an equally recent
distribution — current Arch, Fedora Rawhide and similar. On Ubuntu or Debian it
will refuse to run with a `GLIBC_2.4x not found` error. That is not a bug you
need to report; it is what happens when a binary meets an older C library than
it was linked against.

Packages built on Ubuntu 22.04, which run everywhere from glibc 2.35 upwards,
are what [the CI workflow](.github/workflows/ci.yml) produces on a tag. Until
those appear here, Debian and Ubuntu users should build from source — it takes
about five minutes and the instructions are below.

### Debian, Ubuntu, and anything older

Build from source. See below.

### Arch Linux and derivatives

A `PKGBUILD` lives in [`packaging/aur`](packaging/aur). It builds from the
tagged release and installs the binary, a desktop entry and the icons:

```bash
git clone https://github.com/debbiedi/headset-control-center.git
cd headset-control-center/packaging/aur
makepkg -si
```

`makepkg -s` pulls the build dependencies (`rust`, `nodejs`, `npm`) and `-i`
installs the finished package, so this is the whole procedure. Removing it
later is `sudo pacman -R headset-control-center`.

Every runtime dependency is in the official repositories — this is the
distribution the application was developed and tested on.

An AUR package will follow; the publishing steps are in
[`packaging/aur/README.md`](packaging/aur/README.md).

### Requirements

* Linux with glibc 2.35 or newer (Ubuntu 22.04 and later, or any current
  rolling distribution)
* `webkit2gtk` 4.1, GTK 3, and an ALSA-capable sound stack — PipeWire and
  PulseAudio both work, since the application drives the device's own hardware
  mixer rather than a software one
* **No udev rule on a current distribution.** Most ship one that already grants
  the logged-in user access to headset HID devices. If yours does not, see
  [docs/hardware.md](docs/hardware.md).
* **No root, ever.** If something asks you for a password to run this, it is
  not this.

## What it does

* Battery level and charging state, at the device's own resolution
* ChatMix dial position, live
* Output volume and mute — the headset's own hardware controls, so the change
  applies to every application and survives this one being closed
* Microphone level and mute
* Sidetone, four hardware steps
* Ten-band equaliser applied inside the headset, plus its four firmware presets
* Auto shut-off timer
* Profiles, stored locally and applied setting by setting
* System tray with battery and both mutes, start with the system, low battery
  warning
* A diagnostics report for bug reports

<p align="center">
  <img src="docs/screenshots/02-equaliser.png" width="49%" alt="Equaliser">
  <img src="docs/screenshots/03-device.png" width="49%" alt="Device">
</p>

### What it deliberately does not do

No RGB (the hardware has none). No firmware updating (there is no documented
update path, and a firmware writer built on guesswork is how headsets die). No
microphone noise reduction, gate or compressor — doing that in software and
calling it a device feature would be a lie. No onboard profiles, no volume
limiter.

Each of these appears in the application marked as unsupported, rather than
being quietly missing.

## Build from source

```bash
git clone https://github.com/debbiedi/headset-control-center.git
cd headset-control-center
npm install
npm run tauri dev
```

Packaging:

```bash
npm run tauri build -- --bundles deb

# The AppImage step needs two variables on a modern toolchain: linuxdeploy
# ships an old strip that cannot read .relr.dyn sections, and its own AppImage
# wants FUSE unless told to extract itself.
NO_STRIP=true APPIMAGE_EXTRACT_AND_RUN=1 npm run tauri build -- --bundles appimage
```

A package is linked against the glibc of whatever built it, so one built on a
rolling distribution will not start on Ubuntu. The releases here are built on
Ubuntu 22.04 by CI for that reason.

### Without hardware

```bash
npm run tauri dev -- -- --simulated
```

The same switch lives in **Settings → Use a simulated device**. The stand-in
reports the same capabilities and the same resolution as the real thing, so an
interface built against it cannot assume precision the hardware will not
deliver — and every reading from it is labelled as simulated wherever it
appears.

## Tests

```bash
npm test                                          # interface arithmetic
npm run build                                     # typecheck and bundle
cargo test --manifest-path src-tauri/Cargo.toml   # protocol, encoding, storage
```

The tests cover the places where a wrong number would either reach the hardware
or misrepresent what it reported: equaliser dB-to-byte encoding, battery level
mapping, mixer ranges, fader geometry, profile round-trips and migration.

Hardware itself is checked with a probe that runs the same device layer without
a window in the way:

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

One background thread in Rust reads the device roughly once a second and pushes
a snapshot to the window. That single reader also covers hot-plug: a dongle
appearing is opened on the next pass, and one disappearing is released after
three failed reads rather than leaving stale numbers on screen.

### Adding a device

One file under `src-tauri/src/device/devices/` and one registry entry in
`discovery.rs`. No interface code changes — the interface is driven by what the
device reports it can do.

The bar for adding one is a **documented** protocol: an existing open-source
implementation, a packet capture, or a vendor document. Nothing here was
discovered by sending opcodes at hardware to see what happened, because an
undocumented write to a headset's control interface is not a reversible
experiment. See [docs/protocol.md](docs/protocol.md).

## Documentation

* [Hardware notes](docs/hardware.md) — interfaces, permissions, and exactly
  what the device can and cannot do
* [Control protocol](docs/protocol.md) — the command table, its two independent
  sources, and how to add a device
* [Troubleshooting](docs/troubleshooting.md) — conflicts, permissions, bug
  reports

## Credits

The Arctis 7+ command set was learned from two independent open-source
projects, which agree byte for byte. That agreement is the reason it was
trusted enough to send to hardware at all:

* [Sapd/HeadsetControl](https://github.com/Sapd/HeadsetControl)
* [elegos/Linux-Arctis-Manager](https://github.com/elegos/Linux-Arctis-Manager)

No code was taken from either — only the protocol facts, which are documented
in [docs/protocol.md](docs/protocol.md) with their sources.

## Licence

[MIT](LICENSE).
