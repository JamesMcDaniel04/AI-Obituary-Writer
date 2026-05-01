import { describe, expect, it } from "vitest";
import {
  DEFAULT_DELIVERY_TEMPLATE,
  DELIVERY_PLACEHOLDERS,
  deliveryBodyToHtml,
  renderDeliveryTemplate,
  type DeliveryVars,
} from "@/lib/delivery/template";

const baseVars: DeliveryVars = {
  full_name: "Margaret Rivera",
  family_name: "Rivera",
  director_name: "Jamie Rivera",
  organization_name: "Rivera Memorial Home",
  share_link: "https://example.com/o/abc",
};

describe("renderDeliveryTemplate", () => {
  it("substitutes every supported placeholder", () => {
    const template = {
      subject: "S {{full_name}} {{family_name}}",
      body: "B {{director_name}} {{organization_name}} {{share_link}}",
    };

    const result = renderDeliveryTemplate(template, baseVars);

    expect(result.subject).toBe("S Margaret Rivera Rivera");
    expect(result.body).toBe(
      "B Jamie Rivera Rivera Memorial Home https://example.com/o/abc",
    );
  });

  it("handles surrounding whitespace inside the braces", () => {
    const result = renderDeliveryTemplate(
      { subject: "{{ full_name }}", body: "{{   share_link   }}" },
      baseVars,
    );

    expect(result.subject).toBe("Margaret Rivera");
    expect(result.body).toBe("https://example.com/o/abc");
  });

  it("substitutes case-insensitively", () => {
    const result = renderDeliveryTemplate(
      { subject: "{{FULL_NAME}}", body: "{{Share_Link}}" },
      baseVars,
    );

    expect(result.subject).toBe("Margaret Rivera");
    expect(result.body).toBe("https://example.com/o/abc");
  });

  it("leaves unknown placeholders intact", () => {
    const result = renderDeliveryTemplate(
      { subject: "{{full_name}} — {{not_a_real_token}}", body: "" },
      baseVars,
    );

    expect(result.subject).toBe("Margaret Rivera — {{not_a_real_token}}");
  });

  it("treats empty placeholder values as empty strings, not undefined", () => {
    const sparseVars: DeliveryVars = {
      ...baseVars,
      organization_name: "",
    };

    const result = renderDeliveryTemplate(
      { subject: "from {{organization_name}}", body: "" },
      sparseVars,
    );

    expect(result.subject).toBe("from");
  });

  it("renders the default template without leftover braces", () => {
    const result = renderDeliveryTemplate(DEFAULT_DELIVERY_TEMPLATE, baseVars);

    expect(result.subject).toContain("Margaret Rivera");
    expect(result.subject).not.toMatch(/\{\{|\}\}/);
    expect(result.body).toContain("https://example.com/o/abc");
    expect(result.body).not.toMatch(/\{\{|\}\}/);
  });

  it("DELIVERY_PLACEHOLDERS exposes every key referenced in DEFAULT_DELIVERY_TEMPLATE", () => {
    const referenced = new Set<string>();
    const pattern = /\{\{\s*([a-z_]+)\s*\}\}/gi;
    for (const source of [
      DEFAULT_DELIVERY_TEMPLATE.subject,
      DEFAULT_DELIVERY_TEMPLATE.body,
    ]) {
      for (const match of source.matchAll(pattern)) {
        referenced.add(match[1].toLowerCase());
      }
    }

    for (const token of referenced) {
      expect(DELIVERY_PLACEHOLDERS).toContain(token);
    }
  });
});

describe("deliveryBodyToHtml", () => {
  it("wraps blank-line-separated paragraphs in <p>", () => {
    const html = deliveryBodyToHtml("First line.\n\nSecond line.");
    expect(html).toContain("<p");
    expect(html.match(/<p[^>]*>/g)?.length).toBe(2);
  });

  it("turns single newlines into <br />", () => {
    const html = deliveryBodyToHtml("Line one\nLine two");
    expect(html).toContain("<br />");
  });

  it("escapes HTML in the source body", () => {
    const html = deliveryBodyToHtml('"<script>" alert');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("auto-links bare http(s) URLs", () => {
    const html = deliveryBodyToHtml("Visit https://example.com/o/abc today.");
    expect(html).toContain('href="https://example.com/o/abc"');
  });
});
