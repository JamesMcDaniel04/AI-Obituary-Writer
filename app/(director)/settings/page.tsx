import Image from "next/image";
import { revalidatePath } from "next/cache";
import { isAdmin, requireAppSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getDirectorBranding,
  listDirectorProfilesForCurrentUser,
} from "@/lib/db/queries";
import type { Database } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 2 * 1024 * 1024;
const APP_ROLES = ["director", "admin"] as const satisfies ReadonlyArray<
  Database["public"]["Enums"]["app_role"]
>;
type AppRole = Database["public"]["Enums"]["app_role"];

function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

function roleCopy(role: AppRole) {
  switch (role) {
    case "admin":
      return "Can review every case and edit workspace RBAC.";
    case "director":
      return "Works inside their own cases and drafts.";
  }
}

function extensionFor(mime: string) {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

export default async function SettingsPage() {
  const session = await requireAppSession();
  const adminMode = isAdmin(session.profile);
  const branding = await getDirectorBranding(session.user.id);
  const workspaceProfiles = adminMode
    ? await listDirectorProfilesForCurrentUser()
    : [];

  async function saveSettingsAction(formData: FormData) {
    "use server";

    const actionSession = await requireAppSession();
    const actionSupabase = await createServerSupabaseClient();

    const fullName = String(formData.get("fullName") ?? "").trim();
    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const file = formData.get("logo");
    const removeLogo = formData.get("removeLogo") === "on";

    let nextLogoPath = actionSession.profile.logo_path;

    if (removeLogo && nextLogoPath) {
      const { error: removeError } = await actionSupabase.storage
        .from("director-logos")
        .remove([nextLogoPath]);

      if (removeError) {
        throw new Error(removeError.message);
      }

      nextLogoPath = null;
    }

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Logo must be a PNG, JPEG, WebP, or SVG image.");
      }

      if (file.size > MAX_BYTES) {
        throw new Error("Logo must be 2 MB or smaller.");
      }

      if (nextLogoPath) {
        const { error: removeError } = await actionSupabase.storage
          .from("director-logos")
          .remove([nextLogoPath]);

        if (removeError) {
          throw new Error(removeError.message);
        }
      }

      const path = `${actionSession.user.id}/logo-${Date.now()}.${extensionFor(file.type)}`;
      const { error: uploadError } = await actionSupabase.storage
        .from("director-logos")
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      nextLogoPath = path;
    }

    const { error: upsertError } = await actionSupabase
      .from("director_profiles")
      .upsert(
        {
          director_id: actionSession.user.id,
          email: actionSession.user.email ?? null,
          full_name: fullName || null,
          organization_name: organizationName || null,
          logo_path: nextLogoPath,
        },
        { onConflict: "director_id" },
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    revalidatePath("/settings");
    revalidatePath("/branding");
    revalidatePath("/dashboard");
    revalidatePath("/cases");
  }

  async function updateRoleAction(formData: FormData) {
    "use server";

    const actionSession = await requireAppSession();

    if (!isAdmin(actionSession.profile)) {
      throw new Error("Only admins can edit workspace roles.");
    }

    const directorId = String(formData.get("directorId") ?? "").trim();
    const nextRoleInput = String(formData.get("role") ?? "").trim();

    if (!directorId) {
      throw new Error("A target profile is required.");
    }

    if (!isAppRole(nextRoleInput)) {
      throw new Error("That role is not valid for this workspace.");
    }

    const nextRole: AppRole = nextRoleInput;

    const actionSupabase = await createServerSupabaseClient();
    const { data: targetProfile, error: targetError } = await actionSupabase
      .from("director_profiles")
      .select("*")
      .eq("director_id", directorId)
      .single();

    if (targetError) {
      throw new Error(targetError.message);
    }

    if (targetProfile.role === nextRole) {
      return;
    }

    if (targetProfile.role === "admin" && nextRole === "director") {
      const { data: adminProfiles, error: adminError } = await actionSupabase
        .from("director_profiles")
        .select("director_id")
        .eq("role", "admin");

      if (adminError) {
        throw new Error(adminError.message);
      }

      if ((adminProfiles?.length ?? 0) <= 1) {
        throw new Error("The last admin cannot be changed to director.");
      }
    }

    const { error: updateError } = await actionSupabase
      .from("director_profiles")
      .update({ role: nextRole })
      .eq("director_id", directorId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/cases");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Card className="fade-up space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Settings
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Profile and workspace settings.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Update the name shown in your workspace, keep your organization
            branding current, and confirm which role this account has in the
            RBAC model.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Email
            </p>
            <p className="mt-2 text-sm text-foreground">
              {session.profile.email ?? session.user.email ?? "Not available"}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Role
            </p>
            <p className="mt-2 text-sm capitalize text-foreground">
              {session.profile.role}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted">
              {adminMode
                ? "This account can update RBAC assignments below."
                : "Roles are assigned through Postgres-backed profile records and are not self-editable here."}
            </p>
          </div>
        </div>

        <form
          action={saveSettingsAction}
          className="space-y-5"
          encType="multipart/form-data"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Full name
            </span>
            <Input
              name="fullName"
              placeholder="Jamie Rivera"
              defaultValue={session.profile.full_name ?? ""}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Organization name
            </span>
            <Input
              name="organizationName"
              placeholder="Rivera Memorial Home"
              defaultValue={session.profile.organization_name ?? ""}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Logo image
            </span>
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="block w-full rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-foreground"
            />
            <span className="block text-xs text-muted">
              PNG, JPEG, WebP, or SVG. 2 MB max.
            </span>
          </label>

          {branding?.logo_url ? (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-white/70 p-4">
              <Image
                src={branding.logo_url}
                alt="Current logo"
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-lg object-contain"
              />
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="removeLogo" />
                Remove current logo
              </label>
            </div>
          ) : null}

          <Button type="submit">Save settings</Button>
        </form>
      </Card>

      {adminMode ? (
        <Card className="fade-up space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted">
              Postgres RBAC
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground">
              Edit workspace roles from the frontend.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
              These controls write directly to
              <span className="mx-1 font-mono text-foreground">
                director_profiles.role
              </span>
              and immediately affect the RBAC checks used by Postgres policies.
            </p>
          </div>

          <div className="space-y-4">
            {workspaceProfiles.map((profile) => {
              const label =
                profile.full_name?.trim() ||
                profile.email?.trim() ||
                profile.director_id;
              const isCurrentUser = profile.director_id === session.user.id;

              return (
                <form
                  key={profile.director_id}
                  action={updateRoleAction}
                  className="rounded-[1.5rem] border border-border bg-white/75 p-5"
                >
                  <input
                    type="hidden"
                    name="directorId"
                    value={profile.director_id}
                  />

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {label}
                        </p>
                        {isCurrentUser ? (
                          <Badge>Current account</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {profile.email ?? "No email on file"}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-muted">
                        {roleCopy(profile.role)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      <label className="block space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted">
                          Role
                        </span>
                        <select
                          name="role"
                          defaultValue={profile.role}
                          className="h-12 min-w-[11rem] rounded-2xl border border-border bg-white/85 px-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
                        >
                          {APP_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button type="submit" variant="secondary">
                        Save role
                      </Button>
                    </div>
                  </div>
                </form>
              );
            })}
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-border bg-white/60 px-5 py-4 text-xs leading-6 text-muted">
            Users appear here after their first successful sign-in. The last
            admin account cannot be demoted from this interface.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
