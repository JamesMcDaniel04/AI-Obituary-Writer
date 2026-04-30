import { escapeHtml } from "@/lib/utils";

export const DELIVERY_PLACEHOLDERS = [
  "full_name",
  "family_name",
  "director_name",
  "organization_name",
  "share_link",
] as const;

export type DeliveryPlaceholder = (typeof DELIVERY_PLACEHOLDERS)[number];

export type DeliveryVars = Record<DeliveryPlaceholder, string>;

export const DELIVERY_PLACEHOLDER_META: Record<
  DeliveryPlaceholder,
  { label: string; description: string; example: string }
> = {
  full_name: {
    label: "Full name",
    description: "The deceased's full name from intake.",
    example: "Margaret Rivera",
  },
  family_name: {
    label: "Family name",
    description: "The family name on the case.",
    example: "Rivera",
  },
  director_name: {
    label: "Your name",
    description: "Director's full name from profile.",
    example: "Jamie Rivera",
  },
  organization_name: {
    label: "Organization",
    description: "Funeral home name from branding.",
    example: "Rivera Memorial Home",
  },
  share_link: {
    label: "Share link",
    description: "Public link to the finished obituary.",
    example: "https://…/o/abc123",
  },
};

export const DEFAULT_DELIVERY_TEMPLATE = {
  subject: "{{full_name}} — final obituary",
  body: [
    "Dear {{family_name}} family,",
    "",
    "Please find the final obituary for {{full_name}} ready to view at the link below. A printable copy is attached as a PDF for your records.",
    "",
    "{{share_link}}",
    "",
    "If anything needs adjusting, reply to this message and we'll take another pass.",
    "",
    "With sympathy,",
    "{{director_name}}",
    "{{organization_name}}",
  ].join("\n"),
};

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function renderDeliveryTemplate(
  template: { subject: string; body: string },
  vars: DeliveryVars,
) {
  const substitute = (input: string) =>
    input.replaceAll(PLACEHOLDER_PATTERN, (match, raw: string) => {
      const key = raw.toLowerCase() as DeliveryPlaceholder;
      if ((DELIVERY_PLACEHOLDERS as readonly string[]).includes(key)) {
        return vars[key] ?? "";
      }
      return match;
    });

  return {
    subject: substitute(template.subject).trim(),
    body: substitute(template.body),
  };
}

export function deliveryBodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const withLinks = escapeHtml(paragraph).replaceAll(
        /(https?:\/\/[^\s<]+)/g,
        (url) => `<a href="${url}" style="color:#8f5130">${url}</a>`,
      );
      return `<p style="margin:0 0 16px 0">${withLinks.replaceAll("\n", "<br />")}</p>`;
    })
    .join("");
}
