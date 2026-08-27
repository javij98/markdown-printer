import type { CSSProperties } from 'vue'
import type { AdvancedPrintStyle } from './types'

export function advancedPrintClasses(style: AdvancedPrintStyle): string[] {
  if (!style.enabled) return []

  return [
    'print-advanced',
    style.codeAccent ? 'print-code-accent' : '',
    style.codeBorder ? 'print-code-border' : 'print-code-borderless',
    style.tableHeaderShade ? 'print-table-shaded' : 'print-table-plain',
    style.headingDividers ? 'print-heading-dividers' : '',
    style.justifyText ? 'print-justify' : '',
    style.hyphenate ? 'print-hyphenate' : '',
  ].filter(Boolean)
}

export function advancedPrintVariables(style: AdvancedPrintStyle): CSSProperties {
  if (!style.enabled) return {}

  return {
    '--print-accent': style.accentColor,
    '--print-text': style.textColor,
    '--print-heading-color': style.headingColor,
    '--print-muted': style.mutedColor,
    '--print-border': style.borderColor,
    '--print-code-bg': style.codeBackground,
    '--print-line-height': String(style.lineHeight),
    '--print-paragraph-spacing': `${style.paragraphSpacing}em`,
    '--print-block-spacing': `${style.blockSpacing}em`,
    '--print-code-radius': `${style.codeRadius}px`,
    '--print-heading-scale': String(style.headingScale),
    '--print-code-font-scale': String(style.codeFontScale),
  } as CSSProperties
}

export function advancedPrintStyleAttribute(style: AdvancedPrintStyle): string {
  return Object.entries(advancedPrintVariables(style))
    .map(([property, value]) => `${property}:${String(value)}`)
    .join(';')
}
