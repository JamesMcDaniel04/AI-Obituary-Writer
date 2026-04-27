"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SendLinkFormProps = {
  caseId: string;
  enabled: boolean;
};

export function SendLinkForm({
  caseId,
  enabled,
}: Readonly<SendLinkFormProps>) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <p className="text-xs leading-6 text-muted">
        Email sending is off. Set{" "}
        <code className="rounded bg-white/70 px-1 py-0.5">RESEND_API_KEY</code>{" "}
        and{" "}
        <code className="rounded bg-white/70 px-1 py-0.5">
          RESEND_FROM_EMAIL
        </code>{" "}
        to enable one-click delivery.
      </p>
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) return;

    startTransition(async () => {
      setStatus({ kind: "idle" });

      const response = await fetch(`/api/cases/${caseId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: body?.error ?? "Unable to send the link.",
        });
        return;
      }

      setStatus({ kind: "success", message: `Link sent to ${email.trim()}.` });
      setEmail("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Email the link directly
        </span>
        <Input
          type="email"
          required
          name="to"
          placeholder="family@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isPending}
        />
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Email link"}
      </Button>
      {status.kind === "success" ? (
        <p className="text-sm text-foreground">{status.message}</p>
      ) : null}
      {status.kind === "error" ? (
        <p className="text-sm text-red-700">{status.message}</p>
      ) : null}
    </form>
  );
}
