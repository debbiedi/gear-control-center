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
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
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
  { id: "profiles", Icon: BookMarked, supported: (c) => c.software_profiles },
  { id: "device", Icon: Headphones },
  { id: "settings", Icon: Settings2 },
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
  const t = useT();
  const caps = snapshot?.capabilities ?? null;
  const items = NAV.filter((item) => !caps || !item.supported || item.supported(caps));

  const label: Record<View, string> = {
    dashboard: t.nav.dashboard,
    audio: t.nav.audio,
    microphone: t.nav.microphone,
    equalizer: t.nav.equaliser,
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

      <ul className="flex-1 space-y-0.5 p-3">
        {items.map(({ id, Icon }) => (
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
              {label[id]}
            </button>
          </li>
        ))}
      </ul>

    </nav>
  );
}
