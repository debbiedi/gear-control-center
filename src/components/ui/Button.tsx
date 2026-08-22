import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brass text-ground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.5)] hover:bg-brass/90 active:translate-y-px active:bg-brass-deep active:text-ink disabled:bg-brass/40 disabled:shadow-none",
  secondary:
    "bg-panel-3 text-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_3px_rgba(0,0,0,0.5)] hover:bg-[#2a333a] active:translate-y-px disabled:bg-panel-2 disabled:shadow-none",
  ghost: "text-ink-dim hover:bg-panel-3 hover:text-ink",
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
