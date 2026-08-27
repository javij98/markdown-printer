const NOTICE_TYPES = ["info", "tip", "warning", "success"] as const;

type NoticeType = (typeof NOTICE_TYPES)[number];

function noticeIcon(type: NoticeType): string {
  switch (type) {
    case "tip":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 2.75 2.15 5.1 5.52.47-4.19 3.62 1.27 5.38L12 14.46l-4.75 2.86 1.27-5.38-4.19-3.62 5.52-.47L12 2.75Z" fill="currentColor" />
        </svg>`;

    case "warning":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5 21 20H3L12 3.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          <path d="M12 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>`;

    case "success":
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="m8 12.2 2.55 2.55L16.5 8.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>`;

    default:
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 10.5v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
        </svg>`;
  }
}

export const outlineNoticePlugin = {
  extensions: [
    {
      name: "outlineNotice",
      level: "block" as const,

      start(src: string) {
        return src.match(
          /^:::(?:info|tip|warning|success)[^\S\r\n]*$/m,
        )?.index;
      },

      tokenizer(this: any, src: string) {
        const match =
          /^:::(info|tip|warning|success)[^\S\r\n]*\r?\n([\s\S]*?)\r?\n:::[^\S\r\n]*(?:\r?\n|$)/i.exec(
            src,
          );

        if (!match) {
          return;
        }

        const noticeType = match[1].toLowerCase() as NoticeType;
        const token: any = {
          type: "outlineNotice",
          raw: match[0],
          noticeType,
          tokens: [],
        };

        this.lexer.blockTokens(match[2], token.tokens);
        return token;
      },

      renderer(this: any, token: any) {
        const type = token.noticeType as NoticeType;
        return `
          <aside class="outline-notice outline-notice-${type}" role="note">
            <span class="outline-notice-icon" aria-hidden="true">${noticeIcon(type)}</span>
            <div class="outline-notice-content">${this.parser.parse(token.tokens)}</div>
          </aside>`;
      },
    },
  ],
};
