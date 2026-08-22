import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Option {
  value: string;
  label: string;
}

interface OptionListProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/**
 * A vertical pick-one list.
 *
 * This replaces the one native `<select>` the application had. WebKitGTK draws
 * a closed select's text in the colour of its `option`, which comes from the
 * system theme rather than from this stylesheet — on a dark panel the label
 * came out unreadable, and the popup is drawn by GTK where none of these
 * colours apply at all. Every other control here is already drawn by the
 * application; this one now is too.
 */
export function OptionList({
  options,
  value,
  onChange,
  label,
  className,
}: OptionListProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "well overflow-hidden rounded-md",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex w-full items-center justify-between gap-3 px-3.5 py-2.5",
              "border-b border-line text-left text-[13.5px] last:border-b-0",
              "transition-colors",
              active
                ? "bg-panel-3 font-medium text-ink"
                : "text-ink-dim hover:bg-panel-3/60 hover:text-ink",
            )}
          >
            {/* A shape as well as a colour, as everywhere else here. */}
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full",
                active ? "bg-brass" : "bg-transparent",
              )}
            />
            {option.label}
            {active && <Check size={14} className="shrink-0 text-brass" />}
          </button>
        );
      })}
    </div>
  );
}
