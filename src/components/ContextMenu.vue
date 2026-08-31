<template>
  <div class="editor-context-menu">
    <PrimeContextMenu ref="menuRef" :model="items" @hide="onHide" >
      <template #item="{ item, props }">
        <!-- Inline button row -->
        <div
          v-if="item._type === 'row'"
          class="inline-row"
          @click.stop
        >
          <Button
            v-for="btn in item._buttons!"
            :key="btn.action"
            :class="{ active: btn.active }"
            @click.stop="btn.handler()"
            :title="btn.label"
            :severity="btn.active ? 'info' : 'contrast'"
            :variant="btn.active ? '' : 'text'"
            size="small"
          >
            <component :is="btn.icon" :size="16" />
          </Button>
        </div>
        <!-- Table grid picker -->
        <div v-else-if="item._type === 'grid'" class="table-grid-wrapper" @click.stop>
          <div class="table-grid" @mouseleave="hoverRows = 0; hoverCols = 0">
            <div v-for="row in 7" :key="row" class="table-grid-row">
              <div
                v-for="col in 7" :key="col"
                class="table-cell"
                :class="{ selected: row <= hoverRows && col <= hoverCols }"
                @mouseenter="hoverRows = row; hoverCols = col"
                @click.stop="insertTable(row, col)"
              />
            </div>
          </div>
          <div class="table-size-label">
            <template v-if="hoverRows > 0 && hoverCols > 0">{{ hoverRows }} × {{ hoverCols }}</template>
            <template v-else>&nbsp;</template>
          </div>
        </div>
        <!-- Regular PrimeVue item (with submenu arrow if it has items) -->
        <a v-else v-bind="props.action" class="context-menu-item" :class="{ 'item-active': item.isActive }">
          <component :is="item.iconComponent" v-if="item.iconComponent" :size="16" class="menu-item-icon" />
          <span class="menu-item-label">{{ item.label }}</span>
          <ChevronRight v-if="item.items" :size="14" class="submenu-end-icon" />
        </a>
      </template>
    </PrimeContextMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import type { Component } from 'vue'
import PrimeContextMenu from 'primevue/contextmenu'
import type { MenuItem } from 'primevue/menuitem'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  TextAlignStart,
  TextAlignCenter,
  TextAlignEnd,
  Copy,
  ClipboardPaste,
  Table,
  ChevronRight,
} from '@lucide/vue'
import Button from 'primevue/button'

interface ActiveFormats {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  code: boolean
  heading: 0 | 1 | 2 | 3 | 4 | 5 | 6
  alignment: 'left' | 'center' | 'right' | null
  listType: 'ul' | 'ol' | null
}

interface ContextMenuItem extends MenuItem {
  iconComponent?: Component
  isActive?: boolean
  _type?: 'row' | 'grid'
  _buttons?: InlineButton[]
}

interface InlineButton {
  icon: Component
  action: string
  label: string
  active: boolean
  handler: () => void
}

const props = defineProps<{
  selectedText?: string
  activeFormats?: ActiveFormats
}>()

const emit = defineEmits<{
  action: [type: string, value?: string]
  close: []
}>()

const menuRef = ref<InstanceType<typeof PrimeContextMenu>>()
const hoverRows = ref(0)
const hoverCols = ref(0)

function show(event: MouseEvent) {
  menuRef.value?.show(event)
}

function hide() {
  menuRef.value?.hide()
}

function onHide() {
  emit('close')
}

function handleAction(type: string, value?: string) {
  emit('action', type, value || props.selectedText)
  emit('close')
}

function insertTable(rows: number, cols: number) {
  emit('action', 'table', `${rows}x${cols}`)
  menuRef.value?.hide()
}

function handleCopy() {
  const text = props.selectedText
  if (!text) return
  emit('close')

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function handlePaste() {
  emit('close')

  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      emit('action', 'paste', text)
    }).catch(() => {
      emit('action', 'focus-editor')
    })
  } else {
    emit('action', 'focus-editor')
  }
}

const BoldIcon = markRaw(Bold)
const ItalicIcon = markRaw(Italic)
const UnderlineIcon = markRaw(Underline)
const StrikethroughIcon = markRaw(Strikethrough)
const CodeIcon = markRaw(Code)
const ListIcon = markRaw(List)
const ListOrderedIcon = markRaw(ListOrdered)
const AlignLeftIcon = markRaw(TextAlignStart)
const AlignCenterIcon = markRaw(TextAlignCenter)
const AlignRightIcon = markRaw(TextAlignEnd)
const CopyIcon = markRaw(Copy)
const ClipboardPasteIcon = markRaw(ClipboardPaste)
const TableIcon = markRaw(Table)
const HeadingIcons = [
  markRaw(Heading1), markRaw(Heading2), markRaw(Heading3),
  markRaw(Heading4), markRaw(Heading5), markRaw(Heading6),
]

function makeRowButton(action: string, label: string, icon: Component, active: boolean): InlineButton {
  return { icon, action, label, active, handler: () => handleAction(action) }
}

