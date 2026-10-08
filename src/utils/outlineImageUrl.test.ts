import { describe, expect, it } from 'vitest'
import { resolveOutlineImageUrl } from './outlineImageUrl'

const id = '90ac18e4-a7ac-44e8-82e3-905380cc686f'
const base = 'https://outline.example.com'

describe('private Outline image URLs', () => {
  it.each([
    `/api/attachments.redirect?id=${id}`,
    `${base}/api/attachments.redirect?id=${id}`,
    `${base}/api/attachments.redirect?download=false&id=${id}`,
  ])('resolves %s using the Print Studio session', (href) => {
    expect(resolveOutlineImageUrl(href, base)).toBe(`/print/api/attachments/${id}`)
  })

  it.each([
    `https://other.example.com/api/attachments.redirect?id=${id}`,
    `https://outline.example.com.evil.test/api/attachments.redirect?id=${id}`,
    `https://user:password@outline.example.com/api/attachments.redirect?id=${id}`,
    '/api/attachments.redirect?id=invalid',
    `/print/api/attachments/${id}`,
    './imagen.jpg',
    'blob:https://outline.example.com/local-image',
    'data:image/png;base64,iVBORw0KGgo=',
  ])('preserves sources outside the private attachment route: %s', (href) => {
    expect(resolveOutlineImageUrl(href, base)).toBe(href)
  })
})
