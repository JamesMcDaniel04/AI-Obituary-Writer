import { NextResponse } from "next/server";
import { getCurrentAppSession } from "@/lib/auth/session";
import { FH_TRIAL_DAYS, getStripe } from "@/lib/stripe/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRequiredEnv } from "@/lib/env";

function siteUrl() {
  return getRequiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
}

export async function POST() {
  try {
    const session = await getCurrentAppSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stripe = getStripe();
    const supabase = await createServerSupabaseClient();
    let customerId = session.profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: session.profile.full_name ?? undefined,
        metadata: { director_id: session.user.id },
      });
      customerId = customer.id;

      const { error } = await supabase
        .from("director_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("director_id", session.user.id);

      if (error) {
        const looksLikeMissingColumn =
          error.code === "42703" ||
          error.message.toLowerCase().includes("stripe_customer_id");
        throw new Error(
          looksLikeMissingColumn
            ? "Database is missing the subscription columns. Apply supabase/migrations/0006_subscriptions.sql to this Supabase project."
            : `Could not save Stripe customer (${error.code ?? "?"}): ${error.message}`,
        );
      }
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getRequiredEnv("STRIPE_PRICE_ID"), quantity: 1 }],
      subscription_data: {
        trial_period_days: FH_TRIAL_DAYS,
        metadata: { director_id: session.user.id },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${siteUrl()}/billing?checkout=success`,
      cancel_url: `${siteUrl()}/billing?checkout=cancel`,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start checkout.",
      },
      { status: 400 },
    );
  }
}
