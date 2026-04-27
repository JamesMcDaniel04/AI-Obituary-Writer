import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="shell flex min-h-screen items-center px-4 py-10 md:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2.5rem] bg-[linear-gradient(145deg,rgba(41,26,22,0.96),rgba(143,81,48,0.92))] px-8 py-10 text-white shadow-[0_40px_90px_rgba(62,34,24,0.28)] md:px-10 md:py-12">
          <p className="text-sm uppercase tracking-[0.24em] text-white/68">
            AI Obituary Writer
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-6xl leading-none">
            A three-screen workflow built for real funeral-home pressure.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/78">
            Start a case, send one private link to the family, and return to a
            structured first draft you can refine and export immediately.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "One case at a time",
              "Token-based family intake",
              "Autosaved edit audit",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] bg-white/10 px-4 py-5 text-sm leading-6 text-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center">
          <AuthForm nextPath={params.next ?? "/dashboard"} />
        </div>
      </div>
    </main>
  );
}
