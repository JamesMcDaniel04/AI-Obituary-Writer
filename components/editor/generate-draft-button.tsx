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

  return (
    <div className="space-y-3">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);

            const response = await fetch(`/api/cases/${caseId}/draft`, {
              method: "POST",
            });

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
        {isPending ? "Generating draft..." : "Generate draft"}
      </Button>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
