import { NextResponse } from "next/server";
import { getCurrentAppSession } from "@/lib/auth/session";
import { buildObituaryPdfForCase } from "@/lib/pdf/build";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getCurrentAppSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (caseError) {
      throw caseError;
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const { buffer, filename } = await buildObituaryPdfForCase(caseRecord);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
