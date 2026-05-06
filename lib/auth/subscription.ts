import type { Database } from "@/lib/db/types";

type DirectorProfileRow = Database["public"]["Tables"]["director_profiles"]["Row"];

export type SubscriptionState = {
  status: string | null;
  isAdmin: boolean;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  hasAccess: boolean;
  hasStripeCustomer: boolean;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
};

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export function getSubscriptionState(
  profile: DirectorProfileRow,
): SubscriptionState {
  const status = profile.subscription_status;
  const isAdmin = profile.role === "admin";
  const isActive = status === "active";
  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const hasAccess = isAdmin || (status !== null && ACTIVE_STATUSES.has(status));

  return {
    status,
    isAdmin,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    hasAccess,
    hasStripeCustomer: Boolean(profile.stripe_customer_id),
    currentPeriodEnd: profile.current_period_end
      ? new Date(profile.current_period_end)
      : null,
    trialEnd: profile.trial_end ? new Date(profile.trial_end) : null,
  };
}
