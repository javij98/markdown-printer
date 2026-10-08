<template>
  <div
    class="visual-editor-pane"
    :style="{
      '--visual-editor-font': fontFamilyCSS(font),
      '--visual-editor-size': `${fontSize}pt`,
    }"
  >
    <div v-if="hasProtectedOutlineBlocks && !safetyNoteDismissed" class="outline-safety-note">
      <ShieldCheck :size="15" />
      <span>
        Los bloques avanzados de Outline y el HTML se conservan como tarjetas protegidas.
        Puedes moverlos aquí y editar su contenido en modo Markdown.
      </span>
      <button type="button" class="outline-safety-dismiss" title="Ocultar aviso" aria-label="Ocultar aviso" @click="dismissSafetyNote">
        <X :size="14" />
      </button>
    </div>
    <div ref="editorRoot" class="visual-editor-root"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import { callCommand, insert, replaceAll } from '@milkdown/kit/utils'
import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { printStudioDarkTheme, printStudioLightTheme } from '../editor/codeThemes'
import { ShieldCheck, X } from '@lucide/vue'
import { useImages } from '../composables/useImages'
import { fontFamilyCSS } from '../utils/css'
import { resolveOutlineImageUrl } from '../utils/outlineImageUrl'
import { configureOutlineImageCaptions, outlineColumnsPlugins } from '../editor/outlineColumns'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

const props = defineProps<{
  modelValue: string
  tabId: string | null
  font: string
  fontSize: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'editor-ready': []
  'update:selectedText': [value: string]
}>()

const editorRoot = ref<HTMLElement | null>(null)
const hasProtectedOutlineBlocks = ref(false)
const safetyNoteDismissed = ref(sessionStorage.getItem('print-studio-hide-outline-safety-note') === 'true')
const { images, uploadImage, getImageUrl } = useImages()

let crepe: Crepe | null = null
let lastEmittedMarkdown = props.modelValue
let protectedBlocks = new Map<string, string>()
let themeObserver: MutationObserver | null = null
const codeTheme = new Compartment()
const themedCodeViews = new WeakMap<EditorView, boolean>()

function dismissSafetyNote() {
  safetyNoteDismissed.value = true
  sessionStorage.setItem('print-studio-hide-outline-safety-note', 'true')
}

function protectedCard(id: string, label: string): string {
  return `[▣ ${label}](https://outline.local/preserved/${id})`
}

function findClosingFence(lines: string[], start: number, fence: string): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() === fence) return index
  }
  return start
}

const rawHtmlTagPattern = /<\/?(?:address|article|aside|blockquote|br|caption|col|colgroup|details|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|iframe|legend|li|main|nav|ol|p|picture|pre|section|source|span|style|summary|table|tbody|td|tfoot|th|thead|tr|ul|video)\b[^>]*>/i

function protectOutlineMarkdown(markdown: string): string {
  protectedBlocks = new Map()
  const lines = markdown.split('\n')
  const output: string[] = []
  let index = 0
  let sequence = 0
  let activeCodeFence: { marker: string, length: number } | null = null

  const preserve = (raw: string, label: string) => {
    const id = `block-${sequence++}`
    protectedBlocks.set(id, raw)
    output.push('', protectedCard(id, label), '')
  }

  while (index < lines.length) {
    const line = lines[index]
    const codeFence = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (codeFence) {
      const marker = codeFence[1][0]
      if (!activeCodeFence) {
        activeCodeFence = { marker, length: codeFence[1].length }
      } else if (
        marker === activeCodeFence.marker
        && codeFence[1].length >= activeCodeFence.length
        && codeFence[2].trim() === ''
      ) {
        activeCodeFence = null
      }
      output.push(line)
      index += 1
      continue
    }

    if (!activeCodeFence) {
      const notice = line.trim().match(/^:::(info|tip|warning|success)$/i)
      if (notice) {
        const end = findClosingFence(lines, index, ':::')
        if (end > index) {
          preserve(lines.slice(index, end + 1).join('\n'), `Aviso Outline: ${notice[1].toLowerCase()}`)
          index = end + 1
          continue
        }
      }

      const toggle = line.trim().match(/^(\+{3,})$/)
      if (toggle) {
        const end = findClosingFence(lines, index, toggle[1])
        if (end > index) {
          preserve(lines.slice(index, end + 1).join('\n'), 'Desplegable de Outline')
          index = end + 1
          continue
        }
      }

      if (/!\[[^\]]*\]\([^\n]*"(?:left-50|right-50|full-width)(?:\s+=[0-9]+x[0-9]+)?"\)\s*$/i.test(line)) {
        // Standalone left/right images have a lossless, editable two-column view.
        if (/^ {0,3}!\[[^\]]*\]\([^\n]*"(?:left|right)-50(?:\s+=[0-9]+x[0-9]+)?"\)\s*$/i.test(line)) {
          output.push(line)
          index += 1
          continue
        }
        preserve(line, 'Imagen con disposición de Outline')
        index += 1
        continue
      }

      if (/page-break-after\s*:\s*always/i.test(line)) {
        preserve(line, 'Salto de página')
        index += 1
        continue
      }

      // Crepe does not round-trip raw HTML reliably. Preserve the complete
      // Markdown line instead of exposing tags as text or silently losing them.
      if (rawHtmlTagPattern.test(line)) {
        preserve(line, 'HTML conservado')
        index += 1
        continue
      }
    }

    output.push(line)
    index += 1
  }

  hasProtectedOutlineBlocks.value = protectedBlocks.size > 0
  return output.join('\n').replace(/\n{3,}/g, '\n\n')
}

