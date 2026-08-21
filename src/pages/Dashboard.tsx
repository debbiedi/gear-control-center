import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { BalanceMeter } from "@/components/ui/BalanceMeter";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { StepSelector } from "@/components/ui/StepSelector";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { mixerPercent } from "@/types/device";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { SegmentedGauge } from "@/components/ui/SegmentedGauge";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { useDeviceStore } from "@/stores/deviceStore";
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
  const setMockMode = useDeviceStore((s) => s.setMockMode);

  return (
    <Notice
      tone="warn"
      title={`${device.info.name} is connected but cannot be opened`}
      actions={
        <button
          type="button"
          onClick={() => void setMockMode(true)}
          className="text-[13px] font-medium text-brass hover:underline"
        >
          Work with a simulated device instead
        </button>
      }
    >
      <p>{device.unavailable}</p>
      <p className="mt-2">
        Another application is holding the control interface. On this system that
        is usually a background service; stopping it releases the headset:
      </p>
      <p className="readout mt-2 rounded border border-line bg-ground px-2.5 py-1.5 text-[12px]">
        systemctl --user stop arctis-manager
      </p>
      <p className="mt-2 text-[12.5px]">
        Nothing on your system has been changed — run that yourself if you want
        this application to take over, and re-enable it later with{" "}
        <span className="readout">systemctl --user start arctis-manager</span>.
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
  const run = useDeviceStore((s) => s.run);
  const playback = snapshot.audio?.playback ?? null;
  const capture = snapshot.audio?.capture ?? null;
  const sidetone = snapshot.capabilities?.sidetone ?? null;

  const [volume, setVolume] = useDeviceValue(playback?.value ?? 0, (value) =>
    run("Setting the volume", () => deviceService.setVolume(value)),
  );

  if (!playback && !capture && !sidetone) return null;

  return (
    <Panel legend="Controls" title="Quick controls">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        {playback && (
          <Slider
            label="Output volume"
            value={volume}
            min={playback.min}
            max={playback.max}
            onChange={setVolume}
            disabled={playback.muted}
            readout={`${mixerPercent({ ...playback, value: volume })}%`}
            detail={`${playback.max - playback.min + 1} hardware steps`}
          />
        )}
        <div className="flex items-end gap-2">
          {playback && (
            <Button
              variant={playback.muted ? "primary" : "secondary"}
              icon={playback.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              onClick={() =>
                run("Changing mute", () => deviceService.setMuted(!playback.muted))
              }
            >
              {playback.muted ? "Unmute" : "Mute"}
            </Button>
          )}
          {capture && (
            <Button
              variant={capture.muted ? "primary" : "secondary"}
              icon={capture.muted ? <MicOff size={14} /> : <Mic size={14} />}
              onClick={() =>
                run("Changing the microphone mute", () =>
                  deviceService.setMicrophoneMuted(!capture.muted),
                )
              }
            >
              {capture.muted ? "Unmute mic" : "Mute mic"}
            </Button>
          )}
        </div>
      </div>

      {sidetone && (
        <div className="mt-6 border-t border-line pt-5">
          <StepSelector
            label="Sidetone"
            options={sidetone.labels}
            value={snapshot.state?.sidetone_level ?? null}
            onChange={(index) =>
              run("Setting sidetone", () => deviceService.setSidetone(index))
            }
          />
        </div>
      )}
    </Panel>
  );
}

export function Dashboard({ snapshot }: { snapshot: Snapshot | null }) {
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
        <Notice tone="fault" title="Hardware access unavailable">
          {snapshot.hostError}
        </Notice>
      )}

      {device.is_mock && (
        <Notice tone="info" title="Simulated device">
          These readings are generated by the application, not by a headset.
          Turn this off in Settings once real hardware is connected.
        </Notice>
      )}

      {blocked && <ConflictNotice device={blocked} />}

      <QuickControls snapshot={snapshot} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel legend="Power" title="Battery">
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
                tone={battery.charging ? "live" : battery.percent <= 25 ? "warn" : "idle"}
                label={
                  battery.charging
                    ? "Charging over USB"
                    : battery.percent <= 25
                      ? "Low — charge soon"
                      : "Running on battery"
                }
              />
              <p className="text-[12.5px] leading-snug text-ink-dim">
                The headset reports {capabilities.battery.steps} levels rather
                than a percentage, so this figure moves in steps. It is what the
                device sent, not an estimate.
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-ink-dim">
              {capabilities?.battery
                ? "The headset is switched off, so it is not reporting a battery level."
                : "This device does not report a battery level."}
            </p>
          )}
        </Panel>

        <Panel legend="Mix" title="ChatMix">
          {capabilities?.chatmix && chatmix ? (
            <div className="space-y-4">
              <BalanceMeter game={chatmix.game} chat={chatmix.chat} />
              <div className="grid grid-cols-2 gap-4">
                <Reading label="Game" value={`${chatmix.game} / 100`} />
                <Reading label="Chat" value={`${chatmix.chat} / 100`} />
              </div>
              <p className="text-[12.5px] leading-snug text-ink-dim">
                The dial is on the headset itself. This shows where it is set;
                it cannot be moved from here.
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-ink-dim">
              {capabilities?.chatmix
                ? "The headset is switched off, so the dial position is not being reported."
                : "This device has no ChatMix dial."}
            </p>
          )}
        </Panel>
      </div>

      <Panel
        legend="Status"
        title="Live readings"
        description="Values as last received from the device."
      >
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          <Reading label="Power" value={state?.powered_on ? "On" : "Off"} />
          <Reading
            label="Sidetone"
            value={
              capabilities?.sidetone
                ? state?.sidetone_level != null
                  ? (capabilities.sidetone.labels[state.sidetone_level] ??
                    String(state.sidetone_level))
                  : "Not read back"
                : "Not supported"
            }
          />
          <Reading
            label="Auto shut-off"
            value={
              capabilities?.inactive_time
                ? state?.inactive_minutes != null
                  ? `${state.inactive_minutes} min`
                  : "Not read back"
                : "Not supported"
            }
          />
          <Reading
            label="Equaliser"
            value={
              capabilities?.equalizer
                ? state?.equalizer_preset != null
                  ? (capabilities.equalizer.preset_names[state.equalizer_preset] ??
                    "Custom")
                  : state?.equalizer_db
                    ? "Custom"
                    : "Not read back"
                : "Not supported"
            }
          />
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-snug text-ink-dim">
          "Not read back" means the headset accepts the setting but offers no way
          to ask for its current value. This build shows what it was told, and
          shows nothing after a reconnect rather than guessing.
        </p>
      </Panel>
    </div>
  );
}
