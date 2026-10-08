import { resolveOutlineImageUrl } from '../utils/outlineImageUrl';

interface OutlineImageAttributes {
  layout?: "left-50" | "right-50" | "full-width";
  title?: string;
  width?: number;
  height?: number;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function parseOutlineImageTitle(title?: string | null): OutlineImageAttributes {
  if (!title) {
    return {};
  }

  let remaining = title.trim();
  const layoutMatch = remaining.match(/(?:^|\s)(right-50|left-50|full-width)(?=\s|$)/);
  const sizeMatch = remaining.match(/\s*=([0-9]*)x([0-9]*)\s*$/);
  const attributes: OutlineImageAttributes = {};

  if (sizeMatch) {
    attributes.width = sizeMatch[1] ? Number(sizeMatch[1]) : undefined;
    attributes.height = sizeMatch[2] ? Number(sizeMatch[2]) : undefined;
    remaining = remaining.replace(sizeMatch[0], "").trim();
  }

  if (layoutMatch) {
    attributes.layout = layoutMatch[1] as OutlineImageAttributes["layout"];
    remaining = remaining.replace(layoutMatch[0].trim(), "").trim();
  }

  if (remaining) {
    attributes.title = remaining;
  }

  return attributes;
}

export const outlineImagePlugin = {
  hooks: {
    postprocess(html: string): string {
      if (!/outline-image-(?:left|right)-50/.test(html)) return html;
      const container = document.createElement('div');
      container.innerHTML = html;

      container.querySelectorAll('p > .outline-image-left-50, p > .outline-image-right-50').forEach(image => {
        const paragraph = image.parentElement!;
        if (paragraph.closest('.outline-image-group')) return;
        const previous = paragraph.previousElementSibling;
        let next = paragraph.nextElementSibling;
        const group = document.createElement('div');
        group.className = 'outline-image-group';
        paragraph.before(group);
        if (previous && /^H[1-6]$/.test(previous.tagName)) {
          group.append(previous);
        }
        group.append(paragraph);
        while (next && ['P', 'UL', 'OL', 'BLOCKQUOTE', 'PRE'].includes(next.tagName)
          && !next.querySelector('.outline-image')) {
          const following = next.nextElementSibling;
          group.append(next);
          next = following;
        }
      });

      return container.innerHTML;
    },
  },
  renderer: {
    image({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const attributes = parseOutlineImageTitle(title);
      const layoutClass = attributes.layout
        ? ` outline-image-${attributes.layout}`
        : "";
      const width = attributes.width ? ` width="${attributes.width}"` : "";
      const height = attributes.height ? ` height="${attributes.height}"` : "";
      const titleAttribute = attributes.title
        ? ` title="${escapeAttribute(attributes.title)}"`
        : "";
      const caption = text
        ? `<span class="outline-image-caption">${escapeAttribute(text)}</span>`
        : "";

      return `<span class="outline-image${layoutClass}"><img src="${escapeAttribute(resolveOutlineImageUrl(href))}" alt="${escapeAttribute(text)}"${titleAttribute}${width}${height}>${caption}</span>`;
    },
  },
};
