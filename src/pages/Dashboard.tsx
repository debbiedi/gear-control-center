import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { BalanceMeter } from "@/components/ui/BalanceMeter";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { SegmentedGauge } from "@/components/ui/SegmentedGauge";
import { Slider } from "@/components/ui/Slider";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { StepSelector } from "@/components/ui/StepSelector";
import { term, useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import { mixerPercent } from "@/types/device";
import type { DiscoveredDevice, Snapshot } from "@/types/device";
import { EmptyState } from "./EmptyState";

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="legend mb-1">{label}</p>
      <p className="readout text-[14px] text-ink">{value}</p>
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
      <p className="readout mt-2 rounded border border-line bg-ground px-2.5 py-1.5 text-[12px]">
        systemctl --user stop arctis-manager
      </p>
      <p className="mt-2 text-[12.5px]">{t.conflict.nothingChanged}</p>
      <p className="readout mt-2 rounded border border-line bg-ground px-2.5 py-1.5 text-[12px]">
        systemctl --user start arctis-manager
      </p>
    </Notice>
  );
}

/**
 * The handful of controls worth reaching without changing page.
 *
 * Everything here writes to the device the moment it moves; nothing is staged
 * or queued, so there is no "apply" button to leave a setting in doubt.
 */
function QuickControls({ snapshot }: { snapshot: Snapshot }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const playback = snapshot.audio?.playback ?? null;
  const capture = snapshot.audio?.capture ?? null;
  const sidetone = snapshot.capabilities?.sidetone ?? null;

  const [volume, setVolume] = useDeviceValue(playback?.value ?? 0, (value) =>
    run(t.actions.settingVolume, () => deviceService.setVolume(value)),
  );

  if (!playback && !capture && !sidetone) return null;

  return (
    <Panel legend={t.dashboard.controlsLegend} title={t.dashboard.controlsTitle}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        {playback && (
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
        )}
        <div className="flex items-end gap-2">
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
      </div>

      {sidetone && (
        <div className="mt-6 border-t border-line pt-5">
          <StepSelector
            label={t.dashboard.sidetone}
            options={sidetone.labels.map((l) => term(l, t))}
            value={snapshot.state?.sidetone_level ?? null}
            onChange={(index) =>
              run(t.actions.settingSidetone, () =>
                deviceService.setSidetone(index),
              )
            }
          />
        </div>
      )}
    </Panel>
  );
}

export function Dashboard({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const discovered = useDeviceStore((s) => s.discovered);
  const blocked = discovered.find((d) => d.unavailable);

  if (!snapshot?.device) {
    return (
      <div className="h-full">
        {blocked ? (
          <div className="p-6">
            <ConflictNotice device={blocked} />
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    );
  }

  const { state, capabilities, device } = snapshot;
  const battery = state?.battery ?? null;
  const chatmix = state?.chatmix ?? null;

  return (
    <div className="space-y-4 p-6">
      {snapshot.hostError && (
        <Notice tone="fault" title={t.dashboard.hostErrorTitle}>
          {snapshot.hostError}
        </Notice>
      )}

      {device.is_mock && (
        <Notice tone="info" title={t.dashboard.simulatedTitle}>
          {t.dashboard.simulatedBody}
        </Notice>
      )}

      {blocked && <ConflictNotice device={blocked} />}

      <QuickControls snapshot={snapshot} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel legend={t.dashboard.powerLegend} title={t.dashboard.batteryTitle}>
          {capabilities?.battery && battery ? (
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <span className="readout text-[40px] leading-none font-medium tracking-tight text-ink">
                  {battery.percent}
                  <span className="text-[20px] text-ink-dim">%</span>
                </span>
                <SegmentedGauge
                  percent={battery.percent}
                  steps={capabilities.battery.steps}
                  charging={battery.charging}
                  className="mb-1.5"
                />
              </div>
              <StatusLamp
                tone={
                  battery.charging ? "live" : battery.percent <= 25 ? "warn" : "idle"
                }
                label={
                  battery.charging
                    ? t.dashboard.chargingOverUsb
                    : battery.percent <= 25
                      ? t.dashboard.lowChargeSoon
                      : t.dashboard.runningOnBattery
                }
              />
              <p className="text-[12.5px] leading-snug text-ink-dim">
                {t.dashboard.batteryResolution(capabilities.battery.steps)}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-ink-dim">
              {capabilities?.battery
                ? t.dashboard.batteryOff
                : t.dashboard.batteryUnsupported}
            </p>
          )}
        </Panel>

        <Panel legend={t.dashboard.mixLegend} title={t.dashboard.chatmixTitle}>
          {capabilities?.chatmix && chatmix ? (
            <div className="space-y-4">
              <BalanceMeter game={chatmix.game} chat={chatmix.chat} />
              <div className="grid grid-cols-2 gap-4">
                <Reading label={t.dashboard.game} value={`${chatmix.game} / 100`} />
                <Reading label={t.dashboard.chat} value={`${chatmix.chat} / 100`} />
              </div>
              <p className="text-[12.5px] leading-snug text-ink-dim">
                {t.dashboard.chatmixExplain}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-ink-dim">
              {capabilities?.chatmix
                ? t.dashboard.chatmixOff
                : t.dashboard.chatmixUnsupported}
            </p>
          )}
        </Panel>
      </div>

      <Panel
        legend={t.dashboard.statusLegend}
        title={t.dashboard.liveTitle}
        description={t.dashboard.liveDescription}
      >
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          <Reading
            label={t.dashboard.power}
            value={state?.powered_on ? t.dashboard.on : t.dashboard.off}
          />
          <Reading
            label={t.dashboard.sidetone}
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
            value={
              capabilities?.equalizer
                ? state?.equalizer_preset != null
                  ? term(
                      capabilities.equalizer.preset_names[
                        state.equalizer_preset
                      ] ?? t.dashboard.custom,
                      t,
                    )
                  : state?.equalizer_db
                    ? t.dashboard.custom
                    : t.dashboard.notReadBack
                : t.dashboard.notSupported
            }
          />
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-snug text-ink-dim">
          {t.dashboard.notReadBackExplain}
        </p>
      </Panel>
    </div>
  );
}
