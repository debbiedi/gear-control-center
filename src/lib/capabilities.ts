import { term } from "@/i18n";
import type { Catalog } from "@/i18n/en";
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
export function capabilityRows(
  caps: Capabilities,
  t: Catalog,
): CapabilityRow[] {
  const c = t.capabilities;
  const eq = caps.equalizer;
  return [
    {
      label: c.batteryLevel,
      supported: caps.battery !== null,
      detail: caps.battery
        ? c.batteryLevelDetail(
            caps.battery.steps,
            // The spacing is the resolution: five levels are 25% apart and
            // twenty-one are 5%, and saying "five levels" without it invites
            // the reader to assume the wrong one.
            Math.round(100 / Math.max(1, caps.battery.steps - 1)),
          )
        : c.batteryLevelAbsent,
    },
    {
      label: c.chargingState,
      supported: caps.battery !== null,
      detail: caps.battery ? c.chargingStateDetail : c.batteryLevelAbsent,
    },
    {
      label: c.chatmix,
      supported: caps.chatmix,
      detail: caps.chatmix ? c.chatmixDetail : c.chatmixAbsent,
    },
    {
      label: c.sidetone,
      supported: caps.sidetone !== null,
      detail: caps.sidetone
        ? c.sidetoneDetail(
            caps.sidetone.labels.length,
            caps.sidetone.labels.map((l) => term(l, t)).join(", "),
          )
        : c.sidetoneAbsent,
    },
    {
      label: c.equaliser,
      supported: eq !== null,
      detail: eq
        ? c.equaliserDetail(eq.bands, eq.min_db, eq.max_db, eq.step_db) +
          (eq.hardware ? c.equaliserHardware : "")
        : c.equaliserAbsent,
    },
    {
      label: c.presets,
      supported: (eq?.preset_names.length ?? 0) > 0,
      detail: eq?.preset_names.length
        ? eq.preset_names.map((n) => term(n, t)).join(" · ")
        : c.presetsAbsent,
    },
    {
      label: c.inactiveTime,
      supported: caps.inactive_time !== null,
      detail: caps.inactive_time
        ? c.inactiveTimeDetail(caps.inactive_time.max_minutes)
        : c.inactiveTimeAbsent,
    },
    {
      label: c.volume,
      supported: caps.volume,
      detail: caps.volume ? c.volumeDetail : c.notExposed,
    },
    {
      label: c.mute,
      supported: caps.mute,
      detail: caps.mute ? c.muteDetail : c.notExposed,
    },
    {
      label: c.micVolume,
      supported: caps.microphone_volume,
      detail: caps.microphone_volume ? c.micVolumeDetail : c.notExposed,
    },
    {
      label: c.micMute,
      supported: caps.microphone_mute,
      detail: caps.microphone_mute ? c.micMuteDetail : c.notExposed,
    },
    {
      label: c.softwareProfiles,
      supported: caps.software_profiles,
      detail: caps.software_profiles ? c.softwareProfilesDetail : c.notAvailable,
    },
    {
      label: c.onboardProfiles,
      supported: caps.onboard_profiles,
      detail: caps.onboard_profiles
        ? c.onboardProfilesDetail
        : c.onboardProfilesAbsent,
    },
    {
      label: c.firmware,
      supported: caps.firmware_update,
      detail: caps.firmware_update ? c.supported : c.firmwareAbsent,
    },
    {
      label: c.dpi,
      supported: caps.dpi !== null,
      detail: caps.dpi
        ? c.dpiDetail(
            caps.dpi.values.length,
            caps.dpi.values[0],
            caps.dpi.values[caps.dpi.values.length - 1],
          )
        : c.dpiAbsent,
    },
    {
      label: c.pollingRate,
      supported: caps.polling_rate !== null,
      detail: caps.polling_rate
        ? c.pollingRateDetail(
            caps.polling_rate.rates.map((r) => `${r} Hz`).join(" · "),
          )
        : c.pollingRateAbsent,
    },
    {
      label: c.rgb,
      supported: caps.rgb,
      detail: caps.rgb ? c.supported : c.rgbAbsent,
    },
    {
      label: c.lightingZones,
      supported: caps.lighting !== null,
      detail: caps.lighting
        ? c.lightingZonesDetail(
            caps.lighting.zones.map((z) => term(z, t)).join(" · "),
          )
        : c.lightingZonesAbsent,
    },
    {
      label: c.onboardMemory,
      supported: caps.onboard_memory,
      detail: caps.onboard_memory
        ? c.onboardMemoryDetail
        : c.onboardMemoryAbsent,
    },
    {
      label: c.spatial,
      supported: caps.spatial_audio,
      detail: caps.spatial_audio ? c.supported : c.spatialAbsent,
    },
    {
      label: c.noiseReduction,
      supported: caps.noise_reduction,
      detail: caps.noise_reduction ? c.supported : c.noiseReductionAbsent,
    },
  ];
}
