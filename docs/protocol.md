# Control protocol

The Arctis 7+ control channel is HID interface 3 (usage page `0xffc0`, usage
`0x1`). Every command is a **64-byte report, zero-padded**. Byte 0 is the HID
report id and is always `0x00`; byte 1 is the opcode.

## Sources

Two independent open-source implementations, which agree byte for byte. That
agreement is the reason these commands are trusted enough to send to hardware
at all — a single source would not have been.

* [`Sapd/HeadsetControl`](https://github.com/Sapd/HeadsetControl) —
  `lib/devices/steelseries_arctis_7_plus.hpp`, `protocols/steelseries_protocol.hpp`
* `linux-arctis-manager` 2.5.0b3 — `arctis_manager/devices/arctis_7_plus.yaml`

Nothing outside these two sources has been sent to the device. Where behaviour
was unknown, the feature was left unimplemented rather than probed by guessing
opcodes — an undocumented write to a headset's control interface is not a
reversible experiment.

## Commands

| Command | Bytes | Notes |
| ------- | ----- | ----- |
| Status query | `00 b0` | Reply begins `0xb0`; read into a 128-byte buffer |
| Sidetone | `00 39 <0–3>` | Off, low, medium, high |
| Auto shut-off | `00 a3 <0–90>` | Minutes; 0 disables |
| Equaliser | `00 33 <b0…b9> 00` | Ten bands, `byte = 0x18 + 2 × dB` |
| Equaliser preset | `00 33 <ten fixed bytes> 00` | Same opcode, firmware curves |

### Status reply

| Index | Meaning |
| ----- | ------- |
| `[0]` | `0xb0` — signature |
| `[1]` | Power: `0x01` = off, anything else = on |
| `[2]` | Battery `0…4` → 0 / 25 / 50 / 75 / 100 per cent |
| `[3]` | Charging, `0` or `1` |
| `[4]` | Game volume `0…0x64` |
| `[5]` | Chat volume `0…0x64` |

Battery is suppressed while the headset is powered off: the dongle keeps
answering with the last figure it saw, and reporting that as current would be
a lie with a long shelf life.

### Equaliser encoding

`byte = 0x18 + 2 × dB`, so 0 dB is `0x18`, +12 dB is `0x30` and −12 dB is
`0x00`. The step is therefore 0.5 dB. Values outside ±12 dB are rejected by
this application before anything is sent, rather than clamped: a request the
device cannot honour should fail loudly, not quietly become a different
request.

The ten band frequencies shown in the interface (31 Hz … 16 kHz) are **labels**
`[unverified]`. The protocol carries ten positional gains and never names them;
the labels follow standard ten-band spacing.

### Firmware presets

| Preset | Bytes |
| ------ | ----- |
| Flat | `18` × 10 |
| Bass Boost | `1f 20 1a 15 15 16 16 16 16 23` |
| Smiley | `1e 1b 15 10 10 13 1b 1e 20 1f` |
| Focus | `0e 16 11 13 20 24 1f 11 18 11` |

## Adding another device

Implement `DeviceProtocol` in `src-tauri/src/device/devices/`, and add one
entry to the registry in `discovery.rs`. Unsupported operations have default
implementations that return `DeviceError::Unsupported`, so a new device only
implements what it can actually do — and the interface hides or greys out the
rest without any change to interface code.

Verify against hardware with the probe before wiring anything to a control:

```bash
cargo run --example probe            # read status
cargo run --example probe -- watch   # follow it
cargo run --example probe -- sidetone 2
```
