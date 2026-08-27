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

    expect(advancedPrintClasses(style)).toEqual([])
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
      hyphenate: true,
      lineHeight: 1.75,
      paragraphSpacing: 1.1,
      blockSpacing: 1.45,
      codeRadius: 12,
    }

    expect(advancedPrintClasses(style)).toEqual([
      'print-advanced',
      'print-code-accent',
      'print-code-borderless',
      'print-heading-dividers',
      'print-justify',
      'print-hyphenate',
    ])

    expect(advancedPrintVariables(style)).toMatchObject({
      '--print-accent': '#123456',
      '--print-line-height': '1.75',
      '--print-paragraph-spacing': '1.1em',
      '--print-block-spacing': '1.45em',
      '--print-code-radius': '12px',
    })
    expect(advancedPrintStyleAttribute(style)).toContain('--print-accent:#123456')
  })
})
