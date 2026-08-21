import { cn } from "@/lib/cn";

export type Tone = "live" | "warn" | "fault" | "idle";

const TONE_DOT: Record<Tone, string> = {
  live: "bg-live shadow-[0_0_0_3px_rgba(79,196,138,0.14)]",
  warn: "bg-warn shadow-[0_0_0_3px_rgba(242,136,75,0.14)]",
  fault: "bg-fault shadow-[0_0_0_3px_rgba(229,89,94,0.14)]",
  idle: "bg-ink-faint",
};

const TONE_TEXT: Record<Tone, string> = {
  live: "text-live",
  warn: "text-warn",
  fault: "text-fault",
  idle: "text-ink-dim",
};

/**
 * A state indicator. The label is not optional: colour alone never carries
 * meaning here, both for colour-blind users and because "green dot" means
 * nothing to someone who has not learned this interface yet.
 */
export function StatusLamp({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", TONE_DOT[tone])}
      />
      <span className={cn("text-[13px] font-medium", TONE_TEXT[tone])}>
        {label}
      </span>
    </span>
  );
}
