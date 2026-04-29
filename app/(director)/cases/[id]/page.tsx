import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { SendLinkForm } from "@/components/cases/send-link-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import { GenerateDraftButton } from "@/components/editor/generate-draft-button";
import { ObituaryEditor } from "@/components/editor/obituary-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCaseForCurrentUser,
  getCompletedDraftForCase,
  getLatestDraftForCase,
  getResponsesByCaseId,
  rowsToAnswerMap,
} from "@/lib/db/queries";
import { isEmailEnabled } from "@/lib/email/send";
import { getQuestionnaireProgress, getVisibleQuestions } from "@/lib/questions/engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCaseStatus, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
  const responses = await getResponsesByCaseId(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const progress = getQuestionnaireProgress(answers);
  const shareUrl = await buildShareUrl(caseRecord.questionnaire_token);
  const visibleQuestions = getVisibleQuestions(answers);
  const fullName = answers.full_name || caseRecord.family_name;
  const caseId = caseRecord.id;

  async function markDeliveredAction() {
    "use server";

    const session = await requireAppSession();
    const actionSupabase = await createServerSupabaseClient();
    const { data: latestDraft, error: latestDraftError } = await actionSupabase
      .from("obituary_drafts")
      .select("*")
      .eq("case_id", caseId)
      .single();

    if (latestDraftError) {
      throw new Error(latestDraftError.message);
    }

    const { error: completedDraftError } = await actionSupabase
      .from("completed_drafts")
      .upsert(
        {
          case_id: caseId,
          completed_by: session.user.id,
          content: latestDraft.content,
          ai_provider: latestDraft.ai_provider,
          model: latestDraft.model,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "case_id" },
      );

    if (completedDraftError) {
      throw new Error(completedDraftError.message);
    }

    const { error } = await actionSupabase
      .from("cases")
      .update({ status: "delivered" })
      .eq("id", caseId)

    if (error) {
      throw new Error(error.message);
    }

    redirect("/dashboard");
  }

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
          <Badge tone={caseRecord.status === "draft_ready" ? "success" : caseRecord.status === "questionnaire_sent" ? "warning" : "default"}>
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
                {draft ? "Ready" : progress.complete ? "Pending" : "Waiting"}
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
                <Card>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted">
                    Completed snapshot
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-foreground">
                    Final draft archived in Postgres.
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-muted">
                    Saved {formatDateTime(completedDraft.completed_at)} as the
                    last delivered version for this case.
                  </p>
                </Card>
              ) : null}
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted">
                    Case status
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-foreground">
                    {caseRecord.status === "delivered"
                      ? "Refresh the delivered snapshot after any final edits."
                      : "Mark delivered when the draft leaves your desk."}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    This action stores the current draft in Postgres as the
                    completed version for this case.
                  </p>
                </div>
                <form action={markDeliveredAction}>
                  <Button type="submit" variant="danger">
                    {caseRecord.status === "delivered"
                      ? "Update delivered snapshot"
                      : "Mark delivered"}
                  </Button>
                </form>
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
              .filter((question) =>
                Object.prototype.hasOwnProperty.call(answers, question.key),
              )
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
