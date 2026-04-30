import Link from "next/link";
import type { TrackedCase } from "@/lib/cases/tracking";
import {
  getCaseStageDescription,
  getCaseStageLabel,
  getCaseStageTone,
} from "@/lib/cases/tracking";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type TrackedCaseListProps = {
  cases: TrackedCase[];
  emptyTitle: string;
  emptyCopy: string;
};

function formatDraftState(trackedCase: TrackedCase) {
  if (trackedCase.hasCompletedDraft) {
    return "Archived";
  }

  if (trackedCase.hasDraft) {
    return trackedCase.editCount > 0 ? "Edited" : "Generated";
  }

  if (trackedCase.progress.complete) {
    return "Pending";
  }

  return "Waiting";
}

export function TrackedCaseList({
  cases,
  emptyTitle,
  emptyCopy,
}: TrackedCaseListProps) {
  if (cases.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border-dashed text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          {emptyTitle}
        </p>
        <p className="mt-4 text-sm leading-7 text-muted">{emptyCopy}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {cases.map((trackedCase, index) => (
        <Link key={trackedCase.caseId} href={`/cases/${trackedCase.caseId}`}>
          <Card
            className="fade-up rounded-[1.75rem] bg-white/82 p-7 md:p-9 transition hover:-translate-y-0.5 hover:border-accent/35"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-muted">
                  {trackedCase.familyName}
                </p>
                <h3 className="mt-2 font-serif text-3xl text-foreground">
                  {trackedCase.fullName ?? trackedCase.familyName}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                  {getCaseStageDescription(trackedCase)}
                </p>
              </div>
              <Badge tone={getCaseStageTone(trackedCase.stage)}>
                {getCaseStageLabel(trackedCase.stage)}
              </Badge>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                  Responses
                </dt>
                <dd className="mt-2 text-lg font-semibold text-foreground">
                  {trackedCase.progress.answered}/{trackedCase.progress.total}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                  Draft
                </dt>
                <dd className="mt-2 text-lg font-semibold text-foreground">
                  {formatDraftState(trackedCase)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted">
                  Last touch
                </dt>
                <dd className="mt-2 text-lg font-semibold text-foreground">
                  {formatDate(trackedCase.activityAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm text-muted">
              <span>Created {formatDate(trackedCase.createdAt)}</span>
              <span>Open case →</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
