/**
 * Outline sometimes serializes soft line breaks as the two characters "\\n".
 * Convert those sequences only in prose. Code fences and inline code must keep
 * their literal escape sequences intact.
 */
export function normalizeOutlineEscapedNewlines(source: string): string {
  const lines = source.split('\n')
  let fence: string | null = null

  return lines
    .map(line => {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/)
      if (fenceMatch) {
        const marker = fenceMatch[1][0]
        if (!fence) fence = marker
        else if (fence === marker) fence = null
        return line
      }

      if (fence) return line
      return normalizeProseLine(line)
    })
    .join('\n')
}

function normalizeProseLine(line: string): string {
  let result = ''
  let inlineDelimiter = 0

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '`') {
      let run = 1
      while (line[index + run] === '`') run += 1

      if (inlineDelimiter === 0) inlineDelimiter = run
      else if (inlineDelimiter === run) inlineDelimiter = 0

      result += '`'.repeat(run)
      index += run - 1
      continue
    }

    if (
      inlineDelimiter === 0 &&
      line[index] === '\\' &&
      line[index + 1] === 'n'
    ) {
      result += '\n'
      index += 1
      continue
    }

    result += line[index]
  }

  return result
}
