export interface Tab {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface PageSize {
  name: string
  width: string
  height: string
  cssSize: string
  category: 'iso' | 'na' | 'photo'
}

export interface FontOption {
  name: string
  family: string
  source: 'google' | 'generic' | 'uploaded'
  group?: string
}

export interface MarginConfig {
  top: string
  right: string
  bottom: string
  left: string
}

export type Orientation = 'portrait' | 'landscape'

export type ViewMode = 'editor' | 'preview' | 'split'

export type EditorMode = 'visual' | 'markdown'

export type PrintPreset = 'outline' | 'academic' | 'professional' | 'minimal'

export interface AdvancedPrintStyle {
  enabled: boolean
  accentColor: string
  textColor: string
  headingColor: string
  mutedColor: string
  borderColor: string
  codeBackground: string
  lineHeight: number
  paragraphSpacing: number
  blockSpacing: number
  codeRadius: number
  headingScale: number
  headingSpacing: number
  codeFontScale: number
  codeLineHeight: number
  listSpacing: number
  tableCellPadding: number
  codeAccent: boolean
  codeBorder: boolean
  tableHeaderShade: boolean
  zebraTables: boolean
  underlineLinks: boolean
  headingDividers: boolean
  justifyText: boolean
  textAlignment: 'start' | 'center' | 'end' | 'justify'
  hyphenate: boolean
}

export interface LlmConfig {
  endpoint: string
  apiKey: string
  model: string
}

export interface EditorSettings {
  pageSize: string
  scale: number
  font: string
  fontSize: number
  rtl: boolean
  lineNumbers: boolean
  margin: MarginConfig
  orientation: Orientation
  contentScale: number
  contentScaleMap: Record<string, number> | null
  softWrap: boolean
  viewMode: ViewMode
  editorMode: EditorMode
  printPreset: PrintPreset
  advancedStylePreset: PrintPreset
  advancedPrintStyle: AdvancedPrintStyle
}

export interface StoredImage {
  id: string
  name: string
  mimeType: string
  blob: Blob
  createdAt: number
}
