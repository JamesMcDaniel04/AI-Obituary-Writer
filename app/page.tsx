import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FilePenLine,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const workflowSteps = [
  {
    step: "01",
    title: "Open a case in under a minute",
    copy:
      "Enter the family name once. The platform generates a private questionnaire link immediately.",
  },
  {
    step: "02",
    title: "Let the family answer on their phone",
    copy:
      "The intake runs one question at a time, in plain language, without requiring an account or any training.",
  },
  {
    step: "03",
    title: "Return to a real draft, not a blank page",
    copy:
      "Generate the obituary, polish it in the editor, track edits, and export a clean PDF when it is ready.",
  },
] as const;

const productPoints = [
  {
    icon: Clock3,
    title: "Built for time pressure",
    copy:
      "The workflow is intentionally short: case, questionnaire, draft. No billing maze, no setup friction, no buried controls.",
  },
  {
    icon: MessageSquareQuote,
    title: "Better raw material from families",
    copy:
      "The family experience is conversational and paced. That produces stronger details than a rushed phone call or a blank email reply.",
  },
  {
    icon: FilePenLine,
    title: "Directors stay in control",
    copy:
      "The AI creates the first pass. The director still edits, reviews, archives, and decides when the obituary is actually delivered.",
  },
  {
    icon: ShieldCheck,
    title: "Operationally trustworthy",
    copy:
      "Case ownership, audit trails, role-based access, and server-side token validation keep the workflow grounded in real funeral-home handling.",
  },
] as const;

const trustNotes = [
  "One private questionnaire link per case",
  "Editable draft with tracked revision history",
  "Exportable PDF for downstream handoff",
  "Role-aware Postgres access controls",
] as const;

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="pb-16">
      <section className="shell px-4 pt-6 md:px-6 md:pt-8">
        <div className="panel fade-up rounded-[2.25rem] px-5 py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted">
                AI Obituary Writer
              </p>
              <p className="mt-2 text-sm text-muted">
                A focused obituary drafting workflow for funeral directors.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className={cn(buttonClasses.base, buttonClasses.ghost)}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className={cn(buttonClasses.base, buttonClasses.primary, "gap-2")}
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="shell px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[2.75rem] bg-[linear-gradient(145deg,rgba(41,26,22,0.98),rgba(143,81,48,0.94))] px-8 py-10 text-white shadow-[0_40px_90px_rgba(62,34,24,0.24)] md:px-10 md:py-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">
              <Lock className="h-3.5 w-3.5" />
              Funeral-home workflow
            </div>

            <h1 className="mt-6 max-w-[11ch] font-serif text-[clamp(3.25rem,8vw,5.75rem)] leading-[0.92] tracking-[-0.03em] text-white">
              The obituary draft starts here, not on a blank page.
            </h1>

            <p className="mt-6 max-w-xl text-[1.02rem] leading-7 text-white/90 md:text-[1.1rem] md:leading-8">
              Start a case, send one secure family link, and come back to a
              structured first draft you can edit, archive, and export under
              real deadline pressure.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonClasses.base,
                  "gap-2 bg-white font-semibold text-foreground shadow-[0_18px_40px_rgba(24,14,10,0.18)] hover:bg-white/92",
                )}
              >
                Start in the workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#workflow"
                className={cn(
                  buttonClasses.base,
                  "border border-white/30 bg-white/6 font-medium text-white/95 hover:bg-white/12",
                )}
              >
                See the workflow
              </a>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: "Workflow",
                  copy: "Three-screen operational flow for intake, drafting, and delivery.",
                },
                {
                  label: "Privacy",
                  copy: "Token-based family questionnaire with server-side validation.",
                },
                {
                  label: "Output",
                  copy: "Editable draft, audit log, and clean PDF export in one place.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/12 bg-black/10 px-4 py-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/68">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/92">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel fade-up rounded-[2.75rem] px-6 py-6 md:px-8 md:py-8">
            <div className="rounded-[2rem] border border-border bg-white/82 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Typical case flow
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-foreground">
                    One case. One link. One draft path.
                  </h2>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  MVP scope
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {workflowSteps.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-[1.5rem] border border-border bg-surface-strong px-4 py-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-white">
                        {step.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          {step.copy}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="shell px-4 py-6 md:px-6 md:py-8">
        <div className="panel fade-up rounded-[2.5rem] px-8 py-10 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted">
                Why It Works
              </p>
              <h2 className="mt-2 max-w-3xl font-serif text-5xl text-foreground">
                Designed for the actual moment a funeral home needs help.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-muted">
              The product is intentionally narrow so directors can use it under
              stress without training, and families can answer without wondering
              where the information goes.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {productPoints.map((point) => {
              const Icon = point.icon;

              return (
                <div
                  key={point.title}
                  className="rounded-[1.75rem] border border-border bg-white/82 px-5 py-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {point.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted">
                        {point.copy}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="shell px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel fade-up rounded-[2.5rem] px-8 py-10">
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Family Experience
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">
              The intake feels human, not administrative.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Families answer one question at a time on their phone. Branching
              keeps the prompt set respectful and short, while still collecting
              the details that make the draft usable.
            </p>
            <div className="mt-6 rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(247,240,231,0.94))] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Intake tone
              </p>
              <p className="mt-3 font-serif text-3xl text-foreground">
                “Help us tell their story with care and accuracy.”
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">
                The interface is paced for clarity, not speed for speed’s sake.
                That tends to produce stronger, more honest source material.
              </p>
            </div>
          </div>

          <div className="panel fade-up rounded-[2.5rem] px-8 py-10">
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Trust Layer
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">
              Operational details matter as much as the writing.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {trustNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-[1.75rem] border border-border bg-white/78 px-5 py-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                    <p className="text-sm leading-7 text-foreground">{note}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-muted">
              The product does not try to replace the director’s judgment. It
              removes blank-page friction, preserves accountability, and keeps
              the working draft in a controlled workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="shell px-4 py-6 md:px-6 md:py-8">
        <div className="fade-up rounded-[2.75rem] bg-[linear-gradient(145deg,rgba(143,81,48,0.95),rgba(79,48,33,0.96))] px-8 py-10 text-white shadow-[0_30px_80px_rgba(62,34,24,0.2)] md:px-10 md:py-12">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/68">
                Start Here
              </p>
              <h2 className="mt-3 max-w-3xl font-serif text-5xl leading-tight text-white">
                Use the workspace when the family is ready and the draft needs to move.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
                Sign in, open a case, and send the link. The rest of the
                workflow is already structured for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonClasses.base,
                  "gap-2 bg-white text-foreground hover:bg-white/92",
                )}
              >
                Enter workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
