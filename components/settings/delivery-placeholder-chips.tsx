"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import {
  DELIVERY_PLACEHOLDER_META,
  DELIVERY_PLACEHOLDERS,
  type DeliveryPlaceholder,
} from "@/lib/delivery/template";
import { cn } from "@/lib/utils";

export function DeliveryPlaceholderChips() {
  const [copied, setCopied] = useState<DeliveryPlaceholder | null>(null);

  async function handleCopy(token: DeliveryPlaceholder) {
    const value = `{{${token}}}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(token);
      setTimeout(() => {
        setCopied((current) => (current === token ? null : current));
      }, 1400);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Placeholders
        </p>
        <p className="text-xs text-muted">Click to copy</p>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {DELIVERY_PLACEHOLDERS.map((token) => {
          const meta = DELIVERY_PLACEHOLDER_META[token];
          const isCopied = copied === token;

          return (
            <li key={token}>
              <button
                type="button"
                onClick={() => handleCopy(token)}
                aria-label={`Copy ${meta.label} placeholder`}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition",
                  isCopied
                    ? "border-accent/40 bg-accent-soft"
                    : "hover:border-accent/30 hover:bg-accent-soft/60",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {meta.description}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                    isCopied
                      ? "bg-accent text-white"
                      : "bg-accent-soft text-accent group-hover:bg-accent group-hover:text-white",
                  )}
                  aria-hidden
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
