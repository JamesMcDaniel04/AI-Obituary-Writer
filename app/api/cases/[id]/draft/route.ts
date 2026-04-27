import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObituary } from "@/lib/ai/provider";
import { getLatestDraftForCase, getResponsesByCaseId, rowsToAnswerMap } from "@/lib/db/queries";
import { getQuestionnaireProgress } from "@/lib/questions/engine";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { textToHtml } from "@/lib/utils";

const patchSchema = z.object({
  content: z.string().min(1),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getOwnedCase(caseId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, caseRecord: null };
  }

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .eq("director_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return { user, caseRecord };
}

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { user, caseRecord } = await getOwnedCase(id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const existingDraft = await getLatestDraftForCase(caseRecord.id);

    if (existingDraft) {
      return NextResponse.json({ ok: true, existing: true });
    }

    const responses = await getResponsesByCaseId(caseRecord.id);
    const answers = rowsToAnswerMap(responses);
    const progress = getQuestionnaireProgress(answers);

    if (!progress.complete) {
      return NextResponse.json(
        { error: "The questionnaire is not complete yet." },
        { status: 400 },
      );
    }

    const generated = await generateObituary(answers);
    const contentHtml = textToHtml(generated.content);
    const admin = createAdminSupabaseClient();

    const { error: draftError } = await admin.from("obituary_drafts").upsert(
      {
        case_id: caseRecord.id,
        content: contentHtml,
        ai_provider: generated.provider,
        model: generated.model,
      },
      {
        onConflict: "case_id",
      },
    );

    if (draftError) {
      throw draftError;
    }

    const { error: statusError } = await admin
      .from("cases")
      .update({ status: "draft_ready" })
      .eq("id", caseRecord.id);

    if (statusError) {
      throw statusError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate the obituary draft.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const parsed = patchSchema.parse(await request.json());
    const { user, caseRecord } = await getOwnedCase(id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const draft = await getLatestDraftForCase(caseRecord.id);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }

    if (draft.content === parsed.content) {
      return NextResponse.json({ ok: true, saved: false });
    }

    const admin = createAdminSupabaseClient();
    const { error: updateError } = await admin
      .from("obituary_drafts")
      .update({ content: parsed.content })
      .eq("case_id", caseRecord.id);

    if (updateError) {
      throw updateError;
    }

    const { error: auditError } = await admin.from("obituary_edits").insert({
      case_id: caseRecord.id,
      director_id: user.id,
      content_before: draft.content,
      content_after: parsed.content,
    });

    if (auditError) {
      throw auditError;
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save the draft.",
      },
      { status: 400 },
    );
  }
}
