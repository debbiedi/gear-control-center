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
 * A discrete selector for settings the hardware stores as steps.
 *
 * Sidetone is four positions on this headset, not a range. A 0–100 slider
 * would let the interface show 43 while the device sat on "Low" — the number
 * would be ours, not the headset's.
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
      <p className="legend mb-2">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex rounded-md border border-line bg-panel-2 p-0.5"
      >
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === index}
            disabled={disabled}
            onClick={() => onChange(index)}
            className={cn(
              "h-8 min-w-[68px] rounded-[5px] px-3 text-[13px] transition-colors",
              value === index
                ? "bg-brass font-medium text-ground"
                : "text-ink-dim hover:bg-panel-3 hover:text-ink",
              disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
