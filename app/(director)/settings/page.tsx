import Image from "next/image";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAppSession } from "@/lib/auth/session";
import { getDirectorBranding } from "@/lib/db/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 2 * 1024 * 1024;

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
  const branding = await getDirectorBranding(session.user.id);

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
              Roles are assigned through Postgres-backed profile records and are
              not self-editable here.
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
    </div>
  );
}
