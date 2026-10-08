export interface LoadedOutlineDocument {
  id: string
  name: string
  markdown: string
}

type Fetcher = typeof fetch

export function parseOutlineDocumentId(pathname: string): string | null {
  const match = pathname.match(/^\/print\/document\/([^/]+)\/?$/)
  if (!match) return null

  try {
    const id = decodeURIComponent(match[1]).trim()
    return id || null
  } catch {
    return null
  }
}

export async function loadOutlineDocument(
  documentId: string,
  fetcher: Fetcher = fetch,
): Promise<LoadedOutlineDocument> {
  const response = await fetcher(
    `/print/api/documents/${encodeURIComponent(documentId)}`,
    {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    let message = `Error ${response.status}`

    try {
      const payload = await response.json()
      message = payload?.error || message
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }

    throw new Error(message)
  }

  const payload = await response.json()
  const document = payload?.document

  if (!document?.id) {
    throw new Error('Respuesta no válida de Outline')
  }

  const title = String(document.title || 'Sin título')
    .replace(/\s+/g, ' ')
    .trim()

  const body = String(document.text || '')
  const markdown = title ? `# ${title}\n\n${body}` : body

  return {
    id: String(document.id),
    name: title || 'Documento de Outline',
    markdown,
  }
}
