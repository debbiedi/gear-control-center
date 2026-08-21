import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Headphones,
  LayoutDashboard,
  Mic,
  Settings2,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { cn } from "@/lib/cn";
import { connectionLabel, connectionTone } from "@/types/device";
import type { Capabilities, Snapshot } from "@/types/device";

export type View =
  | "dashboard"
  | "audio"
  | "microphone"
  | "equalizer"
  | "profiles"
  | "device"
  | "settings";

interface NavItem {
  id: View;
  label: string;
  Icon: LucideIcon;
  /** Whether the connected device has anything for this section to control. */
  supported?: (caps: Capabilities) => boolean;
}

/**
 * A section appears only when the device it is pointed at can do something
 * there. An equaliser page for a headset without an equaliser is a promise the
 * software cannot keep, so it is not offered.
 *
 * With nothing connected, everything is listed: the application is still
 * usable and the pages explain what they need.
 */
const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  {
    id: "audio",
    label: "Audio",
    Icon: Volume2,
    supported: (c) => c.volume || c.mute,
  },
  {
    id: "microphone",
    label: "Microphone",
    Icon: Mic,
    supported: (c) => c.microphone_volume || c.microphone_mute || !!c.sidetone,
  },
  {
    id: "equalizer",
    label: "Equaliser",
    Icon: SlidersHorizontal,
    supported: (c) => c.equalizer !== null,
  },
  {
    id: "profiles",
    label: "Profiles",
    Icon: BookMarked,
    supported: (c) => c.software_profiles,
  },
  { id: "device", label: "Device", Icon: Headphones },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export function Sidebar({
  view,
  onNavigate,
  snapshot,
}: {
  view: View;
  onNavigate: (next: View) => void;
  snapshot: Snapshot | null;
}) {
  const connection = snapshot?.connection ?? "unknown";
  const caps = snapshot?.capabilities ?? null;
  const items = NAV.filter((item) => !caps || !item.supported || item.supported(caps));

  return (
    <nav
      aria-label="Sections"
      className="flex w-[224px] shrink-0 flex-col border-r border-line bg-panel"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span
          aria-hidden
          className="size-2.5 rounded-[3px] bg-brass shadow-[0_0_10px_rgba(217,164,65,0.5)]"
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink">
            Headset Control Center
          </p>
          <p className="legend mt-0.5">Local · Open hardware</p>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 p-3">
        {items.map(({ id, label, Icon }) => (
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
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-5 py-4">
        <p className="legend mb-2">Connection</p>
        <StatusLamp
          tone={connectionTone(connection)}
          label={connectionLabel(connection)}
        />
        <p className="readout mt-1 truncate text-[12px] text-ink-faint">
          {snapshot?.device?.name ?? "No device detected"}
        </p>
      </div>
    </nav>
  );
}
