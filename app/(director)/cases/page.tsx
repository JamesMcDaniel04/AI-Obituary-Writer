import Link from "next/link";
import { buildCaseDashboardSummary } from "@/lib/cases/tracking";
import { TrackedCaseList } from "@/components/cases/tracked-case-list";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { NewCaseButton } from "@/components/dashboard/new-case-button";
import { requireAppSession } from "@/lib/auth/session";
import { listTrackedCasesForCurrentUser } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const session = await requireAppSession();
  const cases = await listTrackedCasesForCurrentUser();
  const summary = buildCaseDashboardSummary(cases);
  const awaitingFamily = cases.filter((caseItem) => caseItem.stage === "awaiting_family");
  const readyToGenerate = cases.filter((caseItem) => caseItem.stage === "ready_to_generate");
  const editing = cases.filter((caseItem) => caseItem.stage === "editing");
  const delivered = cases.filter((caseItem) => caseItem.stage === "delivered");

  return (
    <div className="space-y-8 pb-12">
      <section className="panel fade-up rounded-[2.5rem] px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Cases
            </p>
            <h1 className="mt-2 font-serif text-5xl text-foreground">
              Track every obituary from intake to delivery.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
              {session.profile.role === "admin"
                ? "Admin access can scan every open workspace case, spot stalled intake, and jump straight into the drafts that need attention."
                : "Use this queue to see which families still need a link, which responses are ready for generation, and which drafts are already in editing."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/30"
            >
              Back to dashboard
            </Link>
            <NewCaseButton />
          </div>
        </div>
      </section>

      <DashboardMetrics summary={summary} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Pending action
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Cases that need the next move.
            </h2>
          </div>
          <p className="text-sm text-muted">
            {readyToGenerate.length} ready for draft, {awaitingFamily.length} still in intake
          </p>
        </div>

        <TrackedCaseList
          cases={[...readyToGenerate, ...awaitingFamily]}
          emptyTitle="No pending cases"
          emptyCopy="Once a family starts or finishes intake, the next cases that need attention will collect here."
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Active drafting
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Drafts currently in motion.
            </h2>
          </div>
          <p className="text-sm text-muted">
            {editing.length} {editing.length === 1 ? "case" : "cases"} in editing
          </p>
        </div>

        <TrackedCaseList
          cases={editing}
          emptyTitle="No active drafts"
          emptyCopy="Generated obituaries and edited drafts will appear here once work moves beyond intake."
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Delivered archive
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Closed cases with final snapshots.
            </h2>
          </div>
          <p className="text-sm text-muted">
            {delivered.length} {delivered.length === 1 ? "case" : "cases"} marked delivered
          </p>
        </div>

        <TrackedCaseList
          cases={delivered}
          emptyTitle="No delivered cases yet"
          emptyCopy="Delivered obituaries and archived snapshots will show here once the first case leaves the workspace."
        />
      </section>
    </div>
  );
}
