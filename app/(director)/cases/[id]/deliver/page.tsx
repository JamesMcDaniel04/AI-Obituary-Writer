import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import {
  DeliveryForm,
  type DeliveryActionResult,
} from "@/components/cases/delivery-form";
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

const sendSchema = z.object({
  recipient: z.string().email("Enter a valid email address."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Body is required."),
});

const testSchema = z.object({
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
  const testRecipient = session.profile.email?.trim() || session.user.email || null;
  const caseId = caseRecord.id;

  async function deliveryAction(
    _state: DeliveryActionResult,
    formData: FormData,
  ): Promise<DeliveryActionResult> {
    "use server";

    const intent = String(formData.get("intent") ?? "send");
    const values = {
      recipient: String(formData.get("recipient") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
    };

    if (!isEmailEnabled()) {
      return { error: "Email sending is not configured.", values };
    }

    const actionSession = await requireAppSession();

    if (intent === "test") {
      const parsed = testSchema.safeParse(values);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? "Subject and body are required.",
          values,
        };
      }

      const recipient =
        actionSession.profile.email?.trim() ||
        actionSession.user.email ||
        null;

      if (!recipient) {
        return {
          error:
            "We don't have an email on your profile to send the test to. Add one in Settings first.",
          values,
        };
      }

      try {
        const { data: latestCase, error: caseFetchError } = await (
          await createServerSupabaseClient()
        )
          .from("cases")
          .select("*")
          .eq("id", caseId)
          .single();

        if (caseFetchError) {
          throw new Error(caseFetchError.message);
        }

        const { buffer, filename } = await buildObituaryPdfForCase(latestCase);
        const subjectWithTag = `[TEST] ${parsed.data.subject}`;

        await sendDeliveryEmail({
          to: recipient,
          subject: subjectWithTag,
          bodyText: parsed.data.body,
          bodyHtml: deliveryBodyToHtml(parsed.data.body),
          fromName:
            branding?.organization_name ?? vars.director_name ?? null,
          pdf: { filename, buffer },
        });

        return { testSentTo: recipient, values };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Test send failed for an unknown reason.",
          values,
        };
      }
    }

    const parsed = sendSchema.safeParse(values);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Please fix the form errors.",
        values,
      };
    }

    try {
      const actionSupabase = await createServerSupabaseClient();
      const { data: latestDraft, error: latestDraftError } = await actionSupabase
        .from("obituary_drafts")
        .select("*")
        .eq("case_id", caseId)
        .single();

      if (latestDraftError) throw new Error(latestDraftError.message);

      const { data: latestCase, error: caseFetchError } = await actionSupabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .single();

      if (caseFetchError) throw new Error(caseFetchError.message);

      const { buffer, filename } = await buildObituaryPdfForCase(latestCase);

      await sendDeliveryEmail({
        to: parsed.data.recipient,
        subject: parsed.data.subject,
        bodyText: parsed.data.body,
        bodyHtml: deliveryBodyToHtml(parsed.data.body),
        fromName: branding?.organization_name ?? vars.director_name ?? null,
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

      if (completedDraftError) throw new Error(completedDraftError.message);

      const { error: caseError } = await actionSupabase
        .from("cases")
        .update({ status: "delivered" })
        .eq("id", caseId);

      if (caseError) throw new Error(caseError.message);

      const { error: logError } = await actionSupabase
        .from("delivery_log")
        .insert({
          case_id: caseId,
          sent_by: actionSession.user.id,
          recipient: parsed.data.recipient,
          subject: parsed.data.subject,
          share_url: shareUrl,
        });

      if (logError) throw new Error(logError.message);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Delivery failed for an unknown reason.",
        values,
      };
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
            Email delivery isn&apos;t available right now. Copy the share link
            above and send it to the family from your own email or messaging
            app.
          </div>
        ) : null}

        <DeliveryForm
          caseId={caseId}
          defaultSubject={rendered.subject}
          defaultBody={rendered.body}
          testRecipient={testRecipient}
          emailEnabled={emailEnabled}
          action={deliveryAction}
        />
      </Card>
    </div>
  );
}
