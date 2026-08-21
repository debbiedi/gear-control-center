import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { StepSelector } from "@/components/ui/StepSelector";
import { Toggle } from "@/components/ui/Toggle";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import type { AppSettings, Snapshot } from "@/types/device";

const THRESHOLDS = [25, 50];

export function SettingsPage({ snapshot }: { snapshot: Snapshot | null }) {
  const setMockMode = useDeviceStore((s) => s.setMockMode);
  const mockMode = snapshot?.mockMode ?? false;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);

  useEffect(() => {
    void deviceService.getSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  /**
   * Write through to the native layer and adopt whatever comes back.
   *
   * Autostart writes a desktop entry, which can fail. When it does, the switch
   * goes back where it was instead of sitting in a position that does not
   * match the system.
   */
  const update = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    setError(null);
    try {
      setSettings(await deviceService.setSettings({ ...settings, ...patch }));
    } catch (e) {
      const detail = (e as { detail?: unknown })?.detail;
      setError(typeof detail === "string" ? detail : String(e));
      setSettings(await deviceService.getSettings());
    }
  };

  return (
    <div className="space-y-4 p-6">
      {error && (
        <Notice tone="fault" title="That setting was not applied" onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}

      <Panel legend="Startup" title="Launching">
        {settings ? (
          <div className="space-y-5">
            <Toggle
              checked={settings.startWithSystem}
              onChange={(v) => void update({ startWithSystem: v })}
              label="Start with the system"
              description="Adds a desktop entry to your autostart directory. Nothing is installed system-wide."
            />
            <Toggle
              checked={settings.startMinimised}
              onChange={(v) => void update({ startMinimised: v })}
              label="Start in the tray"
              description="Launch without opening the window."
              disabled={!settings.startWithSystem}
              disabledReason="Available once the application starts with the system."
            />
            <Toggle
              checked={settings.closeToTray}
              onChange={(v) => void update({ closeToTray: v })}
              label="Closing the window keeps it running"
              description="The headset keeps being read, and the tray entry stays available. Quit from the tray menu to stop it completely."
            />
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">Loading…</p>
        )}
      </Panel>

      <Panel legend="Alerts" title="Notifications">
        {settings ? (
          <div className="space-y-5">
            <Toggle
              checked={settings.lowBatteryNotification}
              onChange={(v) => void update({ lowBatteryNotification: v })}
              label="Warn when the battery gets low"
              description="Shown once as the level drops past the threshold, not repeatedly."
            />
            <StepSelector
              label="Threshold"
              options={THRESHOLDS.map((t) => `${t}%`)}
              value={THRESHOLDS.indexOf(settings.lowBatteryPercent)}
              onChange={(i) => void update({ lowBatteryPercent: THRESHOLDS[i] })}
              disabled={!settings.lowBatteryNotification}
            />
            <p className="text-[12.5px] leading-snug text-ink-dim">
              Only these two are offered because the headset reports five
              levels — 0, 25, 50, 75 and 100 per cent. A threshold of 30% would
              be waiting for a number the device never sends.
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">Loading…</p>
        )}
      </Panel>

      <Panel
        legend="Development"
        title="Simulated device"
        description="For working on the interface without hardware attached."
      >
        <Toggle
          checked={mockMode}
          onChange={(next) => void setMockMode(next)}
          label="Use a simulated device"
          description="Replaces the headset with a stand-in that reports the same capabilities and the same resolution. Every reading is clearly marked as simulated."
        />
        {mockMode && (
          <div className="mt-4">
            <Notice tone="warn" title="Simulation is on">
              No physical headset is being read or written while this is
              enabled.
            </Notice>
          </div>
        )}
      </Panel>

      <Panel
        legend="Support"
        title="Diagnostics"
        description="A plain-text report of what this application can see, for attaching to a bug report."
        actions={
          <Button
            icon={<FileText size={14} />}
            onClick={() =>
              void deviceService
                .exportDiagnostics()
                .then(setDiagnostics)
                .catch((e) => setError(String(e)))
            }
          >
            Write report
          </Button>
        }
      >
        {diagnostics ? (
          <p className="text-[13px] text-ink-dim">
            Written to{" "}
            <span className="readout selectable text-ink">{diagnostics}</span>
          </p>
        ) : (
          <p className="text-[13px] text-ink-dim">
            Contains device identifiers, capabilities, the last readings and
            your settings. It contains nothing about you, and it is not sent
            anywhere — the file stays on this machine.
          </p>
        )}
      </Panel>

      <Panel legend="Application" title="About" description="Headset Control Center">
        <div className="space-y-3 text-[13px] leading-relaxed text-ink-dim">
          <p>
            A local application for controlling supported headsets directly over
            USB. Nothing is sent anywhere: there is no account, no telemetry and
            no network connection.
          </p>
          <p>
            Device support is built on publicly documented protocols. Where a
            command has not been verified against hardware, the feature is
            marked unsupported rather than shipped on a guess.
          </p>
          <p className="readout text-[12px] text-ink-faint">
            Version 0.1.0 · Linux
          </p>
        </div>
      </Panel>
    </div>
  );
}
