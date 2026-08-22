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

/**
 * One face of the panel.
 *
 * Separation is elevation, not outline: the surface catches light along its
 * top edge and sits on a soft shadow. An outline on every card made the page
 * read as a list of identical boxes with nothing more important than anything
 * else.
 */
export function Panel({
  legend,
  title,
  description,
  actions,
  className,
  children,
}: PanelProps) {
  return (
    <section className={cn("face", className)}>
      {(legend || title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
          <div className="min-w-0">
            {legend && <p className="legend mb-1.5">{legend}</p>}
            {title && (
              <h2 className="display truncate text-[16px] text-ink">{title}</h2>
            )}
            {description && (
              <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-dim">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn("px-5 pb-5", !(legend || title || actions) && "pt-5")}>
        {children}
      </div>
    </section>
  );
}
