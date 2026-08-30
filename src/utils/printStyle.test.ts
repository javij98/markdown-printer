import { describe, expect, it } from 'vitest'
import { DEFAULT_ADVANCED_PRINT_STYLE } from './constants'
import {
  advancedPrintClasses,
  advancedPrintStyleAttribute,
  advancedPrintVariables,
} from './printStyle'

describe('advanced print styles', () => {
  it('does not override a preset while advanced mode is disabled', () => {
    const style = { ...DEFAULT_ADVANCED_PRINT_STYLE }

    expect(advancedPrintClasses(style)).toEqual(['print-align-start'])
    expect(advancedPrintVariables(style)).toEqual({})
    expect(advancedPrintStyleAttribute(style)).toBe('')
  })

  it('maps enabled settings to print classes and CSS variables', () => {
    const style = {
      ...DEFAULT_ADVANCED_PRINT_STYLE,
      enabled: true,
      accentColor: '#123456',
      codeAccent: true,
      codeBorder: false,
      headingDividers: true,
      justifyText: true,
      textAlignment: 'justify' as const,
      hyphenate: true,
      lineHeight: 1.75,
      paragraphSpacing: 1.1,
      blockSpacing: 1.45,
      zebraTables: true,
      underlineLinks: false,
      codeRadius: 12,
      tableHeaderShade: false,
    }

    expect(advancedPrintClasses(style)).toEqual([
      'print-align-justify',
      'print-advanced',
      'print-code-accent',
      'print-code-borderless',
      'print-table-plain',
      'print-table-zebra',
      'print-links-plain',
      'print-heading-dividers',
      'print-hyphenate',
    ])

    expect(advancedPrintVariables(style)).toMatchObject({
      '--print-accent': '#123456',
      '--print-line-height': '1.75',
      '--print-paragraph-spacing': '1.1em',
      '--print-block-spacing': '1.45em',
      '--print-code-radius': '12px',
      '--print-heading-scale': '1',
      '--print-code-font-scale': '1',
      '--print-heading-spacing': '1',
      '--print-code-line-height': '1.5',
      '--print-list-spacing': '0.3em',
      '--print-table-cell-padding': '0.45em',
    })
    expect(advancedPrintStyleAttribute(style)).toContain('--print-accent:#123456')
  })
})
