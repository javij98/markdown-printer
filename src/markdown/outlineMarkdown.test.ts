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

  it("loads private Outline images through the authenticated Print Studio route", async () => {
    const id = "90ac18e4-a7ac-44e8-82e3-905380cc686f";
    for (const url of [
      `/api/attachments.redirect?id=${id}`,
      `${window.location.origin}/api/attachments.redirect?id=${id}`,
    ]) {
      const html = await render(`![Diagrama](${url} "right-50 =600x400")`);
      expect(html).toContain(`src="/print/api/attachments/${id}"`);
      expect(html).toContain("outline-image-right-50");
      expect(html).toContain('width="600"');
      expect(html).toContain('height="400"');
      expect(html).toContain('class="outline-image-caption">Diagrama</span>');
    }
  });

  it.each(["left", "right"])("keeps a %s image and adjacent text in a block that pagination can measure", async (side) => {
    const html = await render(`![Pie](./imagen.png "${side}-50 =360x480")\n\nTexto junto a la imagen.\n\n## Siguiente sección`);
    const container = document.createElement("div");
    container.innerHTML = html;
    const group = container.querySelector(".outline-image-group");
    expect(group).not.toBeNull();
    expect(group?.querySelector(`.outline-image-${side}-50`)).not.toBeNull();
    expect(group?.textContent).toContain("Texto junto a la imagen.");
    expect(group?.querySelector("h2")).toBeNull();
  });

  it("keeps the image section heading with its floated image at a page break", async () => {
    const html = await render(`## Imagen vertical\n\n![Pie](./imagen.png "left-50 =360x480")\n\nTexto contiguo.\n\n## Otra sección`);
    const container = document.createElement("div");
    container.innerHTML = html;
    const group = container.querySelector(".outline-image-group");
    expect(group?.firstElementChild?.tagName).toBe("H2");
    expect(group?.querySelector("h2")?.textContent).toBe("Imagen vertical");
    expect(group?.textContent).not.toContain("Otra sección");
  });

  it("keeps several editable paragraphs and a list beside an Outline image", async () => {
    const html = await render('![Pie](./imagen.png "left-50 =360x480")\n\nPrimer párrafo.\n\nSegundo párrafo.\n\n- Un elemento\n\n## Fin');
    const container = document.createElement('div');
    container.innerHTML = html;
    const group = container.querySelector('.outline-image-group');
    expect(group?.textContent).toContain('Segundo párrafo.');
    expect(group?.querySelector('ul')?.textContent).toContain('Un elemento');
    expect(group?.textContent).not.toContain('Fin');
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
