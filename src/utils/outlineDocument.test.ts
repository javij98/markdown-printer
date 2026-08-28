import { describe, expect, it, vi } from 'vitest'
import { loadOutlineDocument, parseOutlineDocumentId } from './outlineDocument'

describe('Outline document integration', () => {
  it('extracts and decodes a document id from the Print Studio route', () => {
    expect(parseOutlineDocumentId('/print/document/doc%3A123')).toBe('doc:123')
    expect(parseOutlineDocumentId('/print/document/abc-123/')).toBe('abc-123')
  })

  it('ignores unrelated or malformed routes', () => {
    expect(parseOutlineDocumentId('/print/')).toBeNull()
    expect(parseOutlineDocumentId('/print/document/')).toBeNull()
    expect(parseOutlineDocumentId('/print/document/%E0%A4%A')).toBeNull()
  })

  it('loads the Outline body and prepends its separate title', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      document: {
        id: 'doc-1',
        title: '  Trabajo   universitario  ',
        text: 'Introducción\n\nContenido',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(loadOutlineDocument('doc/1', fetcher)).resolves.toEqual({
      id: 'doc-1',
      name: 'Trabajo universitario',
      markdown: '# Trabajo universitario\n\nIntroducción\n\nContenido',
    })

    expect(fetcher).toHaveBeenCalledWith(
      '/print/api/documents/doc%2F1',
      {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      },
    )
  })

  it('surfaces the error returned by the authenticated endpoint', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: 'No tienes acceso al documento',
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(loadOutlineDocument('doc-1', fetcher)).rejects.toThrow(
      'No tienes acceso al documento',
    )
  })

  it('rejects an invalid successful response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      document: {},
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(loadOutlineDocument('doc-1', fetcher)).rejects.toThrow(
      'Respuesta no válida de Outline',
    )
  })
})
