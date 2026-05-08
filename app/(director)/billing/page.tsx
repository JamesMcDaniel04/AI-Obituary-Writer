import { Card } from "@/components/ui/card";
import { ManageButton } from "@/components/billing/manage-button";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { requireAppSession } from "@/lib/auth/session";
import { getSubscriptionState } from "@/lib/auth/subscription";
import { FH_PLAN_PRICE_USD, FH_TRIAL_DAYS } from "@/lib/stripe/server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ checkout?: string }>;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAppSession();
  const state = getSubscriptionState(session.profile);
  const params = await searchParams;
  const justCheckedOut = params.checkout === "success";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Card className="fade-up space-y-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Billing
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Funeral home subscription
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            ${FH_PLAN_PRICE_USD}/month per funeral home, billed by Stripe.
            Includes a {FH_TRIAL_DAYS}-day free trial. Cancel anytime from the
            customer portal.
          </p>
        </div>

        {state.isAdmin ? (
          <AdminPanel />
        ) : justCheckedOut && !state.hasAccess ? (
          <ProcessingPanel />
        ) : state.hasAccess ? (
          <ActivePanel state={state} />
        ) : (
          <SubscribePanel state={state} />
        )}
      </Card>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
      <p className="text-sm font-medium text-foreground">
        Billing is not required for admin accounts.
      </p>
      <p className="mt-2 text-xs leading-6 text-muted">
        Admins have full workspace access independent of the funeral-home
        subscription.
      </p>
    </div>
  );
}

function ProcessingPanel() {
  return (
    <>
      {/* Stripe redirects back faster than the webhook fires; refresh until status flips. */}
      <meta httpEquiv="refresh" content="4" />
      <div className="rounded-[1.5rem] border border-accent/30 bg-accent-soft p-5">
        <p className="text-sm font-medium text-foreground">
          Welcome — your subscription is activating.
        </p>
        <p className="mt-2 text-xs leading-6 text-muted">
          This page will refresh in a few seconds while Stripe finalizes your
          subscription.
        </p>
      </div>
    </>
  );
}

function ActivePanel({
  state,
}: {
  state: ReturnType<typeof getSubscriptionState>;
}) {
  const statusLabel = state.isTrialing
    ? "Free trial"
    : state.isActive
      ? "Active"
      : (state.status ?? "Active");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Status
          </p>
          <p className="mt-2 text-sm font-medium capitalize text-foreground">
            {statusLabel}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {state.isTrialing ? "Trial ends" : "Renews"}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {state.isTrialing && state.trialEnd
              ? formatDateTime(state.trialEnd.toISOString())
              : state.currentPeriodEnd
                ? formatDateTime(state.currentPeriodEnd.toISOString())
                : "—"}
          </p>
        </div>
      </div>
      <ManageButton />
    </div>
  );
}

function SubscribePanel({
  state,
}: {
  state: ReturnType<typeof getSubscriptionState>;
}) {
  const showPastDue = state.isPastDue;

  return (
    <div className="space-y-4">
      {showPastDue ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">
            Payment failed.
          </p>
          <p className="mt-2 text-xs leading-6 text-amber-900/80">
            Update your card in the Stripe portal to restore access.
          </p>
        </div>
      ) : null}
      <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
        <p className="font-serif text-2xl text-foreground">
          ${FH_PLAN_PRICE_USD} <span className="text-sm text-muted">/ month</span>
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Explore the workspace and set up cases for free. When you're ready to
          generate your first obituary, start a {FH_TRIAL_DAYS}-day free trial —
          then ${FH_PLAN_PRICE_USD}/month until you cancel. Includes case
          intake, AI-drafted obituaries, edits, exports, and delivery.
        </p>
      </div>
      {state.hasStripeCustomer && !showPastDue ? (
        <SubscribeButton label="Resubscribe" />
      ) : state.hasStripeCustomer && showPastDue ? (
        <ManageButton label="Update billing in Stripe" />
      ) : (
        <SubscribeButton />
      )}
    </div>
  );
}
