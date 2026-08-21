import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EqualizerBank } from "@/components/ui/EqualizerBank";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { cn } from "@/lib/cn";
import type { Snapshot } from "@/types/device";

const COMMIT_MS = 120;

export function EqualizerPage({ snapshot }: { snapshot: Snapshot | null }) {
  const run = useDeviceStore((s) => s.run);
  const eq = snapshot?.capabilities?.equalizer ?? null;
  const bandCount = eq?.bands ?? 0;
  const remote = snapshot?.state?.equalizer_db ?? null;
  const preset = snapshot?.state?.equalizer_preset ?? null;
  const remoteKey = remote?.join(",") ?? "";

  const [bands, setBands] = useState<number[]>(() =>
    remote ?? Array.from({ length: bandCount }, () => 0),
  );
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  // The headset offers no way to read the curve back, so the device's answer
  // only arrives as the echo of what was last sent. Adopt it unless the user
  // is mid-drag.
  useEffect(() => {
    if (dirty.current) return;
    setBands(remote ?? Array.from({ length: bandCount }, () => 0));
  }, [remoteKey, bandCount, remote]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  if (!snapshot?.device || !eq) {
    return (
      <div className="p-6">
        <Notice tone="info" title="No equaliser available">
          {snapshot?.device
            ? "This device has no equaliser."
            : "Connect a headset to adjust its equaliser."}
        </Notice>
      </div>
    );
  }

  const commit = (next: number[]) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void run("Setting the equaliser", () =>
        deviceService.setEqualizer(next),
      ).finally(() => {
        dirty.current = false;
      });
    }, COMMIT_MS);
  };

  const changeBand = (index: number, db: number) => {
    dirty.current = true;
    const next = bands.map((value, i) => (i === index ? db : value));
    setBands(next);
    commit(next);
  };

  const applyPreset = (index: number) => {
    dirty.current = false;
    void run("Applying an equaliser preset", () =>
      deviceService.setEqualizerPreset(index),
    );
  };

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend="Tone"
        title="Equaliser"
        description={
          eq.hardware
            ? "Applied by the headset itself — it stays in effect for every application, and for anything else this headset is plugged into."
            : "Applied by this application."
        }
        actions={
          <Button icon={<RotateCcw size={14} />} onClick={() => applyPreset(0)}>
            Flat
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="legend mr-1">Presets</span>
            {eq.preset_names.map((name, index) => (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(index)}
                aria-pressed={preset === index}
                className={cn(
                  "h-8 rounded-md border px-3 text-[13px] transition-colors",
                  preset === index
                    ? "border-brass bg-brass font-medium text-ground"
                    : "border-line bg-panel-2 text-ink-dim hover:border-line-bright hover:text-ink",
                )}
              >
                {name}
              </button>
            ))}
            {preset === null && remote && (
              <span className="readout text-[12px] text-ink-faint">Custom</span>
            )}
          </div>

          <EqualizerBank
            bands={bands}
            frequencies={eq.frequencies}
            minDb={eq.min_db}
            maxDb={eq.max_db}
            stepDb={eq.step_db}
            onChange={changeBand}
          />

          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-line pt-4">
            <p className="readout text-[12px] text-ink-faint">
              {eq.bands} bands · {eq.min_db} to +{eq.max_db} dB · {eq.step_db} dB
              steps
            </p>
            <p className="max-w-[560px] text-[12.5px] leading-snug text-ink-dim">
              Band frequencies are labels: the headset accepts ten positional
              gains and never names them, so these follow the standard
              ten-band spacing.
            </p>
          </div>
        </div>
      </Panel>

      {remote === null && (
        <Notice tone="info" title="The headset does not report its curve">
          There is no command to ask this device what its equaliser is currently
          set to. The faders start flat after a reconnect and show what this
          application has sent since — not necessarily what the headset is
          applying. Choosing a preset or moving a fader makes the two agree.
        </Notice>
      )}
    </div>
  );
}
