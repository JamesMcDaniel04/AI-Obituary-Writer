import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CaseRow } from "@/lib/db/queries";
import { formatCaseStatus, formatDate } from "@/lib/utils";

type CaseListProps = {
  cases: CaseRow[];
};

function toneForStatus(status: CaseRow["status"]) {
  switch (status) {
    case "draft_ready":
      return "success";
    case "questionnaire_sent":
      return "warning";
    case "delivered":
      return "default";
  }
}

export function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          No cases yet
        </p>
        <h2 className="mt-3 font-serif text-3xl text-foreground">
          Start the first obituary when the family is ready.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          Each case creates one shareable questionnaire link and one editable
          draft.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {cases.map((caseItem, index) => (
        <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
          <Card
            className="fade-up flex flex-col gap-4 transition hover:-translate-y-0.5 hover:border-accent/35"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-muted">
                  Family
                </p>
                <h2 className="mt-1 font-serif text-3xl text-foreground">
                  {caseItem.family_name}
                </h2>
              </div>
              <Badge tone={toneForStatus(caseItem.status)}>
                {formatCaseStatus(caseItem.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
              <span>Created {formatDate(caseItem.created_at)}</span>
              <span>Open case →</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
