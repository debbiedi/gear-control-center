import { cn } from "@/lib/cn";

interface StepSelectorProps {
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A detented selector for settings the hardware stores as steps.
 *
 * Sidetone is four positions on this headset, not a range. A 0–100 slider
 * would let the interface show 43 while the device sat on "Low" — the number
 * would be ours, not the headset's. The notches between the positions are the
 * same claim made visually.
 */
export function StepSelector({
  options,
  value,
  onChange,
  label,
  disabled = false,
  className,
}: StepSelectorProps) {
  return (
    <div className={className}>
      <p className="legend mb-2.5">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="well inline-flex flex-wrap rounded-md p-1"
      >
        {options.map((option, index) => (
          <div key={option} className="flex items-center">
            {index > 0 && (
              // A detent between positions: this control clicks, it does not
              // slide.
              <span aria-hidden className="h-4 w-px bg-line-bright/60" />
            )}
            <button
              type="button"
              role="radio"
              aria-checked={value === index}
              disabled={disabled}
              onClick={() => onChange(index)}
              className={cn(
                "h-8 min-w-[56px] rounded-[5px] px-2.5 text-[13px] transition-colors",
                value === index
                  ? "bg-brass font-medium text-ground shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                  : "text-ink-dim hover:bg-panel-3 hover:text-ink",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {option}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
