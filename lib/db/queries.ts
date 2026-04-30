import type { Database } from "@/lib/db/types";
import {
  getCaseStage,
  type TrackedCase,
} from "@/lib/cases/tracking";
import { getQuestionnaireProgress } from "@/lib/questions/engine";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
export type DraftRow = Database["public"]["Tables"]["obituary_drafts"]["Row"];
export type CompletedDraftRow =
  Database["public"]["Tables"]["completed_drafts"]["Row"];
export type ResponseRow =
  Database["public"]["Tables"]["questionnaire_responses"]["Row"];
export type EditRow = Database["public"]["Tables"]["obituary_edits"]["Row"];
export type DirectorProfileRow =
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

function brandingToView(row: DirectorProfileRow | null): DirectorBranding | null {
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

export async function listCasesForCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  return ensureData(data ?? [], error);
}

function groupByCaseId<T extends { case_id: string }>(rows: T[]) {
  return rows.reduce<Map<string, T[]>>((map, row) => {
    const existing = map.get(row.case_id);

    if (existing) {
      existing.push(row);
    } else {
      map.set(row.case_id, [row]);
    }

    return map;
  }, new Map());
}

function latestTimestamp(...timestamps: Array<string | null | undefined>) {
  return timestamps
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export async function listTrackedCasesForCurrentUser(): Promise<TrackedCase[]> {
  const cases = await listCasesForCurrentUser();

  if (cases.length === 0) {
    return [];
  }

  const caseIds = cases.map((caseItem) => caseItem.id);
  const admin = createAdminSupabaseClient();
  const [
    responseResult,
    draftResult,
    completedDraftResult,
    editResult,
  ] = await Promise.all([
    admin
      .from("questionnaire_responses")
      .select("case_id, question_key, answer, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: true }),
    admin
      .from("obituary_drafts")
      .select("case_id, updated_at")
      .in("case_id", caseIds),
    admin
      .from("completed_drafts")
      .select("case_id, completed_at")
      .in("case_id", caseIds),
    admin
      .from("obituary_edits")
      .select("case_id, edited_at")
      .in("case_id", caseIds)
      .order("edited_at", { ascending: false }),
  ]);

  const responses = ensureData<
    Array<Pick<ResponseRow, "case_id" | "question_key" | "answer" | "created_at">>
  >(responseResult.data ?? [], responseResult.error);
  const drafts = ensureData<
    Array<Pick<DraftRow, "case_id" | "updated_at">>
  >(draftResult.data ?? [], draftResult.error);
  const completedDrafts = ensureData<
    Array<Pick<CompletedDraftRow, "case_id" | "completed_at">>
  >(completedDraftResult.data ?? [], completedDraftResult.error);
  const edits = ensureData<
    Array<Pick<EditRow, "case_id" | "edited_at">>
  >(editResult.data ?? [], editResult.error);

  const responsesByCaseId = groupByCaseId(responses);
  const editsByCaseId = groupByCaseId(edits);
  const draftByCaseId = new Map(
    drafts.map((draft) => [draft.case_id, draft] as const),
  );
  const completedDraftByCaseId = new Map(
    completedDrafts.map((draft) => [draft.case_id, draft] as const),
  );

  return cases
    .map<TrackedCase>((caseItem) => {
      const caseResponses = responsesByCaseId.get(caseItem.id) ?? [];
      const answers = rowsToAnswerMap(caseResponses as ResponseRow[]);
      const progress = getQuestionnaireProgress(answers);
      const latestDraft = draftByCaseId.get(caseItem.id) ?? null;
      const completedDraft = completedDraftByCaseId.get(caseItem.id) ?? null;
      const caseEdits = editsByCaseId.get(caseItem.id) ?? [];
      const lastResponseAt =
        caseResponses.length > 0
          ? caseResponses[caseResponses.length - 1]?.created_at ?? null
          : null;
      const lastEditAt = caseEdits[0]?.edited_at ?? null;
      const draftUpdatedAt = latestDraft?.updated_at ?? null;
      const completedAt = completedDraft?.completed_at ?? null;
      const stage = getCaseStage({
        status: caseItem.status,
        progress,
        hasDraft: Boolean(latestDraft),
      });

      return {
        caseId: caseItem.id,
        familyName: caseItem.family_name,
        fullName: answers.full_name?.trim() || null,
        status: caseItem.status,
        createdAt: caseItem.created_at,
        updatedAt: caseItem.updated_at,
        progress,
        responseCount: caseResponses.length,
        hasDraft: Boolean(latestDraft),
        hasCompletedDraft: Boolean(completedDraft),
        editCount: caseEdits.length,
        lastResponseAt,
        lastEditAt,
        draftUpdatedAt,
        completedAt,
        activityAt:
          latestTimestamp(
            completedAt,
            lastEditAt,
            draftUpdatedAt,
            lastResponseAt,
            caseItem.updated_at,
            caseItem.created_at,
          ) ?? caseItem.created_at,
        stage,
      };
    })
    .sort((left, right) => right.activityAt.localeCompare(left.activityAt));
}

export async function getCaseForCurrentUser(caseId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
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
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  return ensureData(data ?? [], error);
}

export async function getResponsesByCaseIdAdmin(caseId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("questionnaire_responses")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  return ensureData(data ?? [], error);
}

export async function getLatestDraftForCase(caseId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("obituary_drafts")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  return ensureData<DraftRow | null>(data, error);
}

export async function getCompletedDraftForCase(caseId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("completed_drafts")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  return ensureData<CompletedDraftRow | null>(data, error);
}

export function rowsToAnswerMap(rows: ResponseRow[]): AnswerMap {
  return rows.reduce<AnswerMap>((acc, row) => {
    acc[row.question_key] = row.answer;
    return acc;
  }, {});
}

export async function getDirectorProfile(directorId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("director_profiles")
    .select("*")
    .eq("director_id", directorId)
    .maybeSingle();

  return ensureData<DirectorProfileRow | null>(data, error);
}

export async function getDirectorBranding(
  directorId: string,
): Promise<DirectorBranding | null> {
  const profile = await getDirectorProfile(directorId);
  return brandingToView(profile);
}

export async function getBrandingForCaseToken(
  token: string,
): Promise<DirectorBranding | null> {
  const admin = createAdminSupabaseClient();
  const { data: caseRecord, error: caseError } = await admin
    .from("cases")
    .select("director_id")
    .eq("questionnaire_token", token)
    .maybeSingle();

  if (caseError) {
    throw new Error(caseError.message);
  }

  if (!caseRecord) {
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from("director_profiles")
    .select("*")
    .eq("director_id", caseRecord.director_id)
    .maybeSingle();

  return brandingToView(ensureData<DirectorProfileRow | null>(profile, profileError));
}
