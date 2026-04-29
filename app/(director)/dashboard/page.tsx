import { requireAppSession } from "@/lib/auth/session";
import { CaseList } from "@/components/dashboard/case-list";
import { NewCaseButton } from "@/components/dashboard/new-case-button";
import { listCasesForCurrentUser } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAppSession();
  const cases = await listCasesForCurrentUser();

  return (
    <div className="space-y-8 pb-12">
      <section className="panel fade-up rounded-[2.5rem] px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Dashboard
            </p>
            <h1 className="mt-2 font-serif text-5xl text-foreground">
              {session.profile.role === "admin"
                ? "Review every draft moving through the workspace."
                : "Keep the drafting process focused."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
              {session.profile.role === "admin"
                ? "Admin access can review every case, while director ownership still controls the normal day-to-day flow."
                : "Every case starts with one family name and ends with a draft you can edit, export, and mark as delivered."}
            </p>
          </div>
          <NewCaseButton />
        </div>
      </section>

      <CaseList cases={cases} />
    </div>
  );
}
