import { describe, expect, it } from 'vitest'
import { normalizeOutlineEscapedNewlines } from './outlineText'

describe('normalizeOutlineEscapedNewlines', () => {
  it('convierte los saltos escapados que llegan desde Outline', () => {
    expect(normalizeOutlineEscapedNewlines('Primera línea\\nSegunda línea')).toBe(
      'Primera línea\nSegunda línea',
    )
  })

  it('conserva los escapes dentro de código inline', () => {
    expect(normalizeOutlineEscapedNewlines('Usa `\\n` para explicarlo')).toBe(
      'Usa `\\n` para explicarlo',
    )
  })

  it('conserva los escapes dentro de bloques de código', () => {
    const markdown = ['```js', 'const salto = "\\n"', '```'].join('\n')
    expect(normalizeOutlineEscapedNewlines(markdown)).toBe(markdown)
  })

  it('convierte varios saltos escapados en un mismo párrafo', () => {
    expect(normalizeOutlineEscapedNewlines('uno\\ndos\\ntres')).toBe(
      'uno\ndos\ntres',
    )
  })
})
