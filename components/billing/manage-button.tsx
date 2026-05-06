"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ManageButton({ label = "Manage subscription" }: { label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not open portal.");
      }
      window.location.href = data.url;
    } catch (cause) {
      setPending(false);
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={cn(buttonClasses.base, buttonClasses.secondary)}
      >
        {pending ? "Opening Stripe…" : label}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
