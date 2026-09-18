import { Notice } from "@/components/ui/Notice";
import { ColorField } from "@/components/ui/ColorField";
import { OptionList } from "@/components/ui/OptionList";
import { Panel } from "@/components/ui/Panel";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { term, useT } from "@/i18n";
import { useDeviceValue } from "@/lib/useDeviceValue";
import { deviceService } from "@/services/device";
import { useDeviceStore } from "@/stores/deviceStore";
import type { Rgb, Snapshot } from "@/types/device";

/** Shown for a zone the device has not been told a colour for yet. */
const UNSET: Rgb = [0, 0, 0];

export function LightingPage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const run = useDeviceStore((s) => s.run);
  const lighting = snapshot?.capabilities?.lighting ?? null;
  const state = snapshot?.state?.lighting ?? null;

  const [dimSeconds, setDimSeconds] = useDeviceValue(
    state?.dim_seconds ?? 0,
    (value) =>
      run(t.actions.settingLighting, () => deviceService.setDimTimer(value)),
  );

  if (!snapshot?.device || !lighting) {
    return (
      <div className="p-6">
        <Notice tone="info" title={t.lighting.title}>
          {t.lighting.absent}
        </Notice>
      </div>
    );
  }

  const reactive = state?.reactive_color ?? null;

  return (
    <div className="space-y-4 p-6">
      <Panel title={t.lighting.effect} description={t.lighting.effectHint}>
        <OptionList
          label={t.lighting.effect}
          value={state?.effect !== null && state?.effect !== undefined
            ? String(state.effect)
            : ""}
          onChange={(value) =>
            void run(t.actions.settingLighting, () =>
              deviceService.setLightingEffect(Number(value)),
            )
          }
          options={lighting.effects.map((name, index) => ({
            value: String(index),
            label: term(name, t),
          }))}
        />
      </Panel>

      <Panel title={t.lighting.zones} description={t.lighting.lede}>
        <div className="space-y-6">
          {lighting.zones.map((zone, index) => (
            <ColorField
              key={zone}
              label={term(zone, t)}
              value={state?.colors[index] ?? UNSET}
              onChange={(rgb) =>
                void run(t.actions.settingLighting, () =>
                  deviceService.setLightingColor(index, rgb),
                )
              }
            />
          ))}
        </div>
      </Panel>

      {lighting.reactive && (
        <Panel title={t.lighting.reactive} description={t.lighting.reactiveHint}>
          <div className="space-y-5">
            <Toggle
              label={t.lighting.reactive}
              checked={reactive !== null}
              onChange={(on) =>
                void run(t.actions.settingLighting, () =>
                  deviceService.setReactiveColor(on ? [255, 255, 255] : null),
                )
              }
            />
            {reactive && (
              <ColorField
                label={t.lighting.reactive}
                value={reactive}
                onChange={(rgb) =>
                  void run(t.actions.settingLighting, () =>
                    deviceService.setReactiveColor(rgb),
                  )
                }
              />
            )}
          </div>
        </Panel>
      )}

      <Panel title={t.lighting.dim}>
        <Slider
          label={t.lighting.dim}
          value={dimSeconds}
          min={0}
          max={1200}
          step={10}
          onChange={setDimSeconds}
          readout={dimSeconds === 0 ? t.lighting.reactiveOff : t.lighting.seconds(dimSeconds)}
          detail={t.lighting.dimHint}
        />
      </Panel>
    </div>
  );
}
