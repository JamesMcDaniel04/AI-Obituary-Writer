import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { SendLinkForm } from "@/components/cases/send-link-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import { GenerateDraftButton } from "@/components/editor/generate-draft-button";
import { ObituaryEditor } from "@/components/editor/obituary-editor";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getCaseForCurrentUser,
  getCompletedDraftForCase,
  getLatestDraftForCase,
  getResponsesByCaseId,
  listDeliveryLogForCase,
  rowsToAnswerMap,
} from "@/lib/db/queries";
import { isEmailEnabled } from "@/lib/email/send";
import { getQuestionnaireProgress, getVisibleQuestions } from "@/lib/questions/engine";
import { formatCaseStatus, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CaseStatus = "questionnaire_sent" | "draft_ready" | "delivered";

function statusTone(status: CaseStatus): "success" | "warning" | "default" {
  if (status === "draft_ready") return "success";
  if (status === "questionnaire_sent") return "warning";
  return "default";
}

function draftLabel(hasDraft: boolean, complete: boolean) {
  if (hasDraft) return "Ready";
  if (complete) return "Pending";
  return "Waiting";
}

function deliveryHistoryHeading(count: number, hasCompleted: boolean) {
  if (count > 0) {
    return `Sent ${count} time${count === 1 ? "" : "s"}.`;
  }
  if (hasCompleted) {
    return "Final draft archived in Postgres.";
  }
  return "No deliveries yet.";
}

async function buildShareUrl(token: string) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");

  return new URL(`/q/${token}`, baseUrl).toString();
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;
  await requireAppSession();
  const caseRecord = await getCaseForCurrentUser(id);

  if (!caseRecord) {
    notFound();
  }

  const draft = await getLatestDraftForCase(caseRecord.id);
  const completedDraft = await getCompletedDraftForCase(caseRecord.id);
  const deliveryLog = await listDeliveryLogForCase(caseRecord.id);
  const responses = await getResponsesByCaseId(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const progress = getQuestionnaireProgress(answers);
  const shareUrl = await buildShareUrl(caseRecord.questionnaire_token);
  const visibleQuestions = getVisibleQuestions(answers);
  const fullName = answers.full_name || caseRecord.family_name;
  const caseId = caseRecord.id;

  return (
    <div className="space-y-6 pb-12">
      <section className="panel fade-up rounded-[2.5rem] px-8 py-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Case detail
            </p>
            <h1 className="mt-2 font-serif text-5xl text-foreground">
              {fullName}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              Created {formatDateTime(caseRecord.created_at)}. Share the
              questionnaire link, wait for responses, then generate and polish
              the obituary draft.
            </p>
          </div>
          <Badge tone={statusTone(caseRecord.status)}>
            {formatCaseStatus(caseRecord.status)}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Share link
            </p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">
              Family intake
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              The family answers on their phone, one question at a time, without
              creating an account.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-white/90 p-5">
            <p className="break-all text-sm leading-7 text-foreground">
              {shareUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <CopyLinkButton value={shareUrl} />
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground transition hover:border-accent/30"
            >
              Open questionnaire
            </a>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-white/70 p-5">
            <SendLinkForm caseId={caseId} enabled={isEmailEnabled()} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-accent-soft px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Responses
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {progress.answered}/{visibleQuestions.length}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-accent-soft px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Draft
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {draftLabel(Boolean(draft), progress.complete)}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-accent-soft px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Created
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatDate(caseRecord.created_at)}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {!progress.complete ? (
            <Card>
              <p className="text-sm uppercase tracking-[0.24em] text-muted">
                Waiting on family
              </p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">
                No draft yet.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                The questionnaire is still in progress. Once all required
                answers are in, this screen will unlock draft generation.
              </p>
            </Card>
          ) : null}

          {progress.complete && !draft ? (
            <Card>
              <p className="text-sm uppercase tracking-[0.24em] text-muted">
                Ready to generate
              </p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">
                Family responses are complete.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Generate the first draft now. The AI output becomes the canonical
                draft row, and all edits afterward are logged.
              </p>
              <div className="mt-6">
                <GenerateDraftButton caseId={caseId} />
              </div>
            </Card>
          ) : null}

          {draft ? (
            <div className="space-y-6">
              <ObituaryEditor
                caseId={caseId}
                familyName={fullName}
                initialContent={draft.content}
              />
              {completedDraft ? (
                <Card className="space-y-5">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-muted">
                      Delivery history
                    </p>
                    <h3 className="mt-2 font-serif text-3xl text-foreground">
                      {deliveryHistoryHeading(
                        deliveryLog.length,
                        Boolean(completedDraft),
                      )}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted">
                      Snapshot saved{" "}
                      {formatDateTime(completedDraft.completed_at)} as the last
                      delivered version for this case.
                    </p>
                  </div>

                  {deliveryLog.length > 0 ? (
                    <ol className="space-y-3 border-t border-border pt-5">
                      {deliveryLog.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-[1.25rem] border border-border bg-white/75 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {entry.recipient}
                            </p>
                            <p className="text-xs text-muted">
                              {formatDateTime(entry.sent_at)}
                            </p>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">
                            {entry.subject}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </Card>
              ) : null}
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted">
                    Case status
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-foreground">
                    {caseRecord.status === "delivered"
                      ? "Resend the delivery email after any final edits."
                      : "Send the obituary to the family."}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    Review the email, attach the PDF, and email the family a
                    public link. This also archives the current draft as the
                    delivered version.
                  </p>
                </div>
                <Link
                  href={`/cases/${caseId}/deliver`}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {caseRecord.status === "delivered"
                    ? "Resend delivery"
                    : "Prepare delivery"}
                </Link>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {responses.length > 0 ? (
        <Card>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Response summary
          </p>
          <h2 className="mt-2 font-serif text-3xl text-foreground">
            Intake answers on file
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visibleQuestions
              .filter((question) => Object.hasOwn(answers, question.key))
              .map((question) => (
                <div
                  key={question.key}
                  className="rounded-[1.5rem] border border-border bg-white/80 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    {question.prompt.replace(/\?$/, "")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {answers[question.key] || "Skipped"}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
