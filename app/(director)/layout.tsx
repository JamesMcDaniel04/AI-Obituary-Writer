import Link from "next/link";
import { redirect } from "next/navigation";
import { DirectorNav } from "@/components/director-nav";
import { requireAppSession } from "@/lib/auth/session";
import { getSubscriptionState } from "@/lib/auth/subscription";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DirectorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAppSession();
  const identity =
    session.profile.full_name || session.user.email || "Workspace user";
  const subscription = getSubscriptionState(session.profile);
  const trialEndsSoon =
    subscription.isTrialing &&
    subscription.trialEnd !== null &&
    subscription.trialEnd.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3;
  const banner = subscription.isPastDue
    ? {
        tone: "amber" as const,
        text: "Payment failed. Update your card in Billing to keep workspace access.",
      }
    : trialEndsSoon
      ? {
          tone: "neutral" as const,
          text: "Your free trial is ending soon. Add a payment method in Billing to keep going.",
        }
      : null;

  async function signOutAction() {
    "use server";

    const actionSupabase = await createServerSupabaseClient();
    await actionSupabase.auth.signOut();
    redirect("/");
  }

  return (
    <div className="shell px-4 py-6 md:px-6">
      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <aside className="panel fade-up rounded-[2rem] p-5 lg:sticky lg:top-6">
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-[0.24em] text-muted"
          >
            AI Obituary Writer
          </Link>
          <p className="mt-2 font-serif text-2xl text-foreground">
            Director workspace
          </p>

          <div className="mt-6">
            <DirectorNav />
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-medium text-foreground">{identity}</p>
            <p className="mt-0.5 text-xs capitalize text-muted">
              {session.profile.role}
            </p>
            <form action={signOutAction} className="mt-4">
              <button className="w-full rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/30">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 pb-16">
          {banner ? (
            <div
              className={
                banner.tone === "amber"
                  ? "mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  : "mb-4 rounded-2xl border border-border bg-accent-soft px-4 py-3 text-sm text-foreground"
              }
            >
              {banner.text}{" "}
              <Link
                href="/billing"
                className="font-medium underline-offset-4 hover:underline"
              >
                Go to billing →
              </Link>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
