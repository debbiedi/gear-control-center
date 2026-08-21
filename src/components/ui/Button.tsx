import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brass text-ground hover:bg-brass/90 active:bg-brass-deep active:text-ink disabled:bg-brass/40",
  secondary:
    "border border-line-bright bg-panel-2 text-ink hover:border-brass/50 hover:bg-panel-3 disabled:border-line",
  ghost: "text-ink-dim hover:bg-panel-2 hover:text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        // 36px keeps the target comfortable without turning a desktop toolbar
        // into a touch interface.
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5",
        "text-[13px] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:text-ink-faint",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
