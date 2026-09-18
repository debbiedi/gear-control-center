/**
 * The only module that talks to the native layer. Everything above it works
 * with plain data, so no component ever reaches for a device handle.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AppSettings,
  ApplyReport,
  DeviceInfo,
  DiscoveredDevice,
  ProfileSettings,
  ProfileStore,
  Rgb,
  Snapshot,
} from "@/types/device";

/** Published by the native reader roughly once a second. */
export const SNAPSHOT_EVENT = "device://snapshot";

export const deviceService = {
  snapshot: () => invoke<Snapshot>("get_snapshot"),
  /** Subscribe to the native reader. Resolves to an unsubscribe function. */
  onSnapshot: (handler: (snapshot: Snapshot) => void) =>
    listen<Snapshot>(SNAPSHOT_EVENT, (event) => handler(event.payload)),
  discover: () => invoke<DiscoveredDevice[]>("discover_devices"),
  connect: (deviceId?: string) =>
    invoke<DeviceInfo>("connect_device", { deviceId: deviceId ?? null }),
  disconnect: () => invoke<void>("disconnect_device"),
  setMockMode: (enabled: boolean) => invoke<void>("set_mock_mode", { enabled }),
  setSidetone: (level: number) => invoke<void>("set_sidetone", { level }),
  setInactiveTime: (minutes: number) =>
    invoke<void>("set_inactive_time", { minutes }),
  setEqualizer: (bandsDb: number[]) =>
    invoke<void>("set_equalizer", { bandsDb }),
  setEqualizerPreset: (preset: number) =>
    invoke<void>("set_equalizer_preset", { preset }),
  setVolume: (value: number) => invoke<void>("set_volume", { value }),
  setMuted: (muted: boolean) => invoke<void>("set_muted", { muted }),
  setMicrophoneVolume: (value: number) =>
    invoke<void>("set_microphone_volume", { value }),
  setMicrophoneMuted: (muted: boolean) =>
    invoke<void>("set_microphone_muted", { muted }),

  setDpiPresets: (dpis: number[], active: number) =>
    invoke<void>("set_dpi_presets", { dpis, active }),
  setPollingRate: (hz: number) => invoke<void>("set_polling_rate", { hz }),
  setLightingColor: (zone: number, rgb: Rgb) =>
    invoke<void>("set_lighting_color", { zone, rgb }),
  setLightingEffect: (effect: number) =>
    invoke<void>("set_lighting_effect", { effect }),
  setReactiveColor: (rgb: Rgb | null) =>
    invoke<void>("set_reactive_color", { rgb }),
  setDimTimer: (seconds: number) => invoke<void>("set_dim_timer", { seconds }),
  /** Commit the selected device's settings to its own memory. */
  saveToDevice: () => invoke<void>("save_to_device"),

  listProfiles: () => invoke<ProfileStore>("list_profiles"),
  saveProfile: (name: string, settings: ProfileSettings, id?: string) =>
    invoke<ProfileStore>("save_profile", { id: id ?? null, name, settings }),
  renameProfile: (id: string, name: string) =>
    invoke<ProfileStore>("rename_profile", { id, name }),
  deleteProfile: (id: string) => invoke<ProfileStore>("delete_profile", { id }),
  captureProfile: (name: string) =>
    invoke<ProfileStore>("capture_profile", { name }),
  applyProfile: (id: string) => invoke<ApplyReport>("apply_profile", { id }),

  getSettings: () => invoke<AppSettings>("get_settings"),
  setSettings: (settings: AppSettings) =>
    invoke<AppSettings>("set_settings", { settings }),
  exportDiagnostics: () => invoke<string>("export_diagnostics"),
  appVersion: () => invoke<string>("app_version"),
  /** Hand the tray and notification text to the native layer. */
  setNativeStrings: (strings: Record<string, string>) =>
    invoke<void>("set_native_strings", { strings }),
  setChatmixRouting: (enabled: boolean) =>
    invoke<boolean>("set_chatmix_routing", { enabled }),
};
