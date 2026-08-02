import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/academy/markdown";

function render(source: string, renderCitation?: (ref: string) => React.ReactNode) {
  return renderToStaticMarkup(
    createElement(Markdown, { source, renderCitation }),
  );
}

describe("Academy Markdown (GFM)", () => {
  it("renders GFM tables as HTML tables", () => {
    const html = render(`
# Beneficios

| Plan | Monto |
| --- | --- |
| Elite Plus | $6,000 |
| Classic | $2,000 |
`);

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("Elite Plus");
    expect(html).toContain("$6,000");
    expect(html).toContain("overflow-x-auto");
  });

  it("renders headings, lists, quotes and safe links", () => {
    const html = render(`
## Resumen

- Uno
- Dos

> Nota importante

Lee la [guía](https://example.com/guide).
`);

    expect(html).toContain("<h2");
    expect(html).toContain("<ul");
    expect(html).toContain("<blockquote");
    expect(html).toContain('href="https://example.com/guide"');
  });

  it("blocks unsafe link schemes", () => {
    const html = render("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("resolves Pulse citation markers via renderCitation", () => {
    const html = render("Según la fuente [S1] el plan paga fijo.", (ref) =>
      createElement("span", { "data-cite": ref }, ref),
    );
    expect(html).toContain('data-cite="S1"');
    expect(html).toContain(">S1<");
  });

  it("returns nothing for blank content", () => {
    expect(render("   \n\n")).toBe("");
  });
});
