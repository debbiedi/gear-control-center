import type { Capabilities } from "@/types/device";

export interface CapabilityRow {
  label: string;
  supported: boolean;
  /** What the hardware actually reports — resolution, ranges, limits. */
  detail: string;
}

/**
 * Turn the capability record into rows the interface can render verbatim.
 *
 * The details are the point. "Battery: supported" invites a percentage that
 * does not exist; "five discrete levels" tells the owner exactly what their
 * headset sends and why the gauge looks the way it does.
 */
export function capabilityRows(caps: Capabilities): CapabilityRow[] {
  const eq = caps.equalizer;
  return [
    {
      label: "Battery level",
      supported: caps.battery !== null,
      detail: caps.battery
        ? `${caps.battery.steps} discrete levels (0 / 25 / 50 / 75 / 100%)`
        : "Not reported by this device",
    },
    {
      label: "Charging state",
      supported: caps.battery !== null,
      detail: caps.battery
        ? "Reported while the cable is attached"
        : "Not reported by this device",
    },
    {
      label: "ChatMix dial",
      supported: caps.chatmix,
      detail: caps.chatmix
        ? "Read-only — the wheel is on the headset"
        : "Not present on this device",
    },
    {
      label: "Sidetone",
      supported: caps.sidetone !== null,
      detail: caps.sidetone
        ? `${caps.sidetone.labels.length} hardware steps: ${caps.sidetone.labels.join(", ")}`
        : "Not adjustable on this device",
    },
    {
      label: "Equaliser",
      supported: eq !== null,
      detail: eq
        ? `${eq.bands} bands, ${eq.min_db} to +${eq.max_db} dB in ${eq.step_db} dB steps` +
          (eq.hardware ? " — applied by the headset itself" : "")
        : "Not available on this device",
    },
    {
      label: "Equaliser presets",
      supported: (eq?.preset_names.length ?? 0) > 0,
      detail: eq?.preset_names.length
        ? eq.preset_names.join(" · ")
        : "No stored presets",
    },
    {
      label: "Auto shut-off timer",
      supported: caps.inactive_time !== null,
      detail: caps.inactive_time
        ? `Up to ${caps.inactive_time.max_minutes} minutes`
        : "Not adjustable on this device",
    },
    {
      label: "Output volume",
      supported: caps.volume,
      detail: caps.volume
        ? "USB audio hardware volume"
        : "Not exposed by this device",
    },
    {
      label: "Output mute",
      supported: caps.mute,
      detail: caps.mute ? "USB audio hardware mute" : "Not exposed by this device",
    },
    {
      label: "Microphone volume",
      supported: caps.microphone_volume,
      detail: caps.microphone_volume
        ? "USB audio capture gain"
        : "Not exposed by this device",
    },
    {
      label: "Microphone mute",
      supported: caps.microphone_mute,
      detail: caps.microphone_mute
        ? "USB audio capture mute"
        : "Not exposed by this device",
    },
    {
      label: "Software profiles",
      supported: caps.software_profiles,
      detail: caps.software_profiles
        ? "Stored by this application and sent to the headset on demand"
        : "Not available",
    },
    {
      label: "Onboard profile memory",
      supported: caps.onboard_profiles,
      detail: caps.onboard_profiles
        ? "Settings persist on the headset"
        : "The headset cannot store profiles, so there is nothing to save to it",
    },
    {
      label: "Firmware update",
      supported: caps.firmware_update,
      detail: caps.firmware_update
        ? "Supported"
        : "No documented update path for this device",
    },
    {
      label: "RGB lighting",
      supported: caps.rgb,
      detail: caps.rgb ? "Supported" : "This headset has no addressable lighting",
    },
    {
      label: "Spatial audio",
      supported: caps.spatial_audio,
      detail: caps.spatial_audio ? "Supported" : "Not a hardware feature here",
    },
    {
      label: "Hardware noise reduction",
      supported: caps.noise_reduction,
      detail: caps.noise_reduction
        ? "Supported"
        : "No microphone gate, compressor or limiter on the device",
    },
  ];
}
