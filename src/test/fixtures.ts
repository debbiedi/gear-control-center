import type { Capabilities, Snapshot } from "@/types/device";

/** A device that reports nothing, so a test can add back only what it means. */
export const NO_CAPABILITIES: Capabilities = {
  volume: false,
  mute: false,
  microphone_volume: false,
  microphone_mute: false,
  chatmix: false,
  software_profiles: false,
  onboard_profiles: false,
  firmware_update: false,
  rgb: false,
  spatial_audio: false,
  noise_reduction: false,
  battery: null,
  sidetone: null,
  equalizer: null,
  inactive_time: null,
};

export function snapshotOf(
  capabilities: Capabilities | null,
  overrides: Partial<Snapshot> = {},
): Snapshot {
  return {
    connection: capabilities ? "connected" : "disconnected",
    mockMode: false,
    hostError: null,
    device: capabilities
      ? {
          id: "d",
          name: "Test headset",
          vendor_id: 1,
          product_id: 2,
          serial: null,
          firmware_version: null,
          hardware_revision: null,
          connection: "USB",
          is_mock: false,
          verified: true,
        }
      : null,
    capabilities,
    state: null,
    stateError: null,
    audio: null,
    audioError: null,
    chatmixRouting: false,
    ...overrides,
  };
}
