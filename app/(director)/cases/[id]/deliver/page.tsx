import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAppSession } from "@/lib/auth/session";
import {
  ensureDeliveryToken,
  getCaseForCurrentUser,
  getDeliveryTemplateOrDefault,
  getDirectorBranding,
  getLatestDraftForCase,
  getResponsesByCaseId,
  rowsToAnswerMap,
} from "@/lib/db/queries";
import {
  deliveryBodyToHtml,
  renderDeliveryTemplate,
  type DeliveryVars,
} from "@/lib/delivery/template";
import { isEmailEnabled, sendDeliveryEmail } from "@/lib/email/send";
import { buildObituaryPdfForCase } from "@/lib/pdf/build";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DeliverPageProps = {
  params: Promise<{ id: string }>;
};

async function buildShareUrl(token: string) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (host ? `${protocol}://${host}` : "http://localhost:3000");

  return new URL(`/o/${token}`, baseUrl).toString();
}

const deliveryFormSchema = z.object({
  recipient: z.string().email("Enter a valid email address."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
});

export default async function DeliverPage({ params }: DeliverPageProps) {
  const { id } = await params;
  const session = await requireAppSession();
  const caseRecord = await getCaseForCurrentUser(id);

  if (!caseRecord) {
    notFound();
  }

  const draft = await getLatestDraftForCase(caseRecord.id);

  if (!draft) {
    redirect(`/cases/${caseRecord.id}`);
  }

  const responses = await getResponsesByCaseId(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const fullName = answers.full_name?.trim() || caseRecord.family_name;
  const branding = await getDirectorBranding(caseRecord.director_id);
  const template = await getDeliveryTemplateOrDefault(caseRecord.director_id);
  const deliveryToken = await ensureDeliveryToken(caseRecord.id);
  const shareUrl = await buildShareUrl(deliveryToken);

  const vars: DeliveryVars = {
    full_name: fullName,
    family_name: caseRecord.family_name,
    director_name:
      session.profile.full_name?.trim() ||
      session.profile.email?.trim() ||
      "Your funeral director",
    organization_name: branding?.organization_name ?? "",
    share_link: shareUrl,
  };

  const rendered = renderDeliveryTemplate(template, vars);
  const emailEnabled = isEmailEnabled();
  const caseId = caseRecord.id;

  async function sendDeliveryAction(formData: FormData) {
    "use server";

    if (!isEmailEnabled()) {
      throw new Error("Email sending is not configured.");
    }

    const parsed = deliveryFormSchema.parse({
      recipient: String(formData.get("recipient") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
    });

    const actionSession = await requireAppSession();
    const actionSupabase = await createServerSupabaseClient();

    const { data: latestDraft, error: latestDraftError } = await actionSupabase
      .from("obituary_drafts")
      .select("*")
      .eq("case_id", caseId)
      .single();

    if (latestDraftError) {
      throw new Error(latestDraftError.message);
    }

    const { data: latestCase, error: caseFetchError } = await actionSupabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseFetchError) {
      throw new Error(caseFetchError.message);
    }

    const { buffer, filename } = await buildObituaryPdfForCase(latestCase);

    await sendDeliveryEmail({
      to: parsed.recipient,
      subject: parsed.subject,
      bodyText: parsed.body,
      bodyHtml: deliveryBodyToHtml(parsed.body),
      pdf: { filename, buffer },
    });

    const { error: completedDraftError } = await actionSupabase
      .from("completed_drafts")
      .upsert(
        {
          case_id: caseId,
          completed_by: actionSession.user.id,
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

    const { error: caseError } = await actionSupabase
      .from("cases")
      .update({ status: "delivered" })
      .eq("id", caseId);

    if (caseError) {
      throw new Error(caseError.message);
    }

    const { error: logError } = await actionSupabase
      .from("delivery_log")
      .insert({
        case_id: caseId,
        sent_by: actionSession.user.id,
        recipient: parsed.recipient,
        subject: parsed.subject,
        share_url: shareUrl,
      });

    if (logError) {
      throw new Error(logError.message);
    }

    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <Card className="fade-up space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Deliver obituary
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Send the final draft to the family.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            The PDF will be attached automatically and the email will include a
            public link to the obituary. Edit the subject and body below for
            this case — the workspace template stays untouched.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-white/70 p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Public link
          </p>
          <p className="mt-2 break-all font-mono text-foreground">{shareUrl}</p>
        </div>

        {!emailEnabled ? (
          <div className="rounded-[1.5rem] border border-dashed border-warning/40 bg-warning/5 p-5 text-sm leading-6 text-foreground">
            Email sending isn't configured. Set
            <span className="mx-1 font-mono">RESEND_API_KEY</span> and
            <span className="mx-1 font-mono">RESEND_FROM_EMAIL</span> to enable
            delivery from this screen.
          </div>
        ) : null}

        <form action={sendDeliveryAction} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Recipient email
            </span>
            <Input
              name="recipient"
              type="email"
              required
              placeholder="family@example.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Subject</span>
            <Input name="subject" required defaultValue={rendered.subject} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Body</span>
            <Textarea
              name="body"
              required
              defaultValue={rendered.body}
              className="min-h-72 font-serif text-sm leading-7"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!emailEnabled}>
              Send & mark delivered
            </Button>
            <Link
              href={`/cases/${caseRecord.id}`}
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
