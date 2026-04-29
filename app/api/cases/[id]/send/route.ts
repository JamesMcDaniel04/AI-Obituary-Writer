import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppSession } from "@/lib/auth/session";
import { getDirectorBranding } from "@/lib/db/queries";
import { isEmailEnabled, sendQuestionnaireLinkEmail } from "@/lib/email/send";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  to: z.string().email(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

  return new URL(`/q/${token}`, baseUrl).toString();
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isEmailEnabled()) {
    return NextResponse.json(
      { error: "Email sending is not configured." },
      { status: 501 },
    );
  }

  try {
    const { id } = await params;
    const parsed = requestSchema.parse(await request.json());
    const session = await getCurrentAppSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: caseRecord, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const branding = await getDirectorBranding(caseRecord.director_id);
    const shareUrl = await buildShareUrl(caseRecord.questionnaire_token);

    await sendQuestionnaireLinkEmail({
      to: parsed.to,
      shareUrl,
      familyName: caseRecord.family_name,
      organizationName: branding?.organization_name ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send the questionnaire link.",
      },
      { status: 400 },
    );
  }
}
