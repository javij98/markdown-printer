<template>
  <div class="toolbar">
    <div class="toolbar-scroll">
      <div class="toolbar-left" v-show="viewMode !== 'preview'">
        <Button severity="info" text size="small" @click="$emit('undo')" title="Deshacer (Ctrl+Z)">
          <Undo2 :size="16" />
        </Button>
        <Button severity="info" text size="small" @click="$emit('redo')" title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 :size="16" />
        </Button>
        <span class="separator"></span>
        <Button severity="info" text size="small" @click="$emit('insert-page-break')" title="Insertar salto de página">
          <StickyNotePlus :size="16" />
        </Button>
        <span class="separator"></span>
        <div class="editor-mode-control" aria-label="Modo de edición">
          <Button
            :severity="editorMode === 'visual' ? 'info' : 'secondary'"
            text
            size="small"
            :label="'Visual'"
            title="Editar visualmente"
            @click="$emit('update:editorMode', 'visual')"
          >
            <LayoutTemplate :size="15" />
          </Button>
          <Button
            :severity="editorMode === 'markdown' ? 'info' : 'secondary'"
            text
            size="small"
            :label="'Markdown'"
            title="Editar el Markdown original"
            @click="$emit('update:editorMode', 'markdown')"
          >
            <FileCode2 :size="15" />
          </Button>
        </div>
        <div class="alignment-control" aria-label="Alineación de párrafos">
          <Button
            v-for="option in alignmentOptions"
            :key="option.value"
            :severity="textAlignment === option.value ? 'info' : 'secondary'"
            text
            size="small"
            :title="option.label"
            @click="setTextAlignment(option.value)"
          >
            <component :is="option.icon" :size="16" />
          </Button>
        </div>
        <span class="separator"></span>
        <Button
          severity="info"
          text
          size="small"
          @click="$emit('update:rtl', !rtl)"
          :title="rtl ? 'Cambiar a izquierda-derecha' : 'Cambiar a derecha-izquierda'"
        >
          <TextAlignEnd v-if="rtl" :size="16" />
          <TextAlignStart v-else :size="16" />
        </Button>
        <Button
          :severity="softWrap ? 'info' : 'contrast'"
          text
          size="small"
          @click="$emit('update:softWrap', !softWrap)"
          title="Activar o desactivar ajuste de línea"
        >
          <WrapText :size="16" />
        </Button>
      </div>

      <span class="separator" v-if="viewMode === 'split'"></span>

      <div class="toolbar-center">
        <PrintPresetPicker :model-value="printPreset" @update:model-value="$emit('update:printPreset', $event)" />

        <MarginPicker
          :model-value="margin"
          :page-size="pageSize"
          :orientation="orientation"
          @update:model-value="$emit('update:margin', $event)"
        />

        <PageSizeSelector :model-value="pageSize" @update:model-value="$emit('update:pageSize', $event)" />

        <!-- Orientation toggle -->
        <Button
          severity="info"
          text
          size="small"
          @click="$emit('update:orientation', orientation === 'portrait' ? 'landscape' : 'portrait')"
          :title="orientation === 'portrait' ? 'Cambiar a horizontal' : 'Cambiar a vertical'"
        >
          <RectangleVertical v-if="orientation === 'portrait'" :size="16" />
          <RectangleHorizontal v-else :size="16" />
        </Button>

        <span class="separator"></span>

        <FontPicker :model-value="font" @update:model-value="$emit('update:font', $event)" />
        <FontSizePicker :model-value="fontSize" @update:model-value="$emit('update:fontSize', $event)" />

        <!-- Content scale slider (A4-relative: 100% = A4 base) -->
        <div class="content-scale-control">
          <span class="content-scale-label">Aa</span>
          <Button
            severity="info"
            text
            size="small"
            class="content-scale-btn"
            @click="$emit('update:contentScale', Math.max(scaleRange.min, contentScale - 0.01))"
            title="Reducir escala"
          >
            <Minus :size="16" />
          </Button>
          <Slider
            :modelValue="displayScale"
            :min="Math.round(scaleRange.min * 100)"
            :max="Math.round(scaleRange.max * 100)"
            :step="1"
            class="content-scale-slider"
            @update:modelValue="$emit('update:contentScale', (Array.isArray($event) ? $event[0] : $event) / 100)"
          />
          <Button
            severity="info"
            text
            size="small"
            class="content-scale-btn"
            @click="$emit('update:contentScale', Math.min(scaleRange.max, contentScale + 0.01))"
            title="Aumentar escala"
          >
            <Plus :size="16" />
          </Button>
          <span class="content-scale-value">{{ displayScale }}%</span>
          <Button
            severity="info"
            text
            size="small"
            class="content-scale-reset"
            @click="resetContentScale"
            title="Restablecer escala"
          >
            <RotateCcw :size="16" />
          </Button>
        </div>
      </div>
    </div>

    <div class="toolbar-actions">
      <Button
        severity="secondary"
        outlined
        size="small"
        class="format-action"
        :class="{ active: advancedStyle.enabled }"
        :aria-pressed="advancedStyle.enabled"
        title="Abrir formato avanzado de impresión"
        @click="showAdvancedStyle = true"
      >
        <SlidersHorizontal :size="16" />
        <span>Formato</span>
        <span v-if="advancedStyle.enabled" class="format-active-dot" aria-hidden="true"></span>
      </Button>

      <DownloadMenu
        :content="content"
        :rendered-html="renderedHtml"
        :is-generating="isGenerating"
        @download-pdf="$emit('download-pdf')"
        class="toolbar-print"
      />
    </div>
  </div>

  <AdvancedStylePanel
    v-model:visible="showAdvancedStyle"
    :model-value="advancedStyle"
    :print-preset="printPreset"
    @update:model-value="$emit('update:advancedStyle', $event)"
    @reset="$emit('reset:advancedStyle')"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Slider from 'primevue/slider'
