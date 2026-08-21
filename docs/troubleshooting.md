# Troubleshooting

## "connected but cannot be opened"

Only one process can hold the control interface. On Linux the usual culprit is
another headset daemon. To find out what has it:

```bash
sudo fuser -v /dev/hidraw*
systemctl --user list-units | grep -i arctis
```

If a service is holding it, stop it:

```bash
systemctl --user stop arctis-manager
```

This application will never stop a service on your behalf. It tells you what it
found and leaves the decision to you.

To give the device back later:

```bash
systemctl --user start arctis-manager
```

## The headset is not detected at all

1. Check the dongle is enumerated: `lsusb | grep 1038`.
2. Check the control node exists and you can read it:
   `ls -l /dev/hidraw*` — one of them should belong to the headset, and your
   user should have access (see `docs/hardware.md`, *Permissions*).
3. Switch the headset on. A dongle with no headset paired reports no battery.

## No audio controls

The volume and microphone controls come from the device's ALSA card. Confirm it
exists:

```bash
cat /proc/asound/cards
amixer -c A7 scontents
```

If the card is missing, the audio interfaces are not bound to `snd-usb-audio`,
which is a kernel or configuration matter rather than an application one.

## Nothing happens when I move the equaliser

The equaliser is applied inside the headset. If the change is inaudible,
confirm the command was accepted:

```bash
cd src-tauri
cargo run --example probe -- preset 1     # Bass Boost, clearly audible
cargo run --example probe -- preset 0     # back to flat
```

An error there is a hardware or permission problem; silence with an `OK` means
the device accepted it.

## Writing a bug report

**Settings → Diagnostics → Write report** produces
`~/.config/headset-control-center/diagnostics.txt`. It contains device ids,
capabilities, the last readings and your settings — no personal data, and it is
not sent anywhere.
