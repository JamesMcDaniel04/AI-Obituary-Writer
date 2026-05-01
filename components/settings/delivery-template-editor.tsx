"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DELIVERY_TEMPLATE,
  deliveryBodyToHtml,
  renderDeliveryTemplate,
  type DeliveryVars,
} from "@/lib/delivery/template";

const SAMPLE_VARS: DeliveryVars = {
  full_name: "Margaret Rivera",
  family_name: "Rivera",
  director_name: "Jamie Rivera",
  organization_name: "Rivera Memorial Home",
  share_link: "https://example.com/o/sample-link",
};

type DeliveryTemplateEditorProps = {
  initialSubject: string;
  initialBody: string;
  schemaReady: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  resetAction: () => Promise<void>;
};

export function DeliveryTemplateEditor({
  initialSubject,
  initialBody,
  schemaReady,
  saveAction,
  resetAction,
}: DeliveryTemplateEditorProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const preview = useMemo(
    () => renderDeliveryTemplate({ subject, body }, SAMPLE_VARS),
    [subject, body],
  );
  const previewHtml = useMemo(
    () => deliveryBodyToHtml(preview.body),
    [preview.body],
  );

  return (
    <div className="space-y-5">
      <form action={saveAction} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Subject</span>
            <Input
              name="subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={DEFAULT_DELIVERY_TEMPLATE.subject}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Body</span>
            <Textarea
              name="body"
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={DEFAULT_DELIVERY_TEMPLATE.body}
              className="min-h-72 font-mono text-sm leading-6"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!schemaReady}>
              Save template
            </Button>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Live preview
          </p>
          <p className="mt-1 text-xs text-muted">
            Filled with sample family/director values.
          </p>

          <div className="mt-4 space-y-4 rounded-[1.25rem] border border-border bg-white p-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Subject
              </p>
              <p className="mt-1 font-medium text-foreground">
                {preview.subject || (
                  <span className="text-muted">(empty subject)</span>
                )}
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Body
              </p>
              <div
                className="mt-2 font-serif text-sm leading-7 text-foreground"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </aside>
      </form>

      <form action={resetAction}>
        <Button type="submit" variant="secondary" disabled={!schemaReady}>
          Reset to default
        </Button>
      </form>
    </div>
  );
}
