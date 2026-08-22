import { cn } from "@/lib/cn";

interface SegmentedGaugeProps {
  percent: number;
  /** Distinct levels the device can report, including empty. */
  steps: number;
  charging?: boolean;
  /** Bigger on the meter bridge than beside a line of text. */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Beyond this many levels a device is reporting a real percentage, and drawing
 * a hundred segments would be both unreadable and a misrepresentation of what
 * it said. Some headsets in the same family do report percentages.
 */
const CONTINUOUS_ABOVE = 20;

const BAR = {
  sm: { h: "h-4", w: "w-2", gap: "gap-[3px]", track: "h-4 w-[52px]" },
  lg: { h: "h-9", w: "w-3.5", gap: "gap-[5px]", track: "h-9 w-[104px]" },
};

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
  size = "sm",
  className,
}: SegmentedGaugeProps) {
  const segments = Math.max(1, steps - 1);
  const filled = Math.round((percent / 100) * segments);
  const low = percent <= 25 && !charging;
  const s = BAR[size];
  const tone = charging
    ? "bg-live shadow-[0_0_10px_rgba(79,196,138,0.35)]"
    : low
      ? "bg-warn shadow-[0_0_10px_rgba(242,136,75,0.3)]"
      : "bg-brass shadow-[0_0_10px_rgba(217,164,65,0.3)]";

  if (steps > CONTINUOUS_ABOVE) {
    return (
      <div
        className={cn("well overflow-hidden rounded-[4px]", s.track, className)}
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Battery ${percent}%${charging ? ", charging" : ""}`}
      >
        <span
          className={cn("block h-full transition-[width] duration-500", tone)}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("well inline-flex items-center rounded-[4px] p-[3px]", s.gap, className)}
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
            "rounded-[2px] transition-colors duration-300",
            s.h,
            s.w,
            i < filled ? tone : "bg-[#141a1d]",
          )}
          // Lighting up in order reads as filling rather than flashing.
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}
