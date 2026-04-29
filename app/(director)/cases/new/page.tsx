import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function NewCasePage() {
  async function createCaseAction(formData: FormData) {
    "use server";

    const familyName = String(formData.get("familyName") ?? "").trim();

    if (!familyName) {
      throw new Error("Family name is required.");
    }

    const session = await requireAppSession();
    const supabase = await createServerSupabaseClient();

    const questionnaireToken = randomUUID().replaceAll("-", "");
    const { data, error } = await supabase
      .from("cases")
      .insert({
        director_id: session.user.id,
        family_name: familyName,
        questionnaire_token: questionnaireToken,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/cases/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <Card className="fade-up">
        <p className="text-sm uppercase tracking-[0.24em] text-muted">
          New case
        </p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">
          Start with the family name.
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          As soon as the case is created, the questionnaire link is ready to
          copy and send through your own channel.
        </p>

        <form action={createCaseAction} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Family name
            </span>
            <Input
              required
              name="familyName"
              placeholder="Rivera family"
            />
          </label>
          <Button type="submit">Create case</Button>
        </form>
      </Card>
    </div>
  );
}
