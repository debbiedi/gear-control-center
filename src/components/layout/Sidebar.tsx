import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Crosshair,
  Headphones,
  LayoutDashboard,
  Mic,
  Mouse,
  Palette,
  Settings2,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useDeviceStore } from "@/stores/deviceStore";
import type { Capabilities, DeviceSummary, Snapshot } from "@/types/device";

export type View =
  | "dashboard"
  | "audio"
  | "microphone"
  | "equalizer"
  | "sensor"
  | "lighting"
  | "profiles"
  | "device"
  | "settings";

interface NavItem {
  id: View;
  Icon: LucideIcon;
  /** Whether the selected device has anything for this section to control. */
  supported?: (caps: Capabilities) => boolean;
}

/**
 * A section appears only when the device it is pointed at can do something
 * there. An equaliser page for a mouse, or a lighting page for a headset with
 * no LEDs, is a promise the software cannot keep, so it is not offered.
 *
 * With nothing connected, everything is listed: the application is still
 * usable and the pages explain what they need.
 */
const NAV: NavItem[] = [
  { id: "dashboard", Icon: LayoutDashboard },
  { id: "audio", Icon: Volume2, supported: (c) => c.volume || c.mute },
  {
    id: "microphone",
    Icon: Mic,
    supported: (c) => c.microphone_volume || c.microphone_mute || !!c.sidetone,
  },
  {
    id: "equalizer",
    Icon: SlidersHorizontal,
    supported: (c) => c.equalizer !== null,
  },
  {
    id: "sensor",
    Icon: Crosshair,
    supported: (c) => c.dpi !== null || c.polling_rate !== null,
  },
  { id: "lighting", Icon: Palette, supported: (c) => c.lighting !== null },
  { id: "profiles", Icon: BookMarked, supported: (c) => c.software_profiles },
  { id: "device", Icon: Headphones },
  { id: "settings", Icon: Settings2 },
];

/** What a device is, as far as the icon is concerned. */
function iconFor(caps: Capabilities | null): LucideIcon {
  if (caps?.dpi) return Mouse;
  return Headphones;
}

/**
 * The devices that are open, and which one the window is pointed at.
 *
 * Shown only when there is a choice to make: with one device the list would be
 * a control with a single option, and the strip along the top already says
 * which device that is.
 */
function DevicePicker({
  devices,
  selected,
}: {
  devices: DeviceSummary[];
  selected: string | null;
}) {
  const t = useT();
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  if (devices.length < 2) return null;

  return (
    <div className="border-b border-line px-3 py-3">
      <p className="legend mb-1.5 px-2 text-[9px] tracking-[0.1em]">
        {t.devices.title}
      </p>
      <ul role="radiogroup" aria-label={t.devices.title} className="space-y-0.5">
        {devices.map((device) => {
          const current = device.id === selected;
          return (
            <li key={device.id}>
              <button
                type="button"
                role="radio"
                aria-checked={current}
                onClick={() => void selectDevice(device.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                  "transition-colors",
                  current
                    ? "bg-panel-3 text-ink"
                    : "text-ink-dim hover:bg-panel-2 hover:text-ink",
                )}
              >
                {/* A shape as well as a colour: §18 forbids state by colour. */}
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    current ? "bg-brass" : "bg-line",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] leading-tight">
                    {device.name}
                  </span>
                  <span className="legend block truncate text-[9px] leading-tight">
                    {!device.poweredOn
                      ? t.devices.off
                      : device.battery
                        ? `${device.battery.percent}%`
                        : t.devices.noReading}
                    {!device.verified ? ` · ${t.devices.readOnly}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({
  view,
  onNavigate,
  snapshot,
}: {
  view: View;
  onNavigate: (next: View) => void;
  snapshot: Snapshot | null;
}) {
  const t = useT();
  const caps = snapshot?.capabilities ?? null;
  const items = NAV.filter(
    (item) => !caps || !item.supported || item.supported(caps),
  );
  const DeviceIcon = iconFor(caps);

  const label: Record<View, string> = {
    dashboard: t.nav.dashboard,
    audio: t.nav.audio,
    microphone: t.nav.microphone,
    equalizer: t.nav.equaliser,
    sensor: t.nav.sensor,
    lighting: t.nav.lighting,
    profiles: t.nav.profiles,
    device: t.nav.device,
    settings: t.nav.settings,
  };

  return (
    <nav
      aria-label={t.app.sections}
      className="flex w-[212px] shrink-0 flex-col border-r border-line bg-panel/60"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span
          aria-hidden
          className="size-2.5 rounded-[3px] bg-brass shadow-[0_0_10px_rgba(217,164,65,0.5)]"
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink">
            {t.app.name}
          </p>
          <p className="legend mt-0.5 truncate text-[9px] tracking-[0.1em]">
            {t.app.tagline}
          </p>
        </div>
      </div>

      <DevicePicker
        devices={snapshot?.devices ?? []}
        selected={snapshot?.selected ?? null}
      />

      <ul className="flex-1 space-y-0.5 p-3">
        {items.map(({ id, Icon }) => {
          // The device page is about whichever device is in front, so its icon
          // follows it rather than always showing a headset.
          const ItemIcon = id === "device" ? DeviceIcon : Icon;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={view === id ? "page" : undefined}
                className={cn(
                  "group relative flex h-9 w-full items-center gap-3 rounded-md px-3",
                  "text-[13.5px] transition-colors",
                  view === id
                    ? "bg-panel-3 font-medium text-ink"
                    : "text-ink-dim hover:bg-panel-2 hover:text-ink",
                )}
              >
                {/* The active marker is a shape as well as a colour. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full",
                    view === id ? "bg-brass" : "bg-transparent",
                  )}
                />
                <ItemIcon size={16} className="shrink-0" />
                {label[id]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
