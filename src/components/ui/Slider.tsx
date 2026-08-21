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
  const fill = ((value - min) / Math.max(1, max - min)) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="legend">{label}</span>
        {readout && (
          <span
            className={cn(
              "readout text-[13px]",
              disabled ? "text-ink-faint" : "text-ink",
            )}
          >
            {readout}
          </span>
        )}
      </div>
      <input
        type="range"
        className="range"
        style={{ ["--fill" as string]: `${fill}%` }}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {detail && <p className="mt-1 text-[12px] text-ink-faint">{detail}</p>}
    </div>
  );
}
