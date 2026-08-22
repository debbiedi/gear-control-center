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

## Closing the window and getting it back

Closing the window with **Close to tray** on destroys it and leaves the
process running behind the tray icon. Opening from the tray builds a new
window. That is deliberate, and it is the only arrangement that works on
Wayland:

* **Hiding** destroys the window's surface anyway, and the one built to
  replace it comes back with a decoration the compositor draws but no longer
  routes clicks to — the window looks normal and its own close and minimise
  buttons do nothing.
* **Minimising** keeps the surface and the buttons, but xdg-shell lets a
  client minimise itself and gives it no way back, so the tray could no
  longer open it.
* **Closing and rebuilding** gives a window created exactly the way the one
  at launch is created, which is the one case where everything works.

A side effect worth knowing: the window is gone while it is closed, so it is
absent from the task bar and the window switcher, and it comes back at its
default size and position rather than where you last left it.

Nothing is lost — settings and device state live in the process, not in the
window.

## Writing a bug report

**Settings → Diagnostics → Write report** produces
`~/.config/headset-control-center/diagnostics.txt`. It contains device ids,
capabilities, the last readings and your settings — no personal data, and it is
not sent anywhere.
