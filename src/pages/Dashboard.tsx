import { useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { StepSelector } from "@/components/ui/StepSelector";
import { Toggle } from "@/components/ui/Toggle";
import { term, useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { cn } from "@/lib/cn";
import { mixerPercent } from "@/types/device";
import type { DiscoveredDevice, Snapshot } from "@/types/device";
import { EmptyState } from "./EmptyState";

/**
 * `lit` is not decoration: the phosphor colour means "the device said this".
 * A placeholder standing in for something the headset never reported has to
 * look like the absence it is.
 */
function Reading({
  label,
  value,
  lit = true,
}: {
  label: string;
  value: string;
  lit?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="legend mb-1.5">{label}</p>
      <p
        className={cn(
          "readout truncate text-[14px]",
          lit ? "lit" : "text-ink-faint",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Present but unopenable — almost always another application holding it. */
function ConflictNotice({ device }: { device: DiscoveredDevice }) {
  const t = useT();
  const setMockMode = useDeviceStore((s) => s.setMockMode);

  return (
    <Notice
      tone="warn"
      title={t.conflict.title(device.info.name)}
      actions={
        <button
          type="button"
          onClick={() => void setMockMode(true)}
          className="text-[13px] font-medium text-brass hover:underline"
        >
          {t.conflict.useSimulatedInstead}
        </button>
      }
    >
      <p>{device.unavailable}</p>
      <p className="mt-2">{t.conflict.explain}</p>
      <p className="readout well mt-2 rounded px-2.5 py-1.5 text-[12px]">
        systemctl --user stop arctis-manager
      </p>
      <p className="mt-2 text-[12.5px]">{t.conflict.nothingChanged}</p>
      <p className="readout well mt-2 rounded px-2.5 py-1.5 text-[12px]">
        systemctl --user start arctis-manager
      </p>
    </Notice>
  );
}

/**
 * The wheel reports two levels; on its own that is a reading and nothing more.
 * Turning this on creates the two outputs those levels can actually act on.
 *
 * Off by default and never inferred: it changes the audio devices for the
 * whole session, which is not something to do on the user's behalf.
 */
function ChatMixRouting({ snapshot }: { snapshot: Snapshot }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = snapshot.chatmixRouting;

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await deviceService.setChatmixRouting(next);
    } catch (e) {
      const detail = (e as { detail?: unknown })?.detail;
      setError(typeof detail === "string" ? detail : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Toggle
        checked={active}
        onChange={(next) => void toggle(next)}
        label={t.chatmix.splitTitle}
        description={t.chatmix.splitDetail}
        disabled={busy || !snapshot.device}
        disabledReason={
          snapshot.device ? t.chatmix.splitDetail : t.chatmix.splitDisabledReason
        }
      />
      {error && (
        <Notice tone="fault" title={t.chatmix.failedTitle} onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {active && (
        <Notice tone="info" title={t.chatmix.activeTitle}>
          <p>{t.chatmix.activeBody}</p>
          <p className="mt-2 text-[12.5px]">{t.chatmix.note}</p>
        </Notice>
      )}
    </div>
  );
}

export function Dashboard({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const discovered = useDeviceStore((s) => s.discovered);
  const blocked = discovered.find((d) => d.unavailable);

  const playback = snapshot?.audio?.playback ?? null;
  const capture = snapshot?.audio?.capture ?? null;
  const sidetone = snapshot?.capabilities?.sidetone ?? null;
  const state = snapshot?.state ?? null;
  const capabilities = snapshot?.capabilities ?? null;

  const [volume, setVolume] = useDeviceValue(playback?.value ?? 0, (value) =>
    run(t.actions.settingVolume, () => deviceService.setVolume(value)),
  );

  if (!snapshot?.device) {
    return (
      <div className="h-full">
        {blocked ? (
          <div className="px-6 pb-6">
            <ConflictNotice device={blocked} />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 pb-6">
      {snapshot.hostError && (
        <Notice tone="fault" title={t.dashboard.hostErrorTitle}>
          {snapshot.hostError}
        </Notice>
      )}
      {snapshot.device.is_mock && (
        <Notice tone="info" title={t.dashboard.simulatedTitle}>
          {t.dashboard.simulatedBody}
        </Notice>
      )}
      {blocked && <ConflictNotice device={blocked} />}

      {/* Tiles of different weight: the control reached for most often is the
          widest, and the pair of mutes is a pair rather than a paragraph. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {playback && (
          <Panel
            legend={t.dashboard.controlsLegend}
            className="lg:col-span-2 xl:col-span-2"
          >
            <Slider
              label={t.dashboard.outputVolume}
              value={volume}
              min={playback.min}
              max={playback.max}
              onChange={setVolume}
              disabled={playback.muted}
              readout={`${mixerPercent({ ...playback, value: volume })}%`}
              detail={t.dashboard.hardwareSteps(playback.max - playback.min + 1)}
            />
          </Panel>
        )}

        {(playback || capture) && (
          <Panel className="xl:col-span-1">
            <div className="flex flex-col gap-2">
              {playback && (
                <Button
                  variant={playback.muted ? "primary" : "secondary"}
                  icon={playback.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  onClick={() =>
                    run(t.actions.changingMute, () =>
                      deviceService.setMuted(!playback.muted),
                    )
                  }
                >
                  {playback.muted ? t.dashboard.unmute : t.dashboard.mute}
                </Button>
              )}
              {capture && (
                <Button
                  variant={capture.muted ? "primary" : "secondary"}
                  icon={capture.muted ? <MicOff size={14} /> : <Mic size={14} />}
                  onClick={() =>
                    run(t.actions.changingMicMute, () =>
                      deviceService.setMicrophoneMuted(!capture.muted),
                    )
                  }
                >
                  {capture.muted ? t.dashboard.unmuteMic : t.dashboard.muteMic}
                </Button>
              )}
            </div>
          </Panel>
        )}

        {sidetone && (
          <Panel
            legend={t.microphone.monitoringLegend}
            title={t.dashboard.sidetone}
            className="xl:col-span-1"
          >
            <StepSelector
              label={t.microphone.level}
              options={sidetone.labels.map((l) => term(l, t))}
              value={state?.sidetone_level ?? null}
              onChange={(index) =>
                run(t.actions.settingSidetone, () => deviceService.setSidetone(index))
              }
            />
          </Panel>
        )}

        {capabilities?.chatmix && (
          <Panel
            legend={t.dashboard.mixLegend}
            className="lg:col-span-2 xl:col-span-2"
          >
            <ChatMixRouting snapshot={snapshot} />
          </Panel>
        )}

        <Panel
          legend={t.dashboard.statusLegend}
          title={t.dashboard.liveTitle}
          className="lg:col-span-2 xl:col-span-2"
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Reading
              label={t.dashboard.power}
              value={state?.powered_on ? t.dashboard.on : t.dashboard.off}
            />
            <Reading
              label={t.dashboard.sidetone}
              lit={
                capabilities?.sidetone != null && state?.sidetone_level != null
              }
              value={
                capabilities?.sidetone
                  ? state?.sidetone_level != null
                    ? term(
                        capabilities.sidetone.labels[state.sidetone_level] ??
                          String(state.sidetone_level),
                        t,
                      )
                    : t.dashboard.notReadBack
                  : t.dashboard.notSupported
              }
            />
            <Reading
              label={t.dashboard.autoShutOff}
              lit={
                capabilities?.inactive_time != null &&
                state?.inactive_minutes != null
              }
              value={
                capabilities?.inactive_time
                  ? state?.inactive_minutes != null
                    ? t.dashboard.minutes(state.inactive_minutes)
                    : t.dashboard.notReadBack
                  : t.dashboard.notSupported
              }
            />
            <Reading
              label={t.dashboard.equaliser}
              lit={
                capabilities?.equalizer != null &&
                (state?.equalizer_preset != null || state?.equalizer_db != null)
              }
              value={
                capabilities?.equalizer
                  ? state?.equalizer_preset != null
                    ? term(
                        capabilities.equalizer.preset_names[state.equalizer_preset] ??
                          t.dashboard.custom,
                        t,
                      )
                    : state?.equalizer_db
                      ? t.dashboard.custom
                      : t.dashboard.notReadBack
                  : t.dashboard.notSupported
              }
            />
          </div>
        </Panel>
      </div>

      {/* The two things the interface owes an explanation for, kept together
          and kept quiet — they are the reason the readings above look the way
          they do. */}
      <div className="max-w-[70ch] space-y-2 px-1 text-[12.5px] leading-relaxed text-ink-faint">
        {capabilities?.battery && (
          <p>{t.dashboard.batteryResolution(capabilities.battery.steps)}</p>
        )}
        <p>{t.dashboard.notReadBackExplain}</p>
      </div>
    </div>
  );
}
