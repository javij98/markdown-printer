/** Resolve private attachments through Print Studio without changing the Markdown. */
export function resolveOutlineImageUrl(href: string, baseUrl = window.location.origin): string {
  try {
    const base = new URL(baseUrl)
    const url = new URL(href, base)
    const id = url.searchParams.get('id')

    if (
      url.origin === base.origin &&
      url.pathname === '/api/attachments.redirect' &&
      !url.username && !url.password &&
      id && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
    ) {
      return `/print/api/attachments/${id}`
    }
  } catch {
    // Keep local gallery URLs and other sources as they were supplied.
  }

  return href
}
