import { cn } from "@/lib/cn";

interface SegmentedGaugeProps {
  percent: number;
  /** Distinct levels the device can report, including empty. */
  steps: number;
  charging?: boolean;
  className?: string;
}

/**
 * A battery gauge drawn at the resolution the hardware actually reports.
 *
 * The Arctis 7+ answers with one of five levels, so this renders four
 * segments — never a continuous bar. Peripheral software habitually smooths
 * this into a moving percentage; that number would be invented, and an owner
 * who watched it sit at exactly 75% for an hour would rightly stop trusting
 * the rest of the readings.
 */
export function SegmentedGauge({
  percent,
  steps,
  charging = false,
  className,
}: SegmentedGaugeProps) {
  const segments = Math.max(1, steps - 1);
  const filled = Math.round((percent / 100) * segments);
  const low = percent <= 25 && !charging;

  return (
    <div
      className={cn("flex items-center gap-[3px]", className)}
      role="meter"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Battery ${percent}%${charging ? ", charging" : ""}`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-4 w-2 rounded-[2px] border transition-colors",
            i < filled
              ? charging
                ? "border-live/60 bg-live"
                : low
                  ? "border-warn/60 bg-warn"
                  : "border-brass/60 bg-brass"
              : "border-line-bright bg-transparent",
          )}
        />
      ))}
    </div>
  );
}
