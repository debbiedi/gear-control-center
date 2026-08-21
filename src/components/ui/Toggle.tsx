import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /**
   * Shown in place of the description when disabled. A control that cannot act
   * has to say why — a greyed-out switch with no explanation reads as a bug.
   */
  disabledReason?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  disabledReason,
}: ToggleProps) {
  const hint = disabled ? (disabledReason ?? description) : description;

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p
          className={cn(
            "text-[14px] font-medium",
            disabled ? "text-ink-faint" : "text-ink",
          )}
        >
          {label}
        </p>
        {hint && <p className="mt-0.5 text-[13px] text-ink-dim">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-brass bg-brass"
            : "border-line-bright bg-panel-3",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-[left]",
            checked ? "left-[24px] bg-ground" : "left-[3px] bg-ink-dim",
          )}
        />
      </button>
    </div>
  );
}
