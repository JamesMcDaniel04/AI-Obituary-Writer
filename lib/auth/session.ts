import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DirectorProfileRow = Database["public"]["Tables"]["director_profiles"]["Row"];

export type AppSession = {
  user: User;
  profile: DirectorProfileRow;
};

function formatProfileSyncError(error: { message: string }) {
  const message = error.message.toLowerCase();
  const looksLikeMissingRbacSchema =
    message.includes("director_profiles") &&
    (message.includes("full_name") ||
      message.includes("email") ||
      message.includes("role") ||
      message.includes("schema cache") ||
      message.includes("column"));

  if (looksLikeMissingRbacSchema) {
    return "The database is missing the RBAC profile migration. Apply supabase/migrations/0004_profiles_rbac_completed_drafts.sql and reload.";
  }

  return error.message;
}

function readMetadataString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getProfileSeedName(user: User) {
  return (
    readMetadataString(user.user_metadata?.full_name) ??
    readMetadataString(user.user_metadata?.name)
  );
}

async function syncCurrentUserProfile(
  user: User,
): Promise<DirectorProfileRow> {
  const supabase = await createServerSupabaseClient();
  const { data: existing, error } = await supabase
    .from("director_profiles")
    .select("*")
    .eq("director_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(formatProfileSyncError(error));
  }

  const email = user.email ?? null;
  const fullName = getProfileSeedName(user);

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from("director_profiles")
      .insert({
        director_id: user.id,
        email,
        full_name: fullName,
      })
      .select("*")
      .single();

    if (insertError) {
      // Race: another concurrent request created the row first. Re-fetch.
      if (insertError.code === "23505") {
        const { data: raced, error: refetchError } = await supabase
          .from("director_profiles")
          .select("*")
          .eq("director_id", user.id)
          .single();

        if (refetchError) {
          throw new Error(formatProfileSyncError(refetchError));
        }

        return raced;
      }

      throw new Error(formatProfileSyncError(insertError));
    }

    return inserted;
  }

  const profilePatch: Database["public"]["Tables"]["director_profiles"]["Update"] =
    {};

  if ((existing.email ?? null) !== email) {
    profilePatch.email = email;
  }

  if (!existing.full_name && fullName) {
    profilePatch.full_name = fullName;
  }

  if (Object.keys(profilePatch).length === 0) {
    return existing;
  }

  const { data: updated, error: updateError } = await supabase
    .from("director_profiles")
    .update(profilePatch)
    .eq("director_id", user.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(formatProfileSyncError(updateError));
  }

  return updated;
}

export async function getCurrentAppSession(): Promise<AppSession | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await syncCurrentUserProfile(user);
  return { user, profile };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getCurrentAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export function isAdmin(profile: DirectorProfileRow) {
  return profile.role === "admin";
}
