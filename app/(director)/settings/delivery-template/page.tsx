import { revalidatePath } from "next/cache";
import { requireAppSession } from "@/lib/auth/session";
import { DeliveryPlaceholderChips } from "@/components/settings/delivery-placeholder-chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deliverySchemaReady,
  getDeliveryTemplateOrDefault,
} from "@/lib/db/queries";
import { DEFAULT_DELIVERY_TEMPLATE } from "@/lib/delivery/template";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeliveryTemplatePage() {
  const session = await requireAppSession();
  const schemaReady = await deliverySchemaReady();
  const template = await getDeliveryTemplateOrDefault(session.user.id);

  async function saveAction(formData: FormData) {
    "use server";

    const actionSession = await requireAppSession();
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    if (!subject) {
      throw new Error("Subject is required.");
    }

    if (!body) {
      throw new Error("Body is required.");
    }

    const actionSupabase = await createServerSupabaseClient();
    const { error } = await actionSupabase
      .from("delivery_templates")
      .upsert(
        {
          director_id: actionSession.user.id,
          subject,
          body,
        },
        { onConflict: "director_id" },
      );

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/delivery-template");
  }

  async function resetAction() {
    "use server";

    const actionSession = await requireAppSession();
    const actionSupabase = await createServerSupabaseClient();
    const { error } = await actionSupabase
      .from("delivery_templates")
      .upsert(
        {
          director_id: actionSession.user.id,
          subject: DEFAULT_DELIVERY_TEMPLATE.subject,
          body: DEFAULT_DELIVERY_TEMPLATE.body,
        },
        { onConflict: "director_id" },
      );

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/delivery-template");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Card className="fade-up space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Delivery template
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground">
            The email families receive at delivery.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            This template generates the subject and body when a case is
            delivered. The PDF is attached automatically and a public link to
            the obituary is included via{" "}
            <span className="font-mono text-foreground">{`{{share_link}}`}</span>
            . You'll have a chance to review and edit the message for each
            individual case before it sends.
          </p>
        </div>

        {!schemaReady ? (
          <div className="rounded-[1.5rem] border border-dashed border-warning/40 bg-warning/5 p-5 text-sm leading-6 text-foreground">
            Delivery tables are missing. Apply{" "}
            <span className="font-mono">
              supabase/migrations/0005_delivery_templates.sql
            </span>{" "}
            and reload before saving — defaults are shown below for preview.
          </div>
        ) : null}

        <DeliveryPlaceholderChips />

        <form action={saveAction} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Subject</span>
            <Input
              name="subject"
              required
              defaultValue={template.subject}
              placeholder={DEFAULT_DELIVERY_TEMPLATE.subject}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Body</span>
            <Textarea
              name="body"
              required
              defaultValue={template.body}
              placeholder={DEFAULT_DELIVERY_TEMPLATE.body}
              className="min-h-72 font-mono text-sm leading-6"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!schemaReady}>
              Save template
            </Button>
          </div>
        </form>

        <form action={resetAction}>
          <Button type="submit" variant="secondary" disabled={!schemaReady}>
            Reset to default
          </Button>
        </form>
      </Card>
    </div>
  );
}
