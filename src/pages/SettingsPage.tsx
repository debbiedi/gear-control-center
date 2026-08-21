import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { StepSelector } from "@/components/ui/StepSelector";
import { Toggle } from "@/components/ui/Toggle";
import {
  LOCALE_NAMES,
  useI18n,
  useT,
  type LocalePreference,
} from "@/i18n";
import { cn } from "@/lib/cn";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import type { AppSettings, Snapshot } from "@/types/device";

const THRESHOLDS = [25, 50];

export function SettingsPage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const preference = useI18n((s) => s.preference);
  const setPreference = useI18n((s) => s.setPreference);
  const setMockMode = useDeviceStore((s) => s.setMockMode);
  const mockMode = snapshot?.mockMode ?? false;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void deviceService.getSettings().then(setSettings).catch(() => setSettings(null));
    void deviceService.appVersion().then(setVersion).catch(() => setVersion(null));
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
        <Notice
          tone="fault"
          title={t.settings.settingFailed}
          onDismiss={() => setError(null)}
        >
          {error}
        </Notice>
      )}

      <Panel
        legend={t.settings.languageLegend}
        title={t.settings.languageTitle}
        description={t.settings.languageDescription}
      >
        <div className="max-w-[360px] space-y-4">
          <select
            aria-label={t.settings.languageTitle}
            value={preference}
            onChange={(e) =>
              void setPreference(e.target.value as LocalePreference).then(() =>
                setSettings((s) =>
                  s ? { ...s, locale: e.target.value } : s,
                ),
              )
            }
            className={cn(
              "h-9 w-full rounded-md border border-line bg-panel-2 px-3",
              "text-[13.5px] text-ink focus:border-brass focus:outline-none",
            )}
          >
            <option value="system">{t.settings.systemLanguage}</option>
            {Object.entries(LOCALE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <p className="text-[12.5px] leading-snug text-ink-dim">
            {t.settings.languageNote}
          </p>
        </div>
      </Panel>

      <Panel legend={t.settings.startupLegend} title={t.settings.startupTitle}>
        {settings ? (
          <div className="space-y-5">
            <Toggle
              checked={settings.startWithSystem}
              onChange={(v) => void update({ startWithSystem: v })}
              label={t.settings.startWithSystem}
              description={t.settings.startWithSystemDetail}
            />
            <Toggle
              checked={settings.startMinimised}
              onChange={(v) => void update({ startMinimised: v })}
              label={t.settings.startMinimised}
              description={t.settings.startMinimisedDetail}
              disabled={!settings.startWithSystem}
              disabledReason={t.settings.startMinimisedDisabled}
            />
            <Toggle
              checked={settings.closeToTray}
              onChange={(v) => void update({ closeToTray: v })}
              label={t.settings.closeToTray}
              description={t.settings.closeToTrayDetail}
            />
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">{t.settings.loading}</p>
        )}
      </Panel>

      <Panel legend={t.settings.alertsLegend} title={t.settings.alertsTitle}>
        {settings ? (
          <div className="space-y-5">
            <Toggle
              checked={settings.lowBatteryNotification}
              onChange={(v) => void update({ lowBatteryNotification: v })}
              label={t.settings.lowBattery}
              description={t.settings.lowBatteryDetail}
            />
            <StepSelector
              label={t.settings.threshold}
              options={THRESHOLDS.map((threshold) => `${threshold}%`)}
              value={THRESHOLDS.indexOf(settings.lowBatteryPercent)}
              onChange={(i) => void update({ lowBatteryPercent: THRESHOLDS[i] })}
              disabled={!settings.lowBatteryNotification}
            />
            <p className="text-[12.5px] leading-snug text-ink-dim">
              {t.settings.thresholdNote}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">{t.settings.loading}</p>
        )}
      </Panel>

      <Panel
        legend={t.settings.developmentLegend}
        title={t.settings.simulatedTitle}
        description={t.settings.simulatedDescription}
      >
        <Toggle
          checked={mockMode}
          onChange={(next) => void setMockMode(next)}
          label={t.settings.useSimulated}
          description={t.settings.useSimulatedDetail}
        />
        {mockMode && (
          <div className="mt-4">
            <Notice tone="warn" title={t.settings.simulationOnTitle}>
              {t.settings.simulationOnBody}
            </Notice>
          </div>
        )}
      </Panel>

      <Panel
        legend={t.settings.supportLegend}
        title={t.settings.diagnosticsTitle}
        description={t.settings.diagnosticsDescription}
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
            {t.settings.writeReport}
          </Button>
        }
      >
        {diagnostics ? (
          <p className="text-[13px] text-ink-dim">
            {t.settings.writtenTo}{" "}
            <span className="readout selectable text-ink">{diagnostics}</span>
          </p>
        ) : (
          <p className="text-[13px] text-ink-dim">{t.settings.diagnosticsBody}</p>
        )}
      </Panel>

      <Panel
        legend={t.settings.aboutLegend}
        title={t.settings.aboutTitle}
        description={t.app.name}
      >
        <div className="space-y-3 text-[13px] leading-relaxed text-ink-dim">
          <p>{t.settings.aboutBody1}</p>
          <p>{t.settings.aboutBody2}</p>
          <p className="readout text-[12px] text-ink-faint">
            {version
              ? t.settings.version(version)
              : t.settings.versionUnavailable}
          </p>
        </div>
      </Panel>
    </div>
  );
}
