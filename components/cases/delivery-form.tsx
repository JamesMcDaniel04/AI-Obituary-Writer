"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DeliveryActionResult = {
  error?: string;
  testSentTo?: string;
  values?: {
    recipient?: string;
    subject?: string;
    body?: string;
  };
};

type DeliveryFormProps = {
  caseId: string;
  defaultSubject: string;
  defaultBody: string;
  testRecipient: string | null;
  emailEnabled: boolean;
  action: (
    state: DeliveryActionResult,
    formData: FormData,
  ) => Promise<DeliveryActionResult>;
};

const initialState: DeliveryActionResult = {};

export function DeliveryForm({
  caseId,
  defaultSubject,
  defaultBody,
  testRecipient,
  emailEnabled,
  action,
}: DeliveryFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const recipientValue = state.values?.recipient ?? "";
  const subjectValue = state.values?.subject ?? defaultSubject;
  const bodyValue = state.values?.body ?? defaultBody;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="rounded-[1.5rem] border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-foreground"
        >
          <p className="font-semibold">We couldn't send that email.</p>
          <p className="mt-1 text-muted">{state.error}</p>
        </div>
      ) : null}
      {state.testSentTo ? (
        <div
          role="status"
          className="rounded-[1.5rem] border border-success/40 bg-success/10 p-4 text-sm leading-6 text-foreground"
        >
          <p className="font-semibold">Test sent.</p>
          <p className="mt-1 text-muted">
            A copy went to{" "}
            <span className="font-medium text-foreground">
              {state.testSentTo}
            </span>
            . Open it to verify the layout before sending to the family.
          </p>
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          Recipient email
        </span>
        <Input
          name="recipient"
          type="email"
          placeholder="family@example.com"
          defaultValue={recipientValue}
          inputMode="email"
          autoComplete="email"
        />
        <span className="block text-xs text-muted">
          Required for the real send. Test sends use your account email.
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Subject</span>
        <Input name="subject" required defaultValue={subjectValue} />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">Body</span>
        <Textarea
          name="body"
          required
          defaultValue={bodyValue}
          className="min-h-56 font-serif text-sm leading-7 sm:min-h-72"
        />
      </label>

      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/60 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Preview before sending
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {testRecipient
            ? `Send a test to ${testRecipient} to check the layout, links, and PDF attachment first.`
            : "Add an email to your profile to enable test sends."}
        </p>
        <div className="mt-3">
          <Button
            type="submit"
            name="intent"
            value="test"
            variant="secondary"
            disabled={!emailEnabled || !testRecipient || pending}
          >
            {pending ? "Sending…" : "Send test to me"}
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-2 mt-2 flex flex-wrap items-center gap-3 border-t border-border bg-surface-strong/95 px-2 py-3 backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-2">
        <Button
          type="submit"
          name="intent"
          value="send"
          disabled={!emailEnabled || pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Sending…" : "Send & mark delivered"}
        </Button>
        <Link
          href={`/cases/${caseId}`}
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
