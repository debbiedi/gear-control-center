# Control protocol

Two families are implemented, and they are not the same protocol. The Arctis 7+
is documented first and the Aerox 3 Wireless in [its own section](#steelseries-aerox-3-wireless)
at the end.

## SteelSeries Arctis 7+

The Arctis 7+ control channel is HID interface 3 (usage page `0xffc0`, usage
`0x1`). Every command is a **64-byte report, zero-padded**. Byte 0 is the HID
report id and is always `0x00`; byte 1 is the opcode.

## Sources

Two independent open-source implementations, which agree byte for byte. That
agreement is the reason these commands are trusted enough to send to hardware
at all — a single source would not have been.

* [`Sapd/HeadsetControl`](https://github.com/Sapd/HeadsetControl) —
  `lib/devices/steelseries_arctis_7_plus.hpp`, `protocols/steelseries_protocol.hpp`
* [`elegos/Linux-Arctis-Manager`](https://github.com/elegos/Linux-Arctis-Manager) 2.5.0b3 —
  `arctis_manager/devices/arctis_7_plus.yaml`

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

## Adding another device — and the verification tier

Every device carries a `Verification`: `Verified` means someone ran this code
against the hardware, `Documented` means it was written from a specification
and nobody has. The manager refuses every write to a `Documented` device, so
such a device reads and says plainly that it is only reading.

That is what makes it safe to support hardware none of us owns. The read path
is checked against the specification with a fake transport; the write path
waits for one person with the headset to confirm the readings, at which point
the entry is promoted and its setters are implemented.

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

## SteelSeries Aerox 3 Wireless

The mouse uses the same interface number and the same usage page as the headset
— HID interface 3, usage page `0xffc0`, usage `0x1` — and nothing else about it
is the same. Only the product id tells the two apart.

Reports here are **not padded**: a command is exactly as long as it is. Byte 0
is the HID report id and is always `0x00`; byte 1 is the opcode.

### Two products, one mouse

| Mode | Product id | Opcodes | Writes answered |
| ---- | ---------- | ------- | --------------- |
| 2.4 GHz receiver | `1038:1838` | `opcode \| 0x40` | Yes, 64 bytes |
| On the cable | `1038:183a` | plain | No |

The mouse changes product id when it is plugged in to charge, so both are
listed as supported — otherwise it would vanish from the application at the
moment somebody put it on charge. The wireless half is verified; the wired half
is implemented from the same source and has not been run against hardware, so
it reads and does not write.

The flag is applied to every opcode below. `0x2b` becomes `0x6b` over the
radio.

### Source

[`flozz/rivalcfg`](https://github.com/flozz/rivalcfg) 4.17,
`rivalcfg/devices/aerox3_wireless_wired.py` and `aerox3_wireless_wireless.py`.

One source rather than the two the Arctis entry required, so the battery
command was checked against a physical mouse before the device was marked
verified: `cargo run --example probe` reported the same level as
`rivalcfg --battery-level` on the same hardware at the same moment. A wrongly
framed command gets no answer at all, so that agreement covers the report id,
the wireless flag and the opcode together.

Nothing outside that source has been sent to the device.

### Commands

Shown in wired form. Add `0x40` to the opcode over the radio.

| Command | Bytes | Notes |
| ------- | ----- | ----- |
| Battery | `00 92` | Reply byte `[1]`: bit 7 charging, rest is the level |
| Resolutions | `00 2d <count> <selected> <b…>` | One byte per preset, up to five |
| Report rate | `00 2b <v>` | `00` = 1000 Hz, `01` = 500, `02` = 250, `03` = 125 |
| Zone colour | `00 21 01 <zone> <r> <g> <b>` | Zones 0–2, top to bottom |
| Rainbow | `00 22 ff` | Stopped by setting any colour |
| Startup lighting | `00 27 <rainbow> <reactive>` | What the mouse does when it wakes |
| Reactive colour | `00 26 01 00 <r> <g> <b>` | `00 00 00 00 00` turns it off |
| Dim timer | `00 23 0f 01 00 00 <ms…>` | Three bytes, little endian, seconds × 1000 |
| Sleep timer | `00 29 <ms…>` | Three bytes, little endian, minutes × 60000 |
| Save | `00 11 00` | Commits the current settings to the mouse's flash |

### Battery reply

| Bit | Meaning |
| --- | ------- |
| `[1] & 0x80` | Charging |
| `[1] & 0x7f` | Level, counting from one: `(n − 1) × 5` per cent |

The scale starting at one matters: a reported zero is the mouse saying it has
nothing to say — asleep, or out of range — and not a flat battery. It is shown
as "no reading", because an empty gauge on an idle mouse is a false alarm. A
read that times out is treated the same way, since the write that preceded it
reached the receiver and so the hardware is plainly still there.

### Resolutions

The TrueMove Air sensor takes 100 CPI steps from 100 to 18000, but the bytes
that select them are not consecutive — 800 CPI is `0x09` and 900 is `0x0a`,
while 1300 is `0x0e` and 1400 is `0x10`. The mapping is a 180-entry table, not
a formula, and it is the capability the interface offers: a value between two
steps is rounded to the nearer one and **reported back rounded**, so the window
never shows a number the mouse is not set to. A tie rounds up.

### What the mouse will not tell us

There is no read command for the resolutions, the report rate or the lighting.
The only record of them is the record of what was sent, which is why this
application re-sends it when the mouse comes back on — the same mechanism the
headset's sidetone and equaliser use. Until something has been sent, the
interface says so rather than showing the factory defaults as if they had been
observed.