function restoreOutlineMarkdown(markdown: string): string {
  return markdown.replace(
    /\[[^\]]*\]\(https:\/\/outline\.local\/preserved\/(block-\d+)\)/g,
    (_match, id: string) => protectedBlocks.get(id) ?? _match,
  )
}

async function storeImage(file: File): Promise<string> {
  const saved = await uploadImage(file)
  return saved ? `./${encodeURIComponent(saved.name)}` : ''
}

function resolveImageUrl(url: string): string {
  if (!url.startsWith('./')) return resolveOutlineImageUrl(url)
  const filename = decodeURIComponent(url.slice(2))
  const image = images.value.find(item => item.name === filename)
  return image ? getImageUrl(image.id) || url : url
}

function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark')
}

function currentCodeTheme() {
  return isDarkTheme() ? printStudioDarkTheme : printStudioLightTheme
}

function syncCodeBlockThemes() {
  if (!editorRoot.value) return
  const dark = isDarkTheme()

  editorRoot.value.querySelectorAll<HTMLElement>('.cm-editor').forEach(element => {
    try {
      const view = EditorView.findFromDOM(element)
      if (!view) return
      if (themedCodeViews.get(view) === dark) return
      view.dispatch({ effects: codeTheme.reconfigure(currentCodeTheme()) })
      themedCodeViews.set(view, dark)
    } catch {
      // A CodeMirror node can disappear while Milkdown replaces a code block.
    }
  })
}

function startThemeObserver() {
  themeObserver?.disconnect()
  themeObserver = new MutationObserver(() => queueMicrotask(syncCodeBlockThemes))
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  if (editorRoot.value) {
    themeObserver.observe(editorRoot.value, { childList: true, subtree: true })
  }
}

function createEditor() {
  if (!editorRoot.value) return

  const initialMarkdown = protectOutlineMarkdown(props.modelValue)
  crepe = new Crepe({
    root: editorRoot.value,
    defaultValue: initialMarkdown,
    features: {
      [Crepe.Feature.AI]: false,
      [Crepe.Feature.TopBar]: false,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.BlockEdit]: true,
      [Crepe.Feature.Toolbar]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.ImageBlock]: true,
    },
    featureConfigs: {
      [Crepe.Feature.CodeMirror]: {
        theme: [],
        extensions: [codeTheme.of(currentCodeTheme())],
        searchPlaceholder: 'Buscar lenguaje',
        noResultText: 'Sin resultados',
        copyText: 'Copiar',
      },
      [Crepe.Feature.Placeholder]: {
        text: 'Escribe aquí o pulsa / para insertar un bloque…',
        mode: 'block',
      },
      [Crepe.Feature.Toolbar]: {
        boldLabel: 'Negrita',
        italicLabel: 'Cursiva',
        strikethroughLabel: 'Tachado',
        codeLabel: 'Código',
        linkLabel: 'Enlace',
        latexLabel: 'Fórmula',
      },
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: 'Texto',
          text: { label: 'Párrafo' },
          h1: { label: 'Título 1' },
          h2: { label: 'Título 2' },
          h3: { label: 'Título 3' },
          h4: { label: 'Título 4' },
          h5: { label: 'Título 5' },
          h6: { label: 'Título 6' },
          quote: { label: 'Cita' },
          divider: { label: 'Separador' },
        },
        listGroup: {
          label: 'Listas',
          bulletList: { label: 'Lista con viñetas' },
          orderedList: { label: 'Lista numerada' },
          taskList: { label: 'Lista de tareas' },
        },
        advancedGroup: {
          label: 'Contenido',
          image: { label: 'Imagen' },
          codeBlock: { label: 'Bloque de código' },
          table: { label: 'Tabla' },
          math: { label: 'Fórmula' },
        },
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: storeImage,
        inlineOnUpload: storeImage,
        blockOnUpload: storeImage,
        proxyDomURL: resolveImageUrl,
        inlineConfirmButton: 'Aceptar',
        inlineUploadButton: 'Subir imagen',
        inlineUploadPlaceholderText: 'Pega una URL o sube una imagen',
        blockConfirmButton: 'Aceptar',
        blockUploadButton: 'Subir imagen',
        blockCaptionPlaceholderText: 'Pie de imagen',
        blockUploadPlaceholderText: 'Pega una URL o sube una imagen',
      },
      [Crepe.Feature.Latex]: {
        inlineEditConfirm: 'Aceptar',
      },
    },
  })

  crepe.editor.config(configureOutlineImageCaptions).use(outlineColumnsPlugins(resolveImageUrl))

  crepe.on(listener => {
    listener.markdownUpdated((_ctx, markdown) => {
      const restored = restoreOutlineMarkdown(markdown)
      if (restored === lastEmittedMarkdown) return
      lastEmittedMarkdown = restored
      emit('update:modelValue', restored)
    })

    listener.selectionUpdated((ctx, selection) => {
      if (selection.empty) {
        emit('update:selectedText', '')
        return
      }
      const doc = ctx.get(editorViewCtx).state.doc
      emit('update:selectedText', doc.textBetween(selection.from, selection.to, ' '))
    })
  })

  startThemeObserver()
  crepe.create().then(() => {
    syncCodeBlockThemes()
    emit('editor-ready')
  })
}

