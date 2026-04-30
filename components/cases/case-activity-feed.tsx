import Link from "next/link";
import type { CaseActivity } from "@/lib/cases/tracking";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

type CaseActivityFeedProps = {
  items: CaseActivity[];
};

export function CaseActivityFeed({ items }: CaseActivityFeedProps) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          Recent activity
        </p>
        <h2 className="mt-2 font-serif text-3xl text-foreground">
          Latest movement across the workspace.
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-border bg-white/70 px-5 py-6">
          <p className="text-sm text-muted">
            Activity will appear here once cases start moving through intake,
            drafting, and delivery.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={`${item.caseId}-${item.label}-${item.at}`}
              href={`/cases/${item.caseId}`}
              className="block rounded-[1.5rem] border border-border bg-white/78 px-5 py-4 transition hover:border-accent/30 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  {formatDateTime(item.at)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">{item.detail}</p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
