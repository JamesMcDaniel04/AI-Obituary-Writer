"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type GenerateDraftButtonProps = {
  caseId: string;
};

export function GenerateDraftButton({ caseId }: GenerateDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  let buttonLabel: string;
  if (redirecting) {
    buttonLabel = "Opening Stripe…";
  } else if (isPending) {
    buttonLabel = "Generating draft...";
  } else {
    buttonLabel = "Generate draft";
  }

  return (
    <div className="space-y-3">
      <Button
        disabled={isPending || redirecting}
        onClick={() =>
          startTransition(async () => {
            setError(null);

            const response = await fetch(`/api/cases/${caseId}/draft`, {
              method: "POST",
            });

            if (response.status === 402) {
              const body = (await response.json().catch(() => null)) as
                | { error?: string; paymentRequired?: boolean }
                | null;
              setError(
                body?.error ??
                  "Start your free trial to generate this obituary.",
              );
              setRedirecting(true);
              try {
                const checkout = await fetch("/api/stripe/checkout", {
                  method: "POST",
                });
                const data = (await checkout.json().catch(() => ({}))) as {
                  url?: string;
                  error?: string;
                };
                if (!checkout.ok || !data.url) {
                  throw new Error(
                    data.error ?? "Could not start checkout.",
                  );
                }
                globalThis.location.href = data.url;
              } catch (cause) {
                setRedirecting(false);
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not start checkout.",
                );
              }
              return;
            }

            if (!response.ok) {
              const body = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;

              setError(body?.error ?? "Unable to generate the obituary draft.");
              return;
            }

            router.refresh();
          })
        }
      >
        {buttonLabel}
      </Button>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
