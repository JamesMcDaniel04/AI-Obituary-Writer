import type { Database } from "@/lib/db/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type DraftRow = Database["public"]["Tables"]["obituary_drafts"]["Row"];
export type ResponseRow =
  Database["public"]["Tables"]["questionnaire_responses"]["Row"];
export type BrandingRow =
  Database["public"]["Tables"]["director_profiles"]["Row"];

export type DirectorBranding = {
  organization_name: string | null;
  logo_path: string | null;
  logo_url: string | null;
};

export type AnswerMap = Record<string, string>;

function ensureData<T>(data: T, error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listCasesForDirector(directorId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("director_id", directorId)
    .order("created_at", { ascending: false });

  return ensureData(data ?? [], error);
}

export async function getCaseForDirector(caseId: string, directorId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .eq("director_id", directorId)
    .maybeSingle();

  return ensureData<CaseRow | null>(data, error);
}

export async function getCaseByToken(token: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("cases")
    .select("*")
    .eq("questionnaire_token", token)
    .maybeSingle();

  return ensureData<CaseRow | null>(data, error);
}

export async function getResponsesByCaseId(caseId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("questionnaire_responses")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  return ensureData(data ?? [], error);
}

export async function getLatestDraftForCase(caseId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("obituary_drafts")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  return ensureData<DraftRow | null>(data, error);
}

export function rowsToAnswerMap(rows: ResponseRow[]): AnswerMap {
  return rows.reduce<AnswerMap>((acc, row) => {
    acc[row.question_key] = row.answer;
    return acc;
  }, {});
}

function brandingToView(row: BrandingRow | null): DirectorBranding | null {
  if (!row) {
    return null;
  }

  let logoUrl: string | null = null;
  if (row.logo_path) {
    const admin = createAdminSupabaseClient();
    const {
      data: { publicUrl },
    } = admin.storage.from("director-logos").getPublicUrl(row.logo_path);
    logoUrl = publicUrl ?? null;
  }

  return {
    organization_name: row.organization_name,
    logo_path: row.logo_path,
    logo_url: logoUrl,
  };
}

export async function getDirectorBranding(
  directorId: string,
): Promise<DirectorBranding | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("director_profiles")
    .select("*")
    .eq("director_id", directorId)
    .maybeSingle();

  return brandingToView(ensureData<BrandingRow | null>(data, error));
}

export async function getBrandingForCaseToken(
  token: string,
): Promise<DirectorBranding | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("cases")
    .select("director_id")
    .eq("questionnaire_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return getDirectorBranding(data.director_id);
}
