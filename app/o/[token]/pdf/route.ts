import { NextResponse } from "next/server";
import { getCompletedDraftByDeliveryToken } from "@/lib/db/queries";
import { renderObituaryPdf } from "@/lib/pdf/build";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const view = await getCompletedDraftByDeliveryToken(token);

    if (!view) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { buffer, filename } = await renderObituaryPdf({
      familyName: view.case.family_name,
      fullName: view.fullName,
      contentHtml: view.completed.content,
      branding: view.branding,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
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
