import { escapeHtml } from "@/lib/utils";

type ObituaryHtmlProps = {
  fullName: string;
  familyName: string;
  contentHtml: string;
  branding?: {
    organizationName: string | null;
    logoUrl: string | null;
  } | null;
};

function renderBrandingBlock(
  branding: ObituaryHtmlProps["branding"],
): string {
  if (!branding) return "";

  const parts: string[] = [];

  if (branding.logoUrl) {
    parts.push(
      `<img class="brand-logo" src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(
        branding.organizationName ?? "Funeral home logo",
      )}" />`,
    );
  }

  if (branding.organizationName) {
    parts.push(
      `<div class="brand-name">${escapeHtml(branding.organizationName)}</div>`,
    );
  }

  if (parts.length === 0) return "";

  return `<header class="brand">${parts.join("")}</header>`;
}

export function renderObituaryHtml({
  fullName,
  familyName,
  contentHtml,
  branding,
}: ObituaryHtmlProps) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>${escapeHtml(familyName)} obituary</title>
    <style>
      body {
        margin: 0;
        background: #fffdf9;
        color: #241913;
        font-family: Georgia, "Times New Roman", serif;
      }
      .page {
        padding: 56px 64px 80px;
      }
      .brand {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-bottom: 28px;
      }
      .brand-logo {
        max-height: 56px;
        max-width: 160px;
        object-fit: contain;
      }
      .brand-name {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: #6d4326;
      }
      .eyebrow {
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.28em;
        font-size: 11px;
        color: #8f5130;
      }
      h1 {
        margin: 18px 0 14px;
        text-align: center;
        font-size: 34px;
        font-weight: 600;
      }
      .rule {
        width: 120px;
        height: 1px;
        margin: 0 auto 34px;
        background: #c9a78b;
      }
      .content {
        font-size: 15px;
        line-height: 1.9;
      }
      .content p {
        margin: 0;
      }
      .content p + p {
        margin-top: 16px;
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${renderBrandingBlock(branding ?? null)}
      <div class="eyebrow">Obituary</div>
      <h1>${escapeHtml(fullName || familyName)}</h1>
      <div class="rule"></div>
      <section class="content">${contentHtml}</section>
    </main>
  </body>
</html>`;
}
