import type { ReactNode } from "react";
import { BalanceMeter } from "@/components/ui/BalanceMeter";
import { SegmentedGauge } from "@/components/ui/SegmentedGauge";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { cn } from "@/lib/cn";
import { connectionLabel, connectionTone } from "@/types/device";
import type { Snapshot } from "@/types/device";

function Cell({
  legend,
  className,
  children,
}: {
  legend: string;
  className?: string;
  children: ReactNode;
}) {
  // Proportional rather than fixed: at the 1024px minimum window the four
  // cells share 800px, and fixed widths pushed the last one off the edge.
  return (
    <div className={cn("min-w-0 px-4 py-3 xl:px-5", className)}>
      <p className="legend mb-2">{legend}</p>
      {children}
    </div>
  );
}

/**
 * The persistent front panel.
 *
 * Everything here is a reading taken from the device, never a computed
 * estimate: when the headset is powered off it reports no battery level at
 * all, and this shows nothing rather than the last figure the dongle happened
 * to remember.
 */
export function InstrumentStrip({ snapshot }: { snapshot: Snapshot | null }) {
  const device = snapshot?.device ?? null;
  const state = snapshot?.state ?? null;
  const caps = snapshot?.capabilities ?? null;
  const connection = snapshot?.connection ?? "unknown";
  const battery = state?.battery ?? null;
  const chatmix = state?.chatmix ?? null;

  /** With no device attached there is nothing to call supported or not. */
  const absent = (supported: boolean) =>
    !device ? "—" : supported ? "Not reported while off" : "Not supported";

  return (
    <div className="flex shrink-0 items-stretch divide-x divide-line overflow-hidden border-b border-line bg-panel">
      <Cell legend="Device" className="flex-[1.3]">
        <p className="truncate text-[15px] font-semibold tracking-tight text-ink">
          {device?.name ?? "No device"}
        </p>
        <p className="readout mt-0.5 truncate text-[12px] text-ink-faint">
          {device?.connection ?? "—"}
        </p>
      </Cell>

      <Cell legend="Link" className="flex-[0.9]">
        <StatusLamp
          tone={connectionTone(connection)}
          label={connectionLabel(connection)}
        />
        <p className="readout mt-0.5 truncate text-[12px] text-ink-faint">
          {device
            ? state?.powered_on
              ? "Headset powered on"
              : "Headset powered off"
            : "—"}
        </p>
      </Cell>

      <Cell legend="Battery" className="flex-[1.1]">
        {caps?.battery && battery ? (
          <>
            <div className="flex items-center gap-3">
              <SegmentedGauge
                percent={battery.percent}
                steps={caps.battery.steps}
                charging={battery.charging}
              />
              <span className="readout text-[15px] font-medium text-ink">
                {battery.percent}%
              </span>
            </div>
            <p className="readout mt-0.5 truncate text-[12px] text-ink-faint">
              {battery.charging
                ? "Charging"
                : `${caps.battery.steps} reported levels`}
            </p>
          </>
        ) : (
          <p className="readout truncate text-[13px] text-ink-faint">
            {absent(caps?.battery != null)}
          </p>
        )}
      </Cell>

      <Cell legend="ChatMix" className="flex-[1.2]">
        {caps?.chatmix && chatmix ? (
          <BalanceMeter game={chatmix.game} chat={chatmix.chat} />
        ) : (
          <p className="readout truncate text-[13px] text-ink-faint">
            {absent(caps?.chatmix === true)}
          </p>
        )}
      </Cell>
    </div>
  );
}
