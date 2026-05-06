import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Json } from "@/lib/db/types";
import { getRequiredEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodEndIso(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number | null })
    | undefined;
  const epoch =
    item?.current_period_end ??
    (sub as Stripe.Subscription & { current_period_end?: number | null })
      .current_period_end ??
    null;
  return epoch ? new Date(epoch * 1000).toISOString() : null;
}

function trialEndIso(sub: Stripe.Subscription): string | null {
  return sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function patchProfileByCustomer(
  customer: string,
  patch: {
    stripe_subscription_id?: string | null;
    subscription_status?: string | null;
    current_period_end?: string | null;
    trial_end?: string | null;
  },
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("director_profiles")
    .update(patch)
    .eq("stripe_customer_id", customer);
  if (error) throw error;
}

async function handleSubscription(sub: Stripe.Subscription) {
  const cust = customerId(sub.customer);
  if (!cust) return;
  await patchProfileByCustomer(cust, {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: periodEndIso(sub),
    trial_end: trialEndIso(sub),
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const cust = customerId(sub.customer);
  if (!cust) return;
  await patchProfileByCustomer(cust, {
    stripe_subscription_id: null,
    subscription_status: "canceled",
    current_period_end: periodEndIso(sub),
    trial_end: null,
  });
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription" || !session.subscription) return;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  await handleSubscription(sub);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid Stripe signature.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: inserted, error: idemError } = await supabase
    .from("stripe_events")
    .insert({
      id: event.id,
      type: event.type,
      payload: structuredClone(event) as unknown as Json,
    })
    .select("id")
    .maybeSingle();

  if (idemError) {
    if (idemError.code === "23505") {
      return NextResponse.json({ ok: true, replayed: true });
    }
    return NextResponse.json({ error: idemError.message }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ ok: true, replayed: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        break;
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook handler failed.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
