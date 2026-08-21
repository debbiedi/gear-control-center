import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { formatDb, mixerPercent, type Snapshot } from "@/types/device";

export function AudioPage({ snapshot }: { snapshot: Snapshot | null }) {
  const run = useDeviceStore((s) => s.run);
  const playback = snapshot?.audio?.playback ?? null;

  const [volume, setVolume] = useDeviceValue(playback?.value ?? 0, (value) =>
    run("Setting the volume", () => deviceService.setVolume(value)),
  );

  if (!snapshot?.device) {
    return (
      <div className="p-6">
        <Notice tone="info" title="No device connected">
          Connect a headset to control its volume.
        </Notice>
      </div>
    );
  }

  if (!playback) {
    return (
      <div className="p-6">
        <Notice tone="warn" title="No volume control on this device">
          {snapshot.audioError
            ? "The device's audio card could not be read."
            : "This headset does not expose a hardware volume control."}
        </Notice>
      </div>
    );
  }

  const steps = playback.max - playback.min + 1;

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend="Output"
        title="Volume"
        description="The headset's own volume, the same control as the dial on the cup."
        actions={
          <Button
            variant={playback.muted ? "primary" : "secondary"}
            icon={playback.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            onClick={() =>
              run("Changing mute", () => deviceService.setMuted(!playback.muted))
            }
          >
            {playback.muted ? "Muted" : "Mute"}
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="flex items-end gap-6">
            <span className="readout text-[40px] leading-none font-medium tracking-tight text-ink">
              {mixerPercent({ ...playback, value: volume })}
              <span className="text-[20px] text-ink-dim">%</span>
            </span>
            <div className="mb-1.5">
              <p className="legend mb-1">Gain</p>
              <p className="readout text-[15px] text-ink">
                {formatDb(playback.db)}
              </p>
            </div>
          </div>

          <Slider
            label="Output level"
            value={volume}
            min={playback.min}
            max={playback.max}
            onChange={setVolume}
            disabled={playback.muted}
            readout={`${volume} / ${playback.max}`}
            detail={`${steps} hardware steps. Changing this changes the headset for every application, not just this one.`}
          />

          {playback.muted && (
            <Notice tone="warn" title="Output is muted">
              The level control is disabled while the headset is muted.
            </Notice>
          )}
        </div>
      </Panel>

      <Panel legend="Not available" title="What this device does not do">
        <ul className="space-y-2.5 text-[13px] text-ink-dim">
          {[
            ["Volume limiter", "No maximum-level clamp exists in the hardware."],
            ["Spatial audio", "Not a feature of this headset."],
            [
              "Software equaliser",
              "The equaliser is applied by the headset itself — see the Equaliser page.",
            ],
          ].map(([title, detail]) => (
            <li key={title} className="flex gap-3">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
              <span>
                <span className="text-ink-faint">{title}</span> — {detail}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
