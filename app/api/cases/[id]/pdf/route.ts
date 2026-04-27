import { NextResponse } from "next/server";
import { getLatestDraftForCase, getResponsesByCaseId, rowsToAnswerMap } from "@/lib/db/queries";
import { renderObituaryHtml } from "@/lib/pdf/template";
import { renderPdfFromHtml } from "@/lib/pdf/render";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("director_id", user.id)
      .maybeSingle();

    if (caseError) {
      throw caseError;
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const draft = await getLatestDraftForCase(caseRecord.id);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }

    const responses = await getResponsesByCaseId(caseRecord.id);
    const answers = rowsToAnswerMap(responses);
    const fullName = answers.full_name || caseRecord.family_name;
    const html = renderObituaryHtml({
      familyName: caseRecord.family_name,
      fullName,
      contentHtml: draft.content,
    });
    const pdf = await renderPdfFromHtml(html);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${caseRecord.family_name.toLowerCase().replaceAll(/\s+/g, "-")}-obituary.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to render the PDF.",
      },
      { status: 400 },
    );
  }
}
