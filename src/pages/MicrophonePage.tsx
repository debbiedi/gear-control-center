import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { StepSelector } from "@/components/ui/StepSelector";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { formatDb, mixerPercent, type Snapshot } from "@/types/device";

export function MicrophonePage({ snapshot }: { snapshot: Snapshot | null }) {
  const run = useDeviceStore((s) => s.run);
  const capture = snapshot?.audio?.capture ?? null;
  const sidetone = snapshot?.capabilities?.sidetone ?? null;
  const sidetoneLevel = snapshot?.state?.sidetone_level ?? null;

  const [level, setLevel] = useDeviceValue(capture?.value ?? 0, (value) =>
    run("Setting the microphone level", () =>
      deviceService.setMicrophoneVolume(value),
    ),
  );

  if (!snapshot?.device) {
    return (
      <div className="p-6">
        <Notice tone="info" title="No device connected">
          Connect a headset to control its microphone.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend="Input"
        title="Microphone"
        description="The capture gain on the headset's own audio hardware."
        actions={
          capture && (
            <Button
              variant={capture.muted ? "primary" : "secondary"}
              icon={capture.muted ? <MicOff size={14} /> : <Mic size={14} />}
              onClick={() =>
                run("Changing the microphone mute", () =>
                  deviceService.setMicrophoneMuted(!capture.muted),
                )
              }
            >
              {capture.muted ? "Muted" : "Mute"}
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
                <p className="legend mb-1">Gain</p>
                <p className="readout text-[15px] text-ink">
                  {formatDb(capture.db)}
                </p>
              </div>
            </div>

            <Slider
              label="Capture level"
              value={level}
              min={capture.min}
              max={capture.max}
              onChange={setLevel}
              disabled={capture.muted}
              readout={`${level} / ${capture.max}`}
              detail={`${capture.max - capture.min + 1} hardware steps.`}
            />

            {capture.muted && (
              <Notice tone="warn" title="Microphone is muted">
                Nothing is being captured. This is the hardware mute, so it
                applies to every application.
              </Notice>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            This device exposes no microphone control.
          </p>
        )}
      </Panel>

      <Panel
        legend="Monitoring"
        title="Sidetone"
        description="How much of your own voice the headset plays back to you."
      >
        {sidetone ? (
          <div className="space-y-4">
            <StepSelector
              label="Level"
              options={sidetone.labels}
              value={sidetoneLevel}
              onChange={(index) =>
                run("Setting sidetone", () => deviceService.setSidetone(index))
              }
            />
            <p className="text-[12.5px] leading-snug text-ink-dim">
              The headset stores {sidetone.labels.length} positions, so this is a
              four-way switch rather than a slider.
              {sidetoneLevel === null &&
                " It does not report which one is currently set — the selection appears here once you choose it."}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            This device has no sidetone control.
          </p>
        )}
      </Panel>

      <Panel legend="Not available" title="Microphone processing">
        <p className="mb-3 text-[13px] text-ink-dim">
          This headset performs no processing on the microphone signal. None of
          the following exist in its hardware, and this application will not
          apply them in software and call them a device feature:
        </p>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-ink-faint">
          {[
            "Noise reduction",
            "Noise gate",
            "Compressor",
            "Limiter",
            "Voice enhancement",
            "Microphone mute LED",
          ].map((item) => (
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
