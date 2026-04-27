import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const buttonClasses = {
  base: "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "border border-border bg-surface-strong text-foreground hover:bg-white",
  ghost: "text-muted hover:bg-accent-soft hover:text-foreground",
  danger: "bg-foreground text-white hover:opacity-90",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = "button", variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClasses.base,
        buttonClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
