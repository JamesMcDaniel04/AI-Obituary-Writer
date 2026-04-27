import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "panel rounded-[2rem] border border-border p-6 md:p-8",
        className,
      )}
      {...props}
    />
  );
}
