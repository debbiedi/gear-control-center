import type { ReactNode } from "react";
import { Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n";

interface NoticeProps {
  tone?: "info" | "warn" | "fault";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
}

const TONE = {
  info: { border: "border-line-bright", text: "text-ink-dim", Icon: Info },
  warn: { border: "border-warn/40", text: "text-warn", Icon: TriangleAlert },
  fault: { border: "border-fault/40", text: "text-fault", Icon: TriangleAlert },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  actions,
  onDismiss,
}: NoticeProps) {
  const t = useT();
  const { border, text, Icon } = TONE[tone];

  return (
    <div
      className={cn("rounded-panel border bg-panel-2 px-4 py-3.5", border)}
      role={tone === "info" ? "status" : "alert"}
    >
      <div className="flex items-start gap-3">
        <Icon size={16} className={cn("mt-0.5 shrink-0", text)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] font-semibold", text)}>{title}</p>
          {children && (
            <div className="selectable mt-1 text-[13px] text-ink-dim">
              {children}
            </div>
          )}
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.app.dismiss}
            className="-mr-1 -mt-1 rounded p-1 text-ink-faint hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
