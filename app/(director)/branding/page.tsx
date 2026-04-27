import Image from "next/image";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDirectorBranding } from "@/lib/db/queries";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
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

export default async function BrandingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const branding = await getDirectorBranding(user.id);
  const directorId = user.id;

  async function saveBrandingAction(formData: FormData) {
    "use server";

    const actionSupabase = await createServerSupabaseClient();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const file = formData.get("logo");
    const removeLogo = formData.get("removeLogo") === "on";

    const admin = createAdminSupabaseClient();
    const existing = await getDirectorBranding(actionUser.id);

    let nextLogoPath = existing?.logo_path ?? null;

    if (removeLogo && nextLogoPath) {
      await admin.storage.from("director-logos").remove([nextLogoPath]);
      nextLogoPath = null;
    }

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Logo must be a PNG, JPEG, WebP, or SVG image.");
      }

      if (file.size > MAX_BYTES) {
        throw new Error("Logo must be 2 MB or smaller.");
      }

      if (existing?.logo_path) {
        await admin.storage.from("director-logos").remove([existing.logo_path]);
      }

      const path = `${actionUser.id}/logo-${Date.now()}.${extensionFor(file.type)}`;
      const { error: uploadError } = await admin.storage
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

    const { error: upsertError } = await admin
      .from("director_profiles")
      .upsert(
        {
          director_id: actionUser.id,
          organization_name: organizationName || null,
          logo_path: nextLogoPath,
        },
        { onConflict: "director_id" },
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    revalidatePath("/branding");
    revalidatePath("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Card className="fade-up space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Branding
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            Add your funeral home logo.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Your logo and organization name appear in the questionnaire header
            families see and at the top of every exported PDF. They do not
            appear on emails sent through your own channel.
          </p>
        </div>

        <form
          action={saveBrandingAction}
          className="space-y-5"
          encType="multipart/form-data"
        >
          <input type="hidden" name="directorId" value={directorId} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Organization name
            </span>
            <Input
              name="organizationName"
              placeholder="Rivera Memorial Home"
              defaultValue={branding?.organization_name ?? ""}
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

          <Button type="submit">Save branding</Button>
        </form>
      </Card>
    </div>
  );
}
