import { useEffect, useState } from "react";
import { InstrumentStrip } from "@/components/layout/InstrumentStrip";
import { Sidebar, type View } from "@/components/layout/Sidebar";
import { Notice } from "@/components/ui/Notice";
import { AudioPage } from "@/pages/AudioPage";
import { Dashboard } from "@/pages/Dashboard";
import { DevicePage } from "@/pages/DevicePage";
import { EqualizerPage } from "@/pages/EqualizerPage";
import { MicrophonePage } from "@/pages/MicrophonePage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useDeviceStore } from "@/stores/deviceStore";

const PAGES: Record<View, (p: { snapshot: ReturnType<typeof useSnapshot> }) => React.ReactNode> = {
  dashboard: Dashboard,
  audio: AudioPage,
  microphone: MicrophonePage,
  equalizer: EqualizerPage,
  profiles: ProfilesPage,
  device: DevicePage,
  settings: SettingsPage,
};

function useSnapshot() {
  return useDeviceStore((s) => s.snapshot);
}

export function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const snapshot = useSnapshot();
  const initialising = useDeviceStore((s) => s.initialising);
  const lastActionError = useDeviceStore((s) => s.lastActionError);
  const clearActionError = useDeviceStore((s) => s.clearActionError);
  const capabilities = snapshot?.capabilities ?? null;

  // A section can disappear when the device changes — a headset without an
  // equaliser should not leave the window sitting on an equaliser page.
  useEffect(() => {
    if (!capabilities) return;
    const gone =
      (view === "equalizer" && capabilities.equalizer === null) ||
      (view === "audio" && !capabilities.volume && !capabilities.mute) ||
      (view === "microphone" &&
        !capabilities.microphone_volume &&
        !capabilities.microphone_mute &&
        !capabilities.sidetone);
    if (gone) setView("dashboard");
  }, [capabilities, view]);

  const Page = PAGES[view];

  return (
    <div className="flex h-full min-w-[1024px]">
      <Sidebar view={view} onNavigate={setView} snapshot={snapshot} />

      <div className="flex min-w-0 flex-1 flex-col">
        <InstrumentStrip snapshot={snapshot} />

        {lastActionError && (
          <div className="border-b border-line bg-ground px-6 py-3">
            <Notice
              tone="fault"
              title="Device command failed"
              onDismiss={clearActionError}
            >
              {lastActionError}
            </Notice>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto bg-ground">
          {initialising ? (
            // A brief, quiet hold. Flashing "no device detected" while the
            // first scan is still running would be a lie with a one-second
            // shelf life.
            <div className="flex h-full items-center justify-center">
              <p className="legend">Looking for devices</p>
            </div>
          ) : (
            <Page snapshot={snapshot} />
          )}
        </main>
      </div>
    </div>
  );
}
