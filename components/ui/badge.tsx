import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  tone?: "default" | "success" | "warning";
  className?: string;
};

export function Badge({
  children,
  tone = "default",
  className,
}: BadgeProps) {
  const tones = {
    default: "bg-accent-soft text-accent",
    success: "bg-emerald-100 text-success",
    warning: "bg-amber-100 text-warning",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
