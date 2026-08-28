import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

interface CodePalette {
  background: string
  foreground: string
  gutter: string
  gutterText: string
  activeLine: string
  activeGutter: string
  activeGutterText: string
  selection: string
  cursor: string
  keyword: string
  string: string
  number: string
  functionName: string
  typeName: string
  comment: string
  variable: string
  punctuation: string
  invalid: string
}

function createCodeTheme(palette: CodePalette, dark: boolean) {
  const chrome = EditorView.theme({
    '&': {
      color: palette.foreground,
      backgroundColor: palette.background,
    },
    '.cm-content': {
      caretColor: palette.cursor,
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: palette.cursor,
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: palette.selection,
    },
    '.cm-activeLine': {
      backgroundColor: palette.activeLine,
    },
    '.cm-gutters': {
      color: palette.gutterText,
      backgroundColor: palette.gutter,
      borderRight: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: palette.gutterText,
    },
    '.cm-activeLineGutter': {
      color: palette.activeGutterText,
      backgroundColor: palette.activeGutter,
      fontWeight: '650',
    },
    '.cm-activeLineGutter .cm-gutterElement': {
      color: palette.activeGutterText,
    },
    '.cm-matchingBracket': {
      color: palette.foreground,
      backgroundColor: palette.selection,
      outline: `1px solid ${palette.cursor}`,
    },
  }, { dark })

  const syntax = HighlightStyle.define([
    { tag: [tags.keyword, tags.operatorKeyword, tags.controlKeyword, tags.definitionKeyword], color: palette.keyword, fontWeight: '600' },
    { tag: [tags.string, tags.special(tags.string), tags.regexp, tags.escape], color: palette.string },
    { tag: [tags.number, tags.bool, tags.null], color: palette.number },
    { tag: [tags.function(tags.variableName), tags.definition(tags.function(tags.variableName))], color: palette.functionName },
    { tag: [tags.typeName, tags.className, tags.namespace], color: palette.typeName },
    { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: palette.comment, fontStyle: 'italic' },
    { tag: [tags.variableName, tags.propertyName, tags.attributeName], color: palette.variable },
    { tag: [tags.heading, tags.link], color: palette.functionName, fontWeight: '600' },
    { tag: [tags.url, tags.meta, tags.labelName], color: palette.typeName },
    { tag: [tags.operator, tags.punctuation, tags.bracket, tags.separator], color: palette.punctuation },
    { tag: [tags.invalid], color: palette.invalid, textDecoration: `underline wavy ${palette.invalid}` },
  ])

  return [chrome, syntaxHighlighting(syntax)]
}

export const printStudioLightTheme = createCodeTheme({
  background: '#ffffff',
  foreground: '#243247',
  gutter: '#f8fafc',
  gutterText: '#64748b',
  activeLine: '#eaf4ff',
  activeGutter: '#dbeafe',
  activeGutterText: '#1d4ed8',
  selection: '#bfdbfe',
  cursor: '#1e3a8a',
  keyword: '#5b21b6',
  string: '#0f766e',
  number: '#1d4ed8',
  functionName: '#4f46e5',
  typeName: '#0369a1',
  comment: '#64748b',
  variable: '#243247',
  punctuation: '#475569',
  invalid: '#b45309',
}, false)

export const printStudioDarkTheme = createCodeTheme({
  background: '#17191d',
  foreground: '#e6edf3',
  gutter: '#15171b',
  gutterText: '#94a3b8',
  activeLine: '#222936',
  activeGutter: '#283447',
  activeGutterText: '#bae6fd',
  selection: '#1d4ed880',
  cursor: '#7dd3fc',
  keyword: '#c4b5fd',
  string: '#67e8f9',
  number: '#fbbf24',
  functionName: '#93c5fd',
  typeName: '#5eead4',
  comment: '#94a3b8',
  variable: '#e6edf3',
  punctuation: '#cbd5e1',
  invalid: '#fbbf24',
}, true)
