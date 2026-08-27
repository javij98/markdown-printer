import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarkdown } from "../composables/useMarkdown";
import { parseOutlineImageTitle } from "./outlineImages";

async function render(markdown: string): Promise<string> {
  vi.useFakeTimers();
  const { renderedHtml, error } = useMarkdown(ref(markdown));
  await vi.advanceTimersByTimeAsync(200);
  expect(error.value).toBeNull();
  return renderedHtml.value;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Outline Markdown renderer", () => {
  it("renders notices without adding an artificial title", async () => {
    const html = await render(`:::tip
Texto con **negrita** y una lista:

- uno
- dos
:::`);

    expect(html).toContain('class="outline-notice outline-notice-tip"');
    expect(html).toContain("<strong>negrita</strong>");
    expect(html).toContain("<ul");
    expect(html).not.toContain(">Tip<");
  });

  it("prints nested toggles fully expanded", async () => {
    const html = await render(`+++
Título principal

Contenido visible

+++
Título anidado

Contenido anidado
+++
+++`);

    expect(html.match(/class="outline-toggle"/g)).toHaveLength(2);
    expect(html).toContain("Título principal");
    expect(html).toContain("Contenido anidado");
    expect(html).not.toContain("+++");
  });

  it("preserves Outline image layout, dimensions, and caption", async () => {
    const html = await render(
      '![Pie de imagen](./imagen.jpg "right-50 =600x400")',
    );

    expect(html).toContain("outline-image-right-50");
    expect(html).toContain('width="600"');
    expect(html).toContain('height="400"');
    expect(html).toContain('class="outline-image-caption">Pie de imagen</span>');
    expect(html).not.toContain('title="=600x400"');
  });

  it("renders checked and unchecked Outline checklist items", async () => {
    const html = await render(`- [ ] Pendiente
- [x] Terminado`);

    expect(html).toContain('data-checked="false"');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('class="outline-checkbox"');
    expect(html).toContain('class="outline-checkbox-tick"');
  });
});

describe("parseOutlineImageTitle", () => {
  it("keeps a human title alongside Outline metadata", () => {
    expect(parseOutlineImageTitle("Diagrama right-50 =640x360")).toEqual({
      layout: "right-50",
      title: "Diagrama",
      width: 640,
      height: 360,
    });
  });
});