watch(
  () => props.modelValue,
  newValue => {
    if (!crepe || newValue === lastEmittedMarkdown) return
    lastEmittedMarkdown = newValue
    crepe.editor.action(replaceAll(protectOutlineMarkdown(newValue)))
  },
)

function undo() {
  crepe?.editor.action(callCommand(undoCommand.key))
}

function redo() {
  crepe?.editor.action(callCommand(redoCommand.key))
}

function insertText(markdown: string) {
  crepe?.editor.action(insert(markdown))
}

function focus() {
  crepe?.editor.action(ctx => {
    ctx.get(editorViewCtx).focus()
  })
}

const content = computed(() => lastEmittedMarkdown)

onMounted(createEditor)
onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
  void crepe?.destroy()
  crepe = null
})

defineExpose({
  undo,
  redo,
  insertText,
  focus,
  content,
})
</script>

<style scoped>
.visual-editor-pane {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -8%, color-mix(in srgb, var(--accent-color) 7%, transparent), transparent 30rem),
    var(--bg-secondary);
}

.visual-editor-root {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.outline-safety-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-color) 17%, var(--border-color));
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--accent-soft) 70%, var(--bg-primary));
  font-size: 10px;
  line-height: 1.45;
}

.outline-safety-note svg {
  flex-shrink: 0;
  color: var(--accent-color);
}

.outline-safety-note > span {
  flex: 1;
}

.outline-safety-dismiss {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 7px;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
}

.outline-safety-dismiss:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.outline-safety-dismiss svg {
  color: currentColor;
}

.visual-editor-root :deep(.milkdown) {
  --crepe-color-inline-code: #5b21b6;
  min-height: 100%;
  padding: 24px clamp(10px, 3vw, 30px) 30vh;
  background: transparent;
  transition: color .18s ease, background-color .18s ease;
}

:global(html.dark .visual-editor-root .milkdown) {
  --crepe-color-background: #151922;
  --crepe-color-on-background: #edf1f7;
  --crepe-color-surface: #1c222d;
  --crepe-color-surface-low: #242b37;
  --crepe-color-on-surface: #edf1f7;
  --crepe-color-on-surface-variant: #aab4c3;
  --crepe-color-outline: #3d4757;
  --crepe-color-primary: #8297ff;
  --crepe-color-secondary: #293142;
  --crepe-color-on-secondary: #edf1f7;
  --crepe-color-inverse: #f4f6fb;
  --crepe-color-on-inverse: #182033;
  --crepe-color-inline-code: #c4b5fd;
  --crepe-color-error: #f0a34a;
  --crepe-color-hover: #252d3a;
  --crepe-color-selected: #303b4f;
  --crepe-color-inline-area: #252e3d;
}

