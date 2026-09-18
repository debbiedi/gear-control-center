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

/**
 * Sensor resolutions a pointing device accepts.
 *
 * A list rather than a range: the sensor quantises, so a smooth slider would
 * promise a precision the hardware does not have. The UI snaps to these.
 */
export interface DpiSupport {
  values: number[];
  max_presets: number;
}

export interface PollingRateSupport {
  /** Report rates in Hz. */
  rates: number[];
}

export interface LightingSupport {
  /** LED names in the order the device addresses them. */
  zones: string[];
  effects: string[];
  reactive: boolean;
}

/** An RGB triple, 0-255 per channel. */
export type Rgb = [number, number, number];

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
  /** Shared: a headset's auto shut-off and a mouse's sleep timer are one idea. */
  inactive_time: InactiveTimeSupport | null;
  dpi: DpiSupport | null;
  polling_rate: PollingRateSupport | null;
  lighting: LightingSupport | null;
  /** Whether the device can be told to keep its settings through a power cycle. */
  onboard_memory: boolean;
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
  /**
   * False for a device implemented from documentation that nobody has
   * confirmed on hardware. Such a device is read-only.
   */
  verified: boolean;
}

export interface BatteryState {
  percent: number;
  charging: boolean;
}

export interface ChatMixState {
  game: number;
  chat: number;
}

/**
 * Where the lighting stands.
 *
 * Every field is what this application last sent: the device answers no read
 * command for its lighting, so before anything is sent this is absent rather
 * than filled with the factory defaults as if they had been observed.
 */
export interface LightingState {
  /** One RGB triple per zone, in `LightingSupport.zones` order. */
  colors: Rgb[];
  /** Index into `LightingSupport.effects`. */
  effect: number | null;
  reactive_color: Rgb | null;
  dim_seconds: number | null;
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
  dpi_presets: number[] | null;
  dpi_active: number | null;
  polling_rate: number | null;
  lighting: LightingState | null;
}

export interface DiscoveredDevice {
  info: DeviceInfo;
  capabilities: Capabilities;
  /** Set when the device is present but its control interface cannot be opened. */
  unavailable: string | null;
}

export type DeviceErrorKind =
  | "unsupported"
  | "unverified"
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

/**
 * One line about an open device, for the sidebar.
 *
 * Deliberately small: it is published on every pass, beside the full record of
 * whichever device is selected.
 */
export interface DeviceSummary {
  id: string;
  name: string;
  connection: ConnectionState;
  battery: BatteryState | null;
  poweredOn: boolean;
  verified: boolean;
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
  /** Whether the virtual game and chat outputs are currently in place. */
  chatmixRouting: boolean;
  /**
   * Every open device. The fields above describe the selected one; this is the
   * list the sidebar offers.
   */
  devices: DeviceSummary[];
  selected: string | null;
}

/** `#rrggbb`, which is what an `<input type="color">` speaks. */
export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/**
 * The resolution nearest to `cpi` that the sensor actually has.
 *
 * The same rounding the native layer applies, so a slider shows where it will
 * land before it is let go rather than jumping afterwards.
 */
export function nearestDpi(values: number[], cpi: number): number {
  return values.reduce((best, v) =>
    Math.abs(v - cpi) <= Math.abs(best - cpi) ? v : best,
  );
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
  chatmixRouting: boolean;
}
