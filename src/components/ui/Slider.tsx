import { cn } from "@/lib/cn";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** Right-hand reading — the device's own number, not a restatement. */
  readout?: string;
  /** Small print under the track: range, resolution, units. */
  detail?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Past this many marks the row stops being countable and becomes a smear, so
 * it fades out rather than pretending otherwise.
 */
const TOO_DENSE = 140;

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  readout,
  detail,
  disabled = false,
  className,
}: SliderProps) {
  const span = Math.max(1, max - min);
  const fill = ((value - min) / span) * 100;

  // The signature: the track carries one mark per position the hardware
  // accepts. Seventy-eight of them cost one gradient, not seventy-eight
  // elements.
  const marks = Math.max(1, Math.round(span / step));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <span className="legend">{label}</span>
        {readout && (
          <span
            className={cn(
              "readout text-[14px]",
              disabled ? "text-ink-faint" : "lit",
            )}
          >
            {readout}
          </span>
        )}
      </div>
      <input
        type="range"
        className="range"
        style={{
          ["--fill" as string]: `${fill}%`,
          ["--tick-step" as string]: `${100 / marks}%`,
          ["--tick-opacity" as string]: marks > TOO_DENSE ? "0" : "1",
        }}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {detail && (
        <p className="mt-2 text-[12px] text-ink-faint">{detail}</p>
      )}
    </div>
  );
}
