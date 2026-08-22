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

## Closing the window leaves it in the task bar

Closing minimises the window rather than hiding it. That is deliberate: on
Wayland, hiding destroys the window's surface, and the one built to replace it
comes back with a decoration the compositor draws but no longer routes clicks
to — the window looks normal and its own close and minimise buttons do nothing.
Minimising keeps the surface, so the buttons keep working.

The application asks to be left out of the task bar while it is closed, but
that request is an X11 hint and Wayland has no equivalent, so on a Wayland
session it has no effect. On KDE a window rule does it:

**System Settings → Window Management → Window Rules → Add New**, match the
window class `headset-control-center` exactly, then force **Skip taskbar: Yes**.

Or write it directly and reload:

```ini
# ~/.config/kwinrulesrc
[General]
count=1
rules=headset-control-center-tray

[headset-control-center-tray]
Description=Headset Control Center — tray only
skiptaskbar=true
skiptaskbarrule=2
wmclass=headset-control-center
wmclassmatch=1
```

```bash
gdbus call --session --dest org.kde.KWin --object-path /KWin \
  --method org.kde.KWin.reconfigure
```

To undo it, delete the rule in that same settings page.

## Writing a bug report

**Settings → Diagnostics → Write report** produces
`~/.config/headset-control-center/diagnostics.txt`. It contains device ids,
capabilities, the last readings and your settings — no personal data, and it is
not sent anywhere.
