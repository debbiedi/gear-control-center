/** Mirrors the serialised types in `src-tauri/src/device/types.rs`. */
import type { Catalog } from "@/i18n/en";

export type ConnectionState =
  | "connected"
  | "disconnected"
  | "connecting"
  | "reconnecting"
  | "unknown"
  | { error: { message: string } };

/**
 * How coarsely a device reports battery. The Arctis 7+ answers with one of
 * five levels, so the gauge is drawn with that many segments instead of a
 * continuous bar that would imply precision the hardware never sent.
 */
export interface BatterySupport {
  steps: number;
}

export interface SidetoneSupport {
  labels: string[];
}

export interface EqualizerSupport {
  bands: number;
  frequencies: number[];
  min_db: number;
  max_db: number;
  step_db: number;
  /** True when the headset applies the curve itself, not host-side DSP. */
  hardware: boolean;
  preset_names: string[];
}

export interface InactiveTimeSupport {
  max_minutes: number;
}

export interface Capabilities {
  volume: boolean;
  mute: boolean;
  microphone_volume: boolean;
  microphone_mute: boolean;
  chatmix: boolean;
  software_profiles: boolean;
  onboard_profiles: boolean;
  firmware_update: boolean;
  rgb: boolean;
  spatial_audio: boolean;
  noise_reduction: boolean;
  battery: BatterySupport | null;
  sidetone: SidetoneSupport | null;
  equalizer: EqualizerSupport | null;
  inactive_time: InactiveTimeSupport | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  vendor_id: number;
  product_id: number;
  serial: string | null;
  firmware_version: string | null;
  hardware_revision: string | null;
  connection: string;
  is_mock: boolean;
}

export interface BatteryState {
  percent: number;
  charging: boolean;
}

export interface ChatMixState {
  game: number;
  chat: number;
}

export interface DeviceState {
  connection: ConnectionState;
  powered_on: boolean;
  battery: BatteryState | null;
  chatmix: ChatMixState | null;
  sidetone_level: number | null;
  inactive_minutes: number | null;
  equalizer_db: number[] | null;
  equalizer_preset: number | null;
}

export interface DiscoveredDevice {
  info: DeviceInfo;
  capabilities: Capabilities;
  /** Set when the device is present but its control interface cannot be opened. */
  unavailable: string | null;
}

export type DeviceErrorKind =
  | "unsupported"
  | "busy"
  | "offline"
  | "not_connected"
  | "transport"
  | "protocol"
  | "invalid_parameter";

export interface DeviceError {
  kind: DeviceErrorKind;
  detail?: unknown;
}

/**
 * One ALSA mixer control, at the resolution the card reports.
 *
 * `value` is a raw step: the playback control has 78 positions and the
 * capture control 84. The percentage is derived for display only.
 */
export interface MixerControl {
  value: number;
  min: number;
  max: number;
  /** Hundredths of a decibel, or null when the driver publishes no scale. */
  db: number | null;
  muted: boolean;
}

export interface AudioState {
  playback: MixerControl | null;
  capture: MixerControl | null;
}

export interface Snapshot {
  connection: ConnectionState;
  mockMode: boolean;
  hostError: string | null;
  device: DeviceInfo | null;
  capabilities: Capabilities | null;
  state: DeviceState | null;
  stateError: DeviceError | null;
  audio: AudioState | null;
  audioError: DeviceError | null;
}

export function mixerPercent(c: MixerControl): number {
  const span = Math.max(1, c.max - c.min);
  return Math.round(((c.value - c.min) * 100) / span);
}

/** ALSA reports hundredths of a decibel; show one decimal at most. */
export function formatDb(db: number | null): string {
  if (db === null) return "—";
  const value = db / 100;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
}

export function connectionLabel(c: ConnectionState, t: Catalog): string {
  if (typeof c === "object") return t.connection.error;
  return t.connection[c];
}

export function connectionTone(
  c: ConnectionState,
): "live" | "fault" | "warn" | "idle" {
  if (typeof c === "object") return "fault";
  if (c === "connected") return "live";
  if (c === "connecting" || c === "reconnecting") return "warn";
  return "idle";
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/**
 * Every field is optional. A profile applies only what it holds, so one that
 * stores an equaliser curve will not also reset the microphone level.
 */
export interface ProfileSettings {
  volume?: number | null;
  muted?: boolean | null;
  microphoneVolume?: number | null;
  microphoneMuted?: boolean | null;
  sidetone?: number | null;
  inactiveMinutes?: number | null;
  equalizer?: number[] | null;
  equalizerPreset?: number | null;
}

export interface Profile {
  id: string;
  name: string;
  settings: ProfileSettings;
}

export interface ProfileStore {
  version: number;
  profiles: Profile[];
  /** The profile last applied — not necessarily what the headset is set to. */
  lastApplied: string | null;
}

export interface ApplyReport {
  applied: string[];
  failed: { setting: string; reason: string }[];
}

/** Human-readable list of what a profile will change. */
export function profileContents(s: ProfileSettings, t: Catalog): string[] {
  const c = t.profiles.contents;
  const parts: string[] = [];
  if (s.volume != null) parts.push(c.volume);
  if (s.muted != null) parts.push(s.muted ? c.muted : c.unmuted);
  if (s.microphoneVolume != null) parts.push(c.micLevel);
  if (s.microphoneMuted != null)
    parts.push(s.microphoneMuted ? c.micMuted : c.micLive);
  if (s.sidetone != null) parts.push(c.sidetone);
  if (s.inactiveMinutes != null) parts.push(c.autoShutOff);
  if (s.equalizer) parts.push(c.equaliserCurve);
  else if (s.equalizerPreset != null) parts.push(c.equaliserPreset);
  return parts;
}

export interface AppSettings {
  version: number;
  startWithSystem: boolean;
  startMinimised: boolean;
  closeToTray: boolean;
  lowBatteryNotification: boolean;
  /** Only 25 or 50: the headset reports nothing in between. */
  lowBatteryPercent: number;
  /** A language code, or "system" to follow the desktop. */
  locale: string;
}