import type { AdvancedPrintStyle, EditorMode, MarginConfig, PrintPreset, ViewMode } from '../utils/types'
import { PAGE_SIZES, getContentScaleRange } from '../utils/constants'
import { Undo2, Redo2, TextAlignStart, TextAlignEnd, AlignLeft, AlignCenter, AlignRight, AlignJustify, RectangleVertical, RectangleHorizontal, StickyNotePlus, WrapText, Plus, Minus, RotateCcw, LayoutTemplate, FileCode2, SlidersHorizontal } from '@lucide/vue'
import MarginPicker from './MarginPicker.vue'
import PageSizeSelector from './PageSizeSelector.vue'
import FontPicker from './FontPicker.vue'
import FontSizePicker from './FontSizePicker.vue'
import PrintPresetPicker from './PrintPresetPicker.vue'
import AdvancedStylePanel from './AdvancedStylePanel.vue'
import DownloadMenu from './DownloadMenu.vue'

const props = defineProps<{
  pageSize: string
  font: string
  rtl: boolean
  softWrap: boolean
  fontSize: number
  content: string
  renderedHtml: string
  isGenerating: boolean
  margin: MarginConfig
  orientation: 'portrait' | 'landscape'
  contentScale: number
  viewMode: ViewMode
  editorMode: EditorMode
  printPreset: PrintPreset
  advancedStyle: AdvancedPrintStyle
}>()

const emit = defineEmits<{
  'update:pageSize': [value: string]
  'update:font': [value: string]
  'update:rtl': [value: boolean]
  'update:softWrap': [value: boolean]
  'update:fontSize': [value: number]
  'update:margin': [value: MarginConfig]
  'update:orientation': [value: 'portrait' | 'landscape']
  'update:contentScale': [value: number]
  'update:editorMode': [value: EditorMode]
  'update:printPreset': [value: PrintPreset]
  'update:advancedStyle': [value: AdvancedPrintStyle]
  'reset:advancedStyle': []
  'undo': []
  'redo': []
  'insert-page-break': []
  'download-pdf': []
}>()

const showAdvancedStyle = ref(false)

type TextAlignment = AdvancedPrintStyle['textAlignment']
const alignmentOptions: Array<{ value: TextAlignment; label: string; icon: typeof AlignLeft }> = [
  { value: 'start', label: 'Alinear a la izquierda', icon: AlignLeft },
  { value: 'center', label: 'Centrar', icon: AlignCenter },
  { value: 'end', label: 'Alinear a la derecha', icon: AlignRight },
  { value: 'justify', label: 'Justificar', icon: AlignJustify },
]

const textAlignment = computed<TextAlignment>(() => props.advancedStyle.textAlignment ?? (props.advancedStyle.justifyText ? 'justify' : 'start'))

