import { Check, Minus } from "lucide-react";
import { useT } from "@/i18n";
import { capabilityRows } from "@/lib/capabilities";
import { cn } from "@/lib/cn";
import type { Capabilities } from "@/types/device";

/**
 * The honest inventory. Unsupported entries stay on the list instead of being
 * hidden, because "why can't I find the lighting page" is a worse experience
 * than a line that says the headset has no lighting.
 */
export function CapabilityTable({ capabilities }: { capabilities: Capabilities }) {
  const t = useT();
  return (
    <ul className="divide-y divide-line">
      {capabilityRows(capabilities, t).map((row) => (
        <li
          key={row.label}
          className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border",
              row.supported
                ? "border-live/40 bg-live/10 text-live"
                : "border-line-bright bg-panel-2 text-ink-faint",
            )}
          >
            {row.supported ? <Check size={11} /> : <Minus size={11} />}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[13.5px] font-medium",
                row.supported ? "text-ink" : "text-ink-faint",
              )}
            >
              {row.label}
              <span className="sr-only">
                {` — ${row.supported ? t.device.supported : t.device.unsupported}`}
              </span>
            </p>
            <p className="selectable mt-0.5 text-[12.5px] leading-snug text-ink-dim">
              {row.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