.visual-editor-root :deep(.milkdown .ProseMirror) {
  box-sizing: border-box;
  width: min(100%, 900px);
  min-height: max(760px, calc(100vh - 250px));
  margin: 0 auto;
  padding: 54px clamp(32px, 7vw, 82px) 180px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-primary);
  background: var(--bg-primary);
  box-shadow: 0 18px 45px rgb(16 24 40 / 10%), 0 2px 6px rgb(16 24 40 / 5%);
  font-family: var(--visual-editor-font), sans-serif;
  font-size: var(--visual-editor-size);
  line-height: 1.68;
}

:global(html.dark .visual-editor-root .milkdown .ProseMirror) {
  box-shadow: 0 20px 52px rgb(0 0 0 / 32%), 0 2px 7px rgb(0 0 0 / 24%);
}

.visual-editor-root :deep(.crepe-placeholder::before) {
  z-index: 1;
  color: var(--text-tertiary);
  opacity: 1;
}

.visual-editor-root :deep(.milkdown .ProseMirror p) {
  margin: 0 0 .95em;
}

.visual-editor-root :deep(.outline-columns) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  margin-block: 1em;
}

.visual-editor-root :deep(.outline-columns-image) {
  min-width: 0;
  margin: 0;
}

.visual-editor-root :deep(.outline-columns[data-layout='right-50'] .outline-columns-image) {
  grid-column: 2;
  grid-row: 1;
}

.visual-editor-root :deep(.outline-columns[data-layout='right-50'] .outline-columns-text) {
  grid-column: 1;
  grid-row: 1;
}

.visual-editor-root :deep(.outline-columns-image img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.visual-editor-root :deep(.outline-columns-controls) {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.visual-editor-root :deep(.outline-columns-controls input),
.visual-editor-root :deep(.outline-columns-controls select) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  font: 12px/1.4 var(--visual-editor-font), sans-serif;
}

.visual-editor-root :deep(.outline-columns-text) {
  min-width: 0;
  min-height: 2em;
}

.visual-editor-root :deep(.milkdown .ProseMirror h1),
.visual-editor-root :deep(.milkdown .ProseMirror h2),
.visual-editor-root :deep(.milkdown .ProseMirror h3),
.visual-editor-root :deep(.milkdown .ProseMirror h4) {
  color: var(--text-primary);
  font-family: inherit;
  line-height: 1.22;
  letter-spacing: -.025em;
  text-wrap: balance;
}

.visual-editor-root :deep(.milkdown-code-block) {
  margin-block: 1.1em 1.25em;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--crepe-color-outline) 65%, transparent);
  border-radius: 11px;
  background: var(--crepe-color-surface);
  box-shadow: var(--shadow-xs);
  transition: border-color .18s ease, background-color .18s ease, box-shadow .18s ease;
}

:global(html.dark .visual-editor-root .milkdown-code-block) {
  border-color: #343e4d;
  box-shadow: 0 8px 24px rgb(0 0 0 / 17%);
}

.visual-editor-root :deep(.milkdown-code-block .cm-editor),
.visual-editor-root :deep(.milkdown-code-block .cm-gutters) {
  background-color: var(--crepe-color-surface);
}

:global(html.light .visual-editor-root .milkdown-code-block .cm-lineNumbers .cm-gutterElement) {
  color: #334155 !important;
}

:global(html.light .visual-editor-root .milkdown-code-block .cm-activeLineGutter) {
  color: #172554 !important;
  background: #dbeafe !important;
}

:global(html.light .visual-editor-root .milkdown-code-block .cm-activeLine) {
  background: #eaf4ff !important;
}

.visual-editor-root :deep(.milkdown .ProseMirror pre) {
  margin-block: 1em 1.2em;
}

.visual-editor-root :deep(.milkdown .ProseMirror pre code) {
  font-family: "Source Code Pro", ui-monospace, monospace;
}

.visual-editor-root :deep(.milkdown .milkdown-toolbar),
.visual-editor-root :deep(.milkdown .milkdown-slash-menu),
.visual-editor-root :deep(.milkdown .milkdown-link-preview) {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
}

.visual-editor-root :deep(a[href^='https://outline.local/preserved/']) {
  display: block;
  padding: 13px 15px;
  border: 1px dashed color-mix(in srgb, var(--accent-color) 52%, var(--border-color));
  border-radius: 10px;
  color: var(--accent-color);
  background: var(--accent-soft);
  font-weight: 650;
  text-decoration: none;
}

@media (max-width: 700px) {
  .visual-editor-root :deep(.milkdown) {
    padding: 0 0 24vh;
  }

  .visual-editor-root :deep(.milkdown .ProseMirror) {
    min-height: 100%;
    padding: 34px 24px 140px;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
