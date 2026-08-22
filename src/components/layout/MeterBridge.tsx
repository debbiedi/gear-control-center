import type { ReactNode } from "react";
import { BalanceMeter } from "@/components/ui/BalanceMeter";
import { SegmentedGauge } from "@/components/ui/SegmentedGauge";
import { StatusLamp } from "@/components/ui/StatusLamp";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";
import { connectionLabel, connectionTone } from "@/types/device";
import type { Snapshot } from "@/types/device";

function Region({
  legend,
  className,
  children,
}: {
  legend: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 px-6 py-5", className)}>
      <p className="legend mb-3">{legend}</p>
      {children}
    </div>
  );
}

/**
 * The meter bridge — the instrument at the top of the window.
 *
 * It is the hero, and it is one piece rather than three: the battery, the
 * wheel and the connection used to appear here *and* as cards below *and* in
 * the sidebar, which is repetition without hierarchy. Everything the headset
 * is doing right now is read here, once, at a size worth reading.
 *
 * Every value is a reading taken from the device, never a computed estimate:
 * when the headset is powered off it reports no battery level at all, and this
 * shows nothing rather than the last figure the dongle happened to remember.
 */
export function MeterBridge({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const device = snapshot?.device ?? null;
  const state = snapshot?.state ?? null;
  const caps = snapshot?.capabilities ?? null;
  const connection = snapshot?.connection ?? "unknown";
  const battery = state?.battery ?? null;
  const chatmix = state?.chatmix ?? null;
  const percent = useCountUp(battery?.percent ?? 0);

  /** With no device attached there is nothing to call supported or not. */
  const absent = (supported: boolean) =>
    !device
      ? "—"
      : supported
        ? t.strip.notReportedWhileOff
        : t.strip.notSupported;

  return (
    <div className="shrink-0 px-6 pb-2 pt-5">
      <div className="face flex items-stretch divide-x divide-line">
        <Region legend={t.strip.device} className="flex-[1.3]">
          <p className="display truncate text-[17px] text-ink">
            {device?.name ?? t.strip.noDevice}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <StatusLamp
              tone={connectionTone(connection)}
              label={connectionLabel(connection, t)}
            />
            <span className="readout truncate text-[12px] text-ink-faint">
              {device?.connection ?? "—"}
            </span>
          </div>
        </Region>

        <Region legend={t.strip.battery} className="flex-[1.2]">
          {caps?.battery && battery ? (
            <>
              <div className="flex items-center gap-4">
                <SegmentedGauge
                  percent={battery.percent}
                  steps={caps.battery.steps}
                  charging={battery.charging}
                  size="lg"
                />
                <span className="readout lit text-[34px] leading-none">
                  {percent}
                  <span className="text-[18px] text-ink-dim">%</span>
                </span>
              </div>
              <p className="readout mt-2.5 truncate text-[12px] text-ink-faint">
                {battery.charging
                  ? t.dashboard.chargingOverUsb
                  : t.strip.reportedLevels(caps.battery.steps)}
              </p>
            </>
          ) : (
            <p className="readout pt-2 text-[13px] text-ink-faint">
              {absent(caps?.battery != null)}
            </p>
          )}
        </Region>

        <Region legend={t.strip.chatmix} className="flex-[1.3]">
          {caps?.chatmix && chatmix ? (
            <BalanceMeter game={chatmix.game} chat={chatmix.chat} size="lg" />
          ) : (
            <p className="readout pt-2 text-[13px] text-ink-faint">
              {absent(caps?.chatmix === true)}
            </p>
          )}
        </Region>
      </div>
    </div>
  );
}
