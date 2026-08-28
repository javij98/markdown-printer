<template>
  <div
    class="visual-editor-pane"
    :style="{
      '--visual-editor-font': fontFamilyCSS(font),
      '--visual-editor-size': `${fontSize}px`,
    }"
  >
    <div v-if="hasProtectedOutlineBlocks" class="outline-safety-note">
      <ShieldCheck :size="15" />
      <span>
        Los bloques avanzados de Outline y el HTML se conservan como tarjetas protegidas.
        Puedes moverlos aquí y editar su contenido en modo Markdown.
      </span>
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
import { ShieldCheck } from '@lucide/vue'
import { useImages } from '../composables/useImages'
import { fontFamilyCSS } from '../utils/css'
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
const { images, uploadImage, getImageUrl } = useImages()

let crepe: Crepe | null = null
let lastEmittedMarkdown = props.modelValue
let protectedBlocks = new Map<string, string>()
let themeObserver: MutationObserver | null = null
const codeTheme = new Compartment()
const themedCodeViews = new WeakMap<EditorView, boolean>()

function protectedCard(id: string, label: string): string {
  return `[▣ ${label}](https://outline.local/preserved/${id})`
}

function findClosingFence(lines: string[], start: number, fence: string): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() === fence) return index
  }
  return start
}

function protectOutlineMarkdown(markdown: string): string {
  protectedBlocks = new Map()
  const lines = markdown.split('\n')
  const output: string[] = []
  let index = 0
  let sequence = 0
  let inCodeFence = false

  const preserve = (raw: string, label: string) => {
    const id = `block-${sequence++}`
    protectedBlocks.set(id, raw)
    output.push('', protectedCard(id, label), '')
  }

  while (index < lines.length) {
    const line = lines[index]
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence
      output.push(line)
      index += 1
      continue
    }

    if (!inCodeFence) {
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
      if (/<\/?[a-z][^>]*>/i.test(line)) {
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
  if (!url.startsWith('./')) return url
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
