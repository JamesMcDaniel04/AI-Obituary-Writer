import Link from "next/link";
import { buildCaseActivityFeed, buildCaseDashboardSummary } from "@/lib/cases/tracking";
import { CaseActivityFeed } from "@/components/cases/case-activity-feed";
import { TrackedCaseList } from "@/components/cases/tracked-case-list";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { requireAppSession } from "@/lib/auth/session";
import { NewCaseButton } from "@/components/dashboard/new-case-button";
import { listTrackedCasesForCurrentUser } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAppSession();
  const cases = await listTrackedCasesForCurrentUser();
  const summary = buildCaseDashboardSummary(cases);
  const activity = buildCaseActivityFeed(cases);
  const pendingCases = cases.filter(
    (caseItem) =>
      caseItem.stage === "awaiting_family" ||
      caseItem.stage === "ready_to_generate",
  );
  const activeDrafts = cases.filter((caseItem) => caseItem.stage === "editing");
  const deliveredCases = cases.filter((caseItem) => caseItem.stage === "delivered");

  return (
    <div className="space-y-12 pb-16">
      <section className="panel fade-up rounded-[2.5rem] px-8 py-12 md:px-12 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Dashboard
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-5xl">
              {session.profile.role === "admin"
                ? "Review every draft moving through the workspace."
                : "Keep the drafting process focused."}
            </h1>
            <p className="mt-5 text-sm leading-7 text-muted">
              {session.profile.role === "admin"
                ? "Admin access can review every case, while director ownership still controls the normal day-to-day flow."
                : "Every case starts with one family name and ends with a draft you can edit, export, and mark as delivered. The dashboard keeps the next action visible."}
            </p>
          </div>
          <NewCaseButton />
        </div>
      </section>

      <DashboardMetrics summary={summary} />

      <div className="grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted">
                Pending action
              </p>
              <h2 className="mt-3 font-serif text-3xl text-foreground">
                Cases that need attention next.
              </h2>
            </div>
            <Link
              href="/cases"
              className="text-sm font-medium text-accent transition hover:opacity-80"
            >
              View all cases →
            </Link>
          </div>

          <TrackedCaseList
            cases={pendingCases.slice(0, 4)}
            emptyTitle="No cases are waiting"
            emptyCopy="As intake links go out and responses arrive, the next tasks will surface here."
          />
        </section>

        <CaseActivityFeed items={activity.slice(0, 6)} />
      </div>

      <div className="grid gap-10 xl:grid-cols-2">
        <section className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Active drafts
            </p>
            <h2 className="mt-3 font-serif text-3xl text-foreground">
              Editing now
            </h2>
          </div>
          <TrackedCaseList
            cases={activeDrafts.slice(0, 3)}
            emptyTitle="No active drafts"
            emptyCopy="Generated drafts will collect here once the family intake is complete and the obituary has moved into editing."
          />
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Delivered archive
            </p>
            <h2 className="mt-3 font-serif text-3xl text-foreground">
              Recently closed cases
            </h2>
          </div>
          <TrackedCaseList
            cases={deliveredCases.slice(0, 3)}
            emptyTitle="No delivered cases yet"
            emptyCopy="Delivered cases will appear here once a finished obituary leaves the workspace."
          />
        </section>
      </div>
    </div>
  );
}
