import {
  getDirectorBranding,
  getLatestDraftForCase,
  getResponsesByCaseId,
  rowsToAnswerMap,
  type CaseRow,
  type DirectorBranding,
} from "@/lib/db/queries";
import { renderObituaryHtml } from "@/lib/pdf/template";
import { renderPdfFromHtml } from "@/lib/pdf/render";

export type BuiltObituaryPdf = {
  buffer: Buffer;
  filename: string;
  fullName: string;
};

function buildFilename(familyName: string) {
  return `${familyName.toLowerCase().replaceAll(/\s+/g, "-")}-obituary.pdf`;
}

export async function renderObituaryPdf({
  familyName,
  fullName,
  contentHtml,
  branding,
}: {
  familyName: string;
  fullName: string;
  contentHtml: string;
  branding: DirectorBranding | null;
}): Promise<BuiltObituaryPdf> {
  const html = renderObituaryHtml({
    familyName,
    fullName,
    contentHtml,
    branding: branding
      ? {
          organizationName: branding.organization_name,
          logoUrl: branding.logo_url,
        }
      : null,
  });

  const buffer = await renderPdfFromHtml(html);

  return {
    buffer,
    filename: buildFilename(familyName),
    fullName,
  };
}

export async function buildObituaryPdfForCase(
  caseRecord: CaseRow,
): Promise<BuiltObituaryPdf> {
  const draft = await getLatestDraftForCase(caseRecord.id);

  if (!draft) {
    throw new Error("Draft not found.");
  }

  const responses = await getResponsesByCaseId(caseRecord.id);
  const answers = rowsToAnswerMap(responses);
  const fullName = answers.full_name || caseRecord.family_name;
  const branding = await getDirectorBranding(caseRecord.director_id);

  return renderObituaryPdf({
    familyName: caseRecord.family_name,
    fullName,
    contentHtml: draft.content,
    branding,
  });
}
