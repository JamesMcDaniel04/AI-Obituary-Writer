import { escapeHtml } from "@/lib/utils";

type ObituaryHtmlProps = {
  fullName: string;
  familyName: string;
  contentHtml: string;
};

export function renderObituaryHtml({
  fullName,
  familyName,
  contentHtml,
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
        padding: 72px 64px 80px;
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
      <div class="eyebrow">Obituary</div>
      <h1>${escapeHtml(fullName || familyName)}</h1>
      <div class="rule"></div>
      <section class="content">${contentHtml}</section>
    </main>
  </body>
</html>`;
}
