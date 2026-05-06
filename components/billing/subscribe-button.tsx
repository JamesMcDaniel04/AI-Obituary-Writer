"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  endpoint?: "/api/stripe/checkout" | "/api/stripe/portal";
};

export function SubscribeButton({
  label = "Start 7-day free trial",
  endpoint = "/api/stripe/checkout",
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
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
        className={cn(buttonClasses.base, buttonClasses.primary, "gap-2")}
      >
        {pending ? "Opening Stripe…" : label}
        <ArrowRight className="h-4 w-4" />
      </button>
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
