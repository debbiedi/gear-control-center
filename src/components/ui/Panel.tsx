import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  /** Screen-printed label above the panel, as on a hardware front plate. */
  legend?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({
  legend,
  title,
  description,
  actions,
  className,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-panel border border-line bg-panel",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      {(legend || title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {legend && <p className="legend mb-1">{legend}</p>}
            {title && (
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[13px] text-ink-dim">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
