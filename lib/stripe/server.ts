import Stripe from "stripe";
import { getRequiredEnv } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
    appInfo: { name: "AI Obituary Writer", version: "0.1.0" },
  });
  return cached;
}

export const FH_PLAN_PRICE_USD = 150;
export const FH_TRIAL_DAYS = 7;
