import { NextResponse } from "next/server";
import { getCurrentAppSession } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe/server";
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

    const customerId = session.profile.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer for this account yet." },
        { status: 400 },
      );
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open billing portal.",
      },
      { status: 400 },
    );
  }
}
