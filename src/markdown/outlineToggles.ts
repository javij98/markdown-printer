function findClosingFence(src: string, fence: string): number {
  const escapedFence = fence.replace(/\+/g, "\\+");
  const closingPattern = new RegExp(`^${escapedFence}[^\\S\\r\\n]*(?:\\r?\\n|$)`, "m");
  const openingLineEnd = src.indexOf("\n") + 1;
  const match = closingPattern.exec(src.slice(openingLineEnd));

  return match ? openingLineEnd + match.index : -1;
}

export const outlineTogglePlugin = {
  extensions: [
    {
      name: "outlineToggle",
      level: "block" as const,

      start(src: string) {
        return src.match(/^\+{3,}[^\S\r\n]*$/m)?.index;
      },

      tokenizer(this: any, src: string) {
        const opening = /^(\+{3,})[^\S\r\n]*\r?\n/.exec(src);
        if (!opening) {
          return;
        }

        const closingStart = findClosingFence(src, opening[1]);
        if (closingStart < 0) {
          return;
        }

        const closing = new RegExp(
          `^${opening[1].replace(/\+/g, "\\+")}[^\\S\\r\\n]*(?:\\r?\\n|$)`,
        ).exec(src.slice(closingStart));
        if (!closing) {
          return;
        }

        const raw = src.slice(0, closingStart + closing[0].length);
        const body = src.slice(opening[0].length, closingStart).replace(/\r?\n$/, "");
        const token: any = {
          type: "outlineToggle",
          raw,
          tokens: [],
        };

        this.lexer.blockTokens(body, token.tokens);
        return token;
      },

      renderer(this: any, token: any) {
        const [title, ...body] = token.tokens;
        const titleHtml = title ? this.parser.parse([title]) : "";
        const bodyHtml = body.length ? this.parser.parse(body) : "";

        return `
          <section class="outline-toggle">
            <span class="outline-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20"><path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
            <div class="outline-toggle-content">
              <div class="outline-toggle-title">${titleHtml}</div>
              <div class="outline-toggle-body">${bodyHtml}</div>
            </div>
          </section>`;
      },
    },
  ],
};