function setTextAlignment(value: TextAlignment) {
  emit('update:advancedStyle', { ...props.advancedStyle, textAlignment: value, justifyText: value === 'justify' })
}
const scaleRange = computed(() => {
  const page = PAGE_SIZES.find(p => p.name === props.pageSize)
  return page ? getContentScaleRange(page) : { min: 0.01, max: 2.0, default: 1.0 }
})

const displayScale = computed(() => Math.round(props.contentScale * 100))

function resetContentScale() {
  emit('update:contentScale', scaleRange.value.default)
}
</script>

<style scoped>
.toolbar {
  min-height: var(--app-toolbar-height);
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 8px 10px;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
  box-shadow: 0 5px 20px rgb(16 24 40 / 4%);
  backdrop-filter: blur(18px) saturate(1.12);
}

.toolbar-scroll {
  min-width: 0;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-padding-inline: 8px;
  scrollbar-width: none;
}

.toolbar-scroll::-webkit-scrollbar {
  display: none;
}

.toolbar-left,
.toolbar-center {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface-subtle) 76%, transparent);
  box-shadow: var(--shadow-xs);
}

.toolbar-center {
  gap: 7px;
  padding-inline: 7px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-left: 10px;
  border-left: 1px solid var(--border-color);
}

.toolbar-print {
  flex-shrink: 0;
}

.editor-mode-control {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.editor-mode-control :deep(.p-button) {
  height: 28px;
  padding-inline: 8px;
  color: var(--text-secondary);
}

.editor-mode-control :deep(.p-button.p-button-info) {
  color: var(--accent-color);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
}

.alignment-control {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.alignment-control :deep(.p-button) {
  min-width: 28px;
  width: 28px;
  height: 28px;
  padding: 0;
}

.alignment-control :deep(.p-button.p-button-info) {
  color: var(--accent-color);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
}

.toolbar :deep(.p-button) {
  min-width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--text-secondary);
}

.toolbar :deep(.p-button:hover) {
  color: var(--text-primary);
}

.toolbar :deep(.p-button.p-button-info) {
  color: var(--accent-color);
}

.toolbar :deep(.p-select) {
  min-height: 32px;
  border-color: transparent;
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
}

.separator {
  width: 1px;
  height: 20px;
  flex-shrink: 0;
  background: var(--border-color);
}

.format-action {
  position: relative;
  height: 38px !important;
  gap: 7px;
  padding-inline: 11px !important;
  border-color: var(--border-color);
  color: var(--text-primary) !important;
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
}

.format-action span:not(.format-active-dot) {
  font-size: 11px;
  font-weight: 700;
}

.format-action:hover,
.format-action.active {
  border-color: color-mix(in srgb, var(--accent-color) 42%, var(--border-color));
  color: var(--accent-color) !important;
  background: var(--accent-soft);
}

.format-active-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border: 1px solid var(--bg-primary);
  border-radius: 999px;
  background: var(--accent-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 15%, transparent);
}

.content-scale-control {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 2px;
}

.content-scale-label {
  padding: 4px 6px;
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  font-family: Georgia, serif;
  font-size: 12px;
  font-weight: 700;
}

.content-scale-slider {
  width: 64px;
  margin-inline: 2px;
}

.content-scale-value {
  min-width: 36px;
  color: var(--text-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  text-align: right;
}

.content-scale-btn,
.content-scale-reset {
  min-width: 24px !important;
  width: 24px;
  height: 24px !important;
  padding: 0 !important;
}

.content-scale-reset {
  color: var(--text-tertiary) !important;
}

@media (max-width: 1080px) {
  .toolbar {
    gap: 6px;
    padding-inline: 7px;
  }

  .toolbar-actions {
    gap: 5px;
    padding-left: 7px;
  }

  .format-action span:not(.format-active-dot) {
    display: none;
  }

  .format-action {
    width: 38px;
    justify-content: center;
    padding-inline: 0 !important;
  }
}

@media (max-width: 680px) {
  .toolbar {
    position: relative;
    min-height: 52px;
    padding-right: 96px;
  }

  .toolbar-left,
  .toolbar-center {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .toolbar-actions {
    position: absolute;
    top: 7px;
    right: 7px;
    z-index: 3;
    padding-left: 6px;
    border-radius: 11px;
    background: var(--bg-primary);
  }
}
</style>