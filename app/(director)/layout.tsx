import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DirectorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAppSession();
  const identity = session.profile.full_name || session.user.email || "Workspace user";

  async function signOutAction() {
    "use server";

    const actionSupabase = await createServerSupabaseClient();
    await actionSupabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="shell flex flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-6">
        <div>
          <Link href="/dashboard" className="text-sm uppercase tracking-[0.24em] text-muted">
            AI Obituary Writer
          </Link>
          <p className="mt-2 font-serif text-3xl text-foreground">
            Director workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="rounded-full border border-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/30"
          >
            Settings
          </Link>
          <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-muted">
            {identity}
          </span>
          <span className="rounded-full bg-accent-soft px-4 py-2 text-sm capitalize text-foreground">
            {session.profile.role}
          </span>
          <form action={signOutAction}>
            <button className="rounded-full border border-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/30">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="shell px-4 md:px-6">{children}</main>
    </div>
  );
}
