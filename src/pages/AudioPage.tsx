import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { formatDb, mixerPercent, type Snapshot } from "@/types/device";

export function AudioPage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const playback = snapshot?.audio?.playback ?? null;

  const [volume, setVolume] = useDeviceValue(playback?.value ?? 0, (value) =>
    run(t.actions.settingVolume, () => deviceService.setVolume(value)),
  );

  if (!snapshot?.device) {
    return (
      <div className="p-6">
        <Notice tone="info" title={t.audio.noDeviceTitle}>
          {t.audio.noDeviceBody}
        </Notice>
      </div>
    );
  }

  if (!playback) {
    return (
      <div className="p-6">
        <Notice tone="warn" title={t.audio.noControlTitle}>
          {snapshot.audioError
            ? t.audio.cardUnreadable
            : t.audio.noHardwareVolume}
        </Notice>
      </div>
    );
  }

  const steps = playback.max - playback.min + 1;

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend={t.audio.outputLegend}
        title={t.audio.volumeTitle}
        description={t.audio.volumeDescription}
        actions={
          <Button
            variant={playback.muted ? "primary" : "secondary"}
            icon={playback.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            onClick={() =>
              run(t.actions.changingMute, () =>
              deviceService.setMuted(!playback.muted),
            )
            }
          >
            {playback.muted ? t.audio.muted : t.audio.mute}
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
              <p className="legend mb-1">{t.audio.gain}</p>
              <p className="readout text-[15px] text-ink">
                {formatDb(playback.db)}
              </p>
            </div>
          </div>

          <Slider
            label={t.audio.outputLevel}
            value={volume}
            min={playback.min}
            max={playback.max}
            onChange={setVolume}
            disabled={playback.muted}
            readout={`${volume} / ${playback.max}`}
            detail={t.audio.levelDetail(steps)}
          />

          {playback.muted && (
            <Notice tone="warn" title={t.audio.mutedTitle}>
              {t.audio.mutedBody}
            </Notice>
          )}
        </div>
      </Panel>

      <Panel
        legend={t.audio.notAvailableLegend}
        title={t.audio.notAvailableTitle}
      >
        <ul className="space-y-2.5 text-[13px] text-ink-dim">
          {t.audio.absent.map(({ name, detail }) => (
            <li key={name} className="flex gap-3">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
              <span>
                <span className="text-ink-faint">{name}</span> — {detail}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
