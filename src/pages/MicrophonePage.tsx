import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { StepSelector } from "@/components/ui/StepSelector";
import { term, useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { formatDb, mixerPercent, type Snapshot } from "@/types/device";

export function MicrophonePage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const capture = snapshot?.audio?.capture ?? null;
  const sidetone = snapshot?.capabilities?.sidetone ?? null;
  const sidetoneLevel = snapshot?.state?.sidetone_level ?? null;

  const [level, setLevel] = useDeviceValue(capture?.value ?? 0, (value) =>
    run(t.actions.settingMicLevel, () =>
      deviceService.setMicrophoneVolume(value),
    ),
  );

  if (!snapshot?.device) {
    return (
      <div className="p-6">
        <Notice tone="info" title={t.microphone.noDeviceTitle}>
          {t.microphone.noDeviceBody}
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend={t.microphone.inputLegend}
        title={t.microphone.title}
        description={t.microphone.description}
        actions={
          capture && (
            <Button
              variant={capture.muted ? "primary" : "secondary"}
              icon={capture.muted ? <MicOff size={14} /> : <Mic size={14} />}
              onClick={() =>
                run(t.actions.changingMicMute, () =>
                  deviceService.setMicrophoneMuted(!capture.muted),
                )
              }
            >
              {capture.muted ? t.microphone.muted : t.microphone.mute}
            </Button>
          )
        }
      >
        {capture ? (
          <div className="space-y-6">
            <div className="flex items-end gap-6">
              <span className="readout text-[40px] leading-none font-medium tracking-tight text-ink">
                {mixerPercent({ ...capture, value: level })}
                <span className="text-[20px] text-ink-dim">%</span>
              </span>
              <div className="mb-1.5">
                <p className="legend mb-1">{t.microphone.gain}</p>
                <p className="readout text-[15px] text-ink">
                  {formatDb(capture.db)}
                </p>
              </div>
            </div>

            <Slider
              label={t.microphone.captureLevel}
              value={level}
              min={capture.min}
              max={capture.max}
              onChange={setLevel}
              disabled={capture.muted}
              readout={`${level} / ${capture.max}`}
              detail={t.microphone.levelDetail(capture.max - capture.min + 1)}
            />

            {capture.muted && (
              <Notice tone="warn" title={t.microphone.mutedTitle}>
                {t.microphone.mutedBody}
              </Notice>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            {t.microphone.noControl}
          </p>
        )}
      </Panel>

      <Panel
        legend={t.microphone.monitoringLegend}
        title={t.microphone.sidetoneTitle}
        description={t.microphone.sidetoneDescription}
      >
        {sidetone ? (
          <div className="space-y-4">
            <StepSelector
              label={t.microphone.level}
              options={sidetone.labels.map((l) => term(l, t))}
              value={sidetoneLevel}
              onChange={(index) =>
                run(t.actions.settingSidetone, () =>
                  deviceService.setSidetone(index),
                )
              }
            />
            <p className="text-[12.5px] leading-snug text-ink-dim">
              {t.microphone.sidetoneSteps(sidetone.labels.length)}
              {sidetoneLevel === null && t.microphone.sidetoneUnknown}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            {t.microphone.sidetoneUnsupported}
          </p>
        )}
      </Panel>

      <Panel
        legend={t.microphone.processingLegend}
        title={t.microphone.processingTitle}
      >
        <p className="mb-3 text-[13px] text-ink-dim">
          {t.microphone.processingBody}
        </p>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-ink-faint">
          {t.microphone.processingList.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
              {item}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
