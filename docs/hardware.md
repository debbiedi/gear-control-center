# Hardware notes

Everything here was read from a physical device on a Linux machine, or from a
published source that is named. Nothing is inferred from a product page.

## SteelSeries Arctis 7+

Wireless headset with a USB-C dongle. `1038:220e`, USB full speed. The dongle
presents six interfaces:

| # | Class | Purpose | Kernel driver | Node |
| - | ----- | ------- | ------------- | ---- |
| 0–2 | Audio (UAC1) | Game and chat output, microphone input | `snd-usb-audio` | ALSA card `A7` |
| 3 | HID, usage page `0xffc0`, usage `0x1` | **Control channel**, 64-byte reports | `usbhid` | `/dev/hidraw0` |
| 4 | HID, consumer page `0x0c` | Media keys | `usbhid` | `/dev/hidraw1` |
| 5 | HID, vendor page `0xff00` | 64-byte in/out, purpose unknown `[unverified]` | `usbhid` | `/dev/hidraw2` |

Interface 3 is the one this application opens. It is selected by usage page and
usage rather than by interface number, because the interface ordering is not
guaranteed across platforms; the interface number is only a fallback.

Related product ids share the protocol and are listed as supported, but have
not been tested here: `2212` (PS5), `2216` (Xbox), `2236` (Destiny edition).
`[unverified]`

## SteelSeries Aerox 3 Wireless

Wireless mouse with a USB-C receiver. `1038:1838` over the radio and
`1038:183a` on the cable — the same mouse, two products, and it swaps between
them when it is plugged in to charge. The receiver presents five interfaces:

| # | Class | Purpose | Kernel driver | Node |
| - | ----- | ------- | ------------- | ---- |
| 0 | HID, generic desktop, usage `0x2` | Mouse | `usbhid` | `/dev/hidraw0` |
| 1 | HID, generic desktop, usage `0x6` | Keyboard (button mapping) | `usbhid` | `/dev/hidraw1` |
| 2 | HID, consumer page `0x0c` | Media keys | `usbhid` | `/dev/hidraw2` |
| 3 | HID, usage page `0xffc0`, usage `0x1` | **Control channel** | `usbhid` | `/dev/hidraw3` |
| 4 | HID, vendor page `0xffc1` | Purpose unknown `[unverified]` | `usbhid` | `/dev/hidraw4` |

Interface 3 carries control traffic, exactly as on the headset and behind the
same usage page. The two are told apart by product id alone.

Unlike the headset, reports on this interface are not padded to a fixed size.
Battery is the only thing it will report; everything else is write-only.

## Permissions

No new udev rule is needed on a current distribution. Arch ships
`/usr/lib/udev/rules.d/70-headsets.rules`, which tags `1038:220e` hidraw nodes
with `uaccess` — the logged-in user gets access automatically.

If your distribution does not, add:

```
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1038", ATTRS{idProduct}=="220e", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1038", ATTRS{idProduct}=="1838", TAG+="uaccess"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1038", ATTRS{idProduct}=="183a", TAG+="uaccess"
```

to `/etc/udev/rules.d/70-headset-control-center.rules` and reload with
`sudo udevadm control --reload && sudo udevadm trigger`.

## Audio controls

The kernel exposes the device's own USB Audio Class feature units as ALSA
mixer controls on the card it created for the device. These are hardware
controls: changing them changes the headset for every application, and the
change survives this one being closed.

| Control | Range | Notes |
| ------- | ----- | ----- |
| Playback volume | 0–77 | 78 steps, −77…0 dB |
| Playback switch | on/off | Hardware mute |
| Capture volume | 0–83 | 84 steps, −83…0 dB |
| Capture switch | on/off | Hardware mute |

The card is found by matching `/proc/asound/card*/usbid` against the device's
USB ids, not by name: card names come from the product string and two headsets
of the same model would collide.

## What the device can do

| Capability | Available | Detail |
| ---------- | --------- | ------ |
| Battery level | yes | **Five levels only**: 0, 25, 50, 75, 100 per cent |
| Charging state | yes | Reported while the cable is attached |
| ChatMix dial | yes | Read-only — the wheel is on the headset. The application can act on the reading: see *Splitting game and chat audio* below |
| Sidetone | yes | Four hardware steps |
| Equaliser | yes | Ten bands, ±12 dB in 0.5 dB steps, applied by the headset |
| Equaliser presets | yes | Four, stored in firmware |
| Auto shut-off | yes | 0–90 minutes |
| Output volume and mute | yes | Via ALSA, above |
| Microphone level and mute | yes | Via ALSA, above |
| Onboard profile memory | **no** | No such command exists in the protocol |
| Firmware update | **no** | No documented update path |
| RGB or any lighting | **no** | The hardware has none |
| Microphone processing | **no** | No gate, compressor, limiter or noise reduction |
| Bluetooth | **no** | 2.4 GHz dongle only |
| Volume limiter | **no** | — |

### Three consequences for the interface

1. **Battery is drawn as four segments, not a percentage bar.** The device
   reports five levels; a smooth percentage would be this application's
   invention, and a figure that sat at exactly 75% for an hour would rightly
   cost the user their trust in every other reading.
2. **Sidetone is a four-way switch, not a slider.** A 0–100 control could show
   43 while the headset sat on "Low".
3. **There is no "save to device" button.** Nothing can be saved to this
   headset. Profiles are stored by this application and applied by sending each
   setting individually, and the Profiles page says so.

## Splitting game and chat audio

The headset reports two levels, one per side of its wheel, but it does not
split the audio itself — on Windows the vendor software creates two playback
devices and attenuates them against each other. The same thing is available
here, turned off by default: two null sinks (`headset_cc_game`,
`headset_cc_chat`) are created and looped back into the headset's real output,
and the wheel's reading sets their volumes. Applications are assigned to one or
the other in the usual volume mixer.

The modules are loaded through `pactl` and carry a marker in their arguments,
so every start of the application clears any that a previous run left behind. A
clean quit removes them; a hard kill leaves them until the next start or until
logout, whichever comes first.

The headset's playback device is found by the vendor and product ids the sound
server publishes, not by the sink's name — names are built from the product
string and two headsets of the same model would collide.

### What the device does not tell us

There is no command to read back the sidetone level, the equaliser curve or
the auto shut-off timer. The application shows what it last sent during the
current session, and after a reconnect it shows nothing rather than guessing.
Every place this matters carries a line of text saying so.