const items = computed<ContextMenuItem[]>(() => {
  const af = props.activeFormats

  return [
    // Clipboard row
    {
      _type: 'row',
      command: () => {},
      _buttons: [
        { icon: CopyIcon, action: 'copy', label: 'Copiar', active: false, handler: handleCopy },
        { icon: ClipboardPasteIcon, action: 'paste', label: 'Pegar', active: false, handler: handlePaste },
      ],
    } as ContextMenuItem,
    { separator: true },

    // Inline formatting row
    {
      _type: 'row',
      command: () => {},
      _buttons: [
        makeRowButton('bold', 'Negrita', BoldIcon, af?.bold ?? false),
        makeRowButton('italic', 'Cursiva', ItalicIcon, af?.italic ?? false),
        makeRowButton('underline', 'Subrayado', UnderlineIcon, af?.underline ?? false),
        makeRowButton('strikethrough', 'Tachado', StrikethroughIcon, af?.strikethrough ?? false),
        makeRowButton('code', 'Código', CodeIcon, af?.code ?? false),
      ],
    } as ContextMenuItem,

    // Headings row
    {
      _type: 'row',
      command: () => {},
      _buttons: HeadingIcons.map((comp, i) =>
        makeRowButton(`heading${i + 1}`, `Título ${i + 1}`, comp, af?.heading === (i + 1) as 1 | 2 | 3 | 4 | 5 | 6)
      ),
    } as ContextMenuItem,

    // Lists row
    {
      _type: 'row',
      command: () => {},
      _buttons: [
        makeRowButton('unorderedList', 'Lista con viñetas', ListIcon, af?.listType === 'ul'),
        makeRowButton('orderedList', 'Lista numerada', ListOrderedIcon, af?.listType === 'ol'),
      ],
    } as ContextMenuItem,

    // Alignment row
    {
      _type: 'row',
      command: () => {},
      _buttons: [
        makeRowButton('alignLeft', 'Alinear a la izquierda', AlignLeftIcon, af?.alignment === 'left'),
        makeRowButton('alignCenter', 'Centrar', AlignCenterIcon, af?.alignment === 'center'),
        makeRowButton('alignRight', 'Alinear a la derecha', AlignRightIcon, af?.alignment === 'right'),
      ],
    } as ContextMenuItem,
    { separator: true },

    // Insert items
    { label: 'Enlace', command: () => handleAction('link') },
    {
      label: 'Imagen',
      items: [
        { label: 'Enlace', command: () => handleAction('image') },
        { label: 'Galería', command: () => handleAction('image-gallery') },
      ],
    } as ContextMenuItem,
    { label: 'Bloque de código', command: () => handleAction('codeBlock') },
    {
      label: 'Cita',
      items: [
        { label: 'Básica', command: () => handleAction('blockquote') },
        { label: 'Nota', command: () => handleAction('alertNote') },
        { label: 'Consejo', command: () => handleAction('alertTip') },
        { label: 'Importante', command: () => handleAction('alertImportant') },
        { label: 'Advertencia', command: () => handleAction('alertWarning') },
        { label: 'Precaución', command: () => handleAction('alertCaution') },
      ],
    } as ContextMenuItem,
    { label: 'Separador', command: () => handleAction('horizontalRule') },
    { separator: true },

    // Table submenu (grid picker)
    {
      label: 'Tabla',
      iconComponent: TableIcon,
      items: [
        { _type: 'grid', command: () => {} } as ContextMenuItem,
      ],
    } as ContextMenuItem,
  ]
})

defineExpose({ show, hide })
</script>

<style scoped>
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}

.menu-item-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.menu-item-label {
  flex: 1;
  font-size: 11px;
}

.inline-row {
  display: flex;
  gap: 3px;
  padding: 3px;
  margin: 1px 0;
  border-radius: 9px;
  background: var(--surface-subtle);
}

.inline-row :deep(.p-button) {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 7px;
  color: var(--text-secondary);
}

.inline-row :deep(.p-button.active) {
  color: var(--accent-color);
  background: var(--accent-soft);
}

.submenu-end-icon {
  margin-left: auto;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.table-grid-wrapper {
  padding: 9px;
}

.table-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.table-grid-row {
  width: 100%;
  display: flex;
  gap: 3px;
}

.table-cell {
  height: auto;
  flex: 1;
  aspect-ratio: 1;
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: border-color .08s ease, background-color .08s ease;
}

.table-cell.selected {
  border-color: var(--accent-color);
  background: var(--accent-soft);
}

.table-size-label {
  min-height: 16px;
  margin-top: 7px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 650;
  text-align: center;
}
</style>

<style>
.p-contextmenu {
  --p-contextmenu-background: var(--bg-elevated);
  min-width: 190px;
  border-color: var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.p-contextmenu-item {
  --p-contextmenu-item-focus-background: var(--surface-hover);
  --p-contextmenu-item-hover-background: var(--surface-hover);
  --p-contextmenu-item-active-background: var(--accent-soft);
}

.p-contextmenu-item:has(.inline-row),
.p-contextmenu-item:has(.table-grid-wrapper) {
  --p-contextmenu-item-focus-background: transparent;
  --p-contextmenu-item-hover-background: transparent;
  --p-contextmenu-item-active-background: transparent;
}
</style>