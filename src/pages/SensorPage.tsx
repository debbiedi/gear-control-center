import { useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { OptionList } from "@/components/ui/OptionList";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { nearestDpi, type Snapshot } from "@/types/device";

/**
 * What the presets start at when the device has not been told any.
 *
 * The mouse answers no read command for its resolutions, so until this
 * application has sent some there is genuinely nothing to report. These are a
 * starting point to edit, and the panel says as much — nothing is sent until
 * the user moves something.
 */
const STARTING_POINT = [800, 1600];

export function SensorPage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const caps = snapshot?.capabilities ?? null;
  const dpi = caps?.dpi ?? null;
  const polling = caps?.polling_rate ?? null;
  const sleep = caps?.inactive_time ?? null;

  const known = snapshot?.state?.dpi_presets ?? null;
  const knownActive = snapshot?.state?.dpi_active ?? null;
  const knownKey = known?.join(",") ?? "";

  const [presets, setPresets] = useState<number[]>(known ?? STARTING_POINT);
  const [active, setActive] = useState(knownActive ?? 0);
  const [saved, setSaved] = useState(false);
  const [shownKey, setShownKey] = useState(knownKey);

  // Once the device has been told something, what it was told is what the page
  // shows — the local draft stops being the source of truth. Adjusted during
  // render rather than in an effect, so the sliders never sit on the draft for
  // a frame after the device has answered.
  if (knownKey && knownKey !== shownKey) {
    setShownKey(knownKey);
    setPresets(knownKey.split(",").map(Number));
    setActive(knownActive ?? 0);
  }

  const [sleepMinutes, setSleepMinutes] = useDeviceValue(
    snapshot?.state?.inactive_minutes ?? 0,
    (value) =>
      run(t.actions.settingAutoShutOff, () =>
        deviceService.setInactiveTime(value),
      ),
  );

  if (!snapshot?.device || !dpi) {
    return (
      <div className="p-6">
        <Notice tone="info" title={t.sensor.title}>
          {t.sensor.absent}
        </Notice>
      </div>
    );
  }

  const values = dpi.values;
  const send = (next: number[], nextActive: number) => {
    setPresets(next);
    setActive(nextActive);
    setSaved(false);
    void run(t.actions.settingResolution, () =>
      deviceService.setDpiPresets(next, nextActive),
    );
  };

  return (
    <div className="space-y-4 p-6">
      <Panel title={t.sensor.presets} description={t.sensor.lede}>
        <div className="space-y-5">
          {presets.map((cpi, index) => {
            const snapped = nearestDpi(values, cpi);
            const position = Math.max(0, values.indexOf(snapped));
            const current = index === active;
            return (
              <div
                key={index}
                className={cn(
                  "rounded-md px-3.5 py-3 transition-colors",
                  current ? "bg-panel-3" : "bg-panel-2/40",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={current}
                    aria-label={t.sensor.select}
                    onClick={() => send(presets, index)}
                    className="flex items-center gap-2.5 text-[13px]"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 rounded-full",
                        current ? "bg-brass" : "bg-line",
                      )}
                    />
                    <span className={current ? "text-ink" : "text-ink-dim"}>
                      {t.sensor.preset(index + 1)}
                    </span>
                    {current && (
                      <span className="legend text-[9px]">
                        {t.sensor.selected}
                      </span>
                    )}
                  </button>

                  {presets.length > 1 && (
                    <Button
                      variant="ghost"
                      icon={<X size={13} />}
                      onClick={() => {
                        const next = presets.filter((_, i) => i !== index);
                        send(next, Math.min(active, next.length - 1));
                      }}
                    >
                      {t.sensor.remove}
                    </Button>
                  )}
                </div>

                <Slider
                  label={t.sensor.cpi}
                  value={position}
                  min={0}
                  max={values.length - 1}
                  onChange={(i) => {
                    const next = [...presets];
                    next[index] = values[i];
                    send(next, active);
                  }}
                  readout={`${snapped} ${t.sensor.cpi}`}
                  detail={
                    snapped !== cpi ? t.sensor.snapped(snapped) : undefined
                  }
                />
              </div>
            );
          })}

          {presets.length < dpi.max_presets && (
            <Button
              variant="secondary"
              icon={<Plus size={14} />}
              onClick={() =>
                send([...presets, values[values.indexOf(1600)] ?? 1600], active)
              }
            >
              {t.sensor.add}
            </Button>
          )}

          <p className="text-[12.5px] leading-snug text-ink-dim">
            {t.sensor.presetsHint(dpi.max_presets)}
            {!knownKey && ` ${t.sensor.saveHint}`}
          </p>
        </div>
      </Panel>

      {polling && (
        <Panel
          title={t.sensor.reportRate}
          description={t.sensor.reportRateHint}
        >
          <OptionList
            label={t.sensor.reportRate}
            value={String(snapshot.state?.polling_rate ?? "")}
            onChange={(value) =>
              void run(t.actions.settingReportRate, () =>
                deviceService.setPollingRate(Number(value)),
              )
            }
            options={polling.rates.map((hz) => ({
              value: String(hz),
              label: t.sensor.hz(hz),
            }))}
          />
        </Panel>
      )}

      {sleep && (
        <Panel title={t.sensor.sleepTimer}>
          <Slider
            label={t.sensor.sleepTimer}
            value={sleepMinutes}
            min={0}
            max={sleep.max_minutes}
            onChange={setSleepMinutes}
            readout={
              sleepMinutes === 0
                ? t.sensor.never
                : t.sensor.minutes(sleepMinutes)
            }
            detail={t.sensor.sleepTimerHint(sleep.max_minutes)}
          />
        </Panel>
      )}

      {caps?.onboard_memory && (
        <Panel title={t.sensor.save} description={t.sensor.saveHint}>
          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              icon={<Save size={14} />}
              onClick={() => {
                setSaved(false);
                void run(t.actions.savingToDevice, async () => {
                  await deviceService.saveToDevice();
                  setSaved(true);
                });
              }}
            >
              {t.sensor.save}
            </Button>
            {saved && (
              <span className="legend text-[11px]">{t.sensor.saved}</span>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
