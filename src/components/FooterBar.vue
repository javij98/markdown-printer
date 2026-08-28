<template>
  <div class="footer-bar">
    <div class="footer-left" v-show="viewMode !== 'preview'">
      <span class="stat">{{ wordCount }} palabras</span>
      <span class="separator">|</span>
      <span class="stat">{{ charCount }} caracteres</span>
      <span class="separator">|</span>
      <button ref="aiButtonRef" class="ai-status" :class="{ disabled: !llmEnabled }" @click="$emit('open-ai-settings')" :title="llmEnabled ? (llmConnected ? 'AI connected' : 'AI error') : 'AI disabled — click to configure'">
        <span class="ai-dot" :class="!llmEnabled ? 'off' : (llmConnected ? 'connected' : 'error')"></span>
        <span class="ai-label">{{ llmEnabled ? llmModel : 'IA desactivada' }}</span>
      </button>
    </div>
    <div class="footer-spacer"></div>
    <div class="footer-right">
      <div class="scale-control" v-show="viewMode !== 'editor'">
        <Button severity="secondary" text size="small" class="scale-btn" @click="decrement" :disabled="scale <= scaleRange.min">
          <ZoomOut :size="14" />
        </Button>
        <Slider
          :modelValue="scale"
          :min="scaleRange.min"
          :max="scaleRange.max"
          :step="0.01"
          @update:modelValue="$emit('update:scale', Array.isArray($event) ? $event[0] : $event)"
          class="scale-slider"
        />
        <Button severity="secondary" text size="small" class="scale-btn" @click="increment" :disabled="scale >= scaleRange.max">
          <ZoomIn :size="14" />
        </Button>
        <span class="scale-label">{{ Math.round(scale * 100) }}%</span>
      </div>
      <div class="view-mode-control">
        <Button
          :severity="viewMode === 'editor' ? 'info' : 'secondary'"
          text
          size="small"
          class="view-mode-btn"
          @click="$emit('update:viewMode', 'editor')"
          title="Solo editor"
        >
          <FileEdit :size="14" />
        </Button>
        <Button
          :severity="viewMode === 'preview' ? 'info' : 'secondary'"
          text
          size="small"
          class="view-mode-btn"
          @click="$emit('update:viewMode', 'preview')"
          title="Solo vista de impresión"
        >
          <Eye :size="14" />
        </Button>
        <Button
          :severity="viewMode === 'split' ? 'info' : 'secondary'"
          text
          size="small"
          class="view-mode-btn"
          @click="$emit('update:viewMode', 'split')"
          title="Vista dividida"
        >
          <Columns2 :size="14" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PAGE_SIZES, getScaleRange } from '../utils/constants'
import type { ViewMode } from '../utils/types'
import { ZoomIn, ZoomOut, FileEdit, Eye, Columns2 } from '@lucide/vue'
import Button from 'primevue/button'
import Slider from 'primevue/slider'

const aiButtonRef = ref<HTMLButtonElement>()

defineExpose({ aiButtonRef })

const props = defineProps<{
  content: string
  selectedText: string
  scale: number
  pageSize: string
  orientation: 'portrait' | 'landscape'
  viewMode: ViewMode
  containerWidth: number
  llmEnabled: boolean
  llmConnected: boolean
  llmModel: string
}>()

const emit = defineEmits<{
  'update:scale': [value: number]
  'update:viewMode': [value: ViewMode]
  'open-ai-settings': []
}>()

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

const effectiveContent = computed(() => props.selectedText || props.content)

const wordCount = computed(() => {
  const text = stripHtml(effectiveContent.value).replace(/[#*`~\[\]()>_\-|]/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
})

const charCount = computed(() => effectiveContent.value.length)

const currentPageSize = computed(() => PAGE_SIZES.find(p => p.name === props.pageSize) || PAGE_SIZES[0])
const scaleRange = computed(() => getScaleRange(currentPageSize.value, props.orientation, props.containerWidth))

function increment() {
  const next = Math.round(props.scale * 10 + 1) / 10
  emit('update:scale', Math.min(next, scaleRange.value.max))
}

function decrement() {
  const next = Math.round(props.scale * 10 - 1) / 10
  emit('update:scale', Math.max(next, scaleRange.value.min))
}
</script>

<style scoped>
.footer-bar {
  min-height: 36px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 4px 10px;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-primary) 93%, transparent);
  box-shadow: 0 -3px 14px rgb(16 24 40 / 3%);
  font-size: 9px;
  backdrop-filter: blur(14px);
}

.footer-spacer {
  flex: 1;
}

.footer-left,
.footer-right,
.scale-control,
.view-mode-control {
  display: flex;
  align-items: center;
}

.footer-left {
  gap: 7px;
}

.footer-right {
  gap: 10px;
}

.stat {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.separator {
  color: var(--border-strong);
}

.ai-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border: 0;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  cursor: pointer;
  font-family: inherit;
  font-size: 9px;
  transition: color .15s ease, background-color .15s ease;
}

.ai-status:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.ai-status.disabled {
  opacity: .7;
}

.ai-dot {
  width: 6px;
  height: 6px;
  display: inline-block;
  flex-shrink: 0;
  border-radius: 50%;
}

.ai-dot.off {
  background: var(--text-tertiary);
}

.ai-dot.connected {
  background: var(--success-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success-color) 12%, transparent);
}

.ai-dot.error {
  background: var(--danger-color);
}

.ai-label {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scale-control {
  gap: 3px;
  padding: 2px 5px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--surface-subtle);
}

.scale-btn {
  min-width: 24px;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--text-secondary);
}

.scale-slider {
  width: 76px;
  margin-inline: 2px;
}

.scale-label {
  min-width: 34px;
  color: var(--text-secondary);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  text-align: right;
}

.view-mode-control {
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--bg-tertiary);
}

.view-mode-btn {
  min-width: 27px;
  width: 27px;
  height: 25px;
  padding: 0;
  color: var(--text-secondary);
}

.view-mode-control :deep(.p-button.p-button-info) {
  color: var(--accent-color);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 620px) {
  .footer-bar {
    padding-inline: 6px;
  }

  .footer-left .separator,
  .footer-left .stat:nth-of-type(n + 3),
  .scale-slider {
    display: none;
  }

  .scale-control {
    padding-inline: 3px;
  }

  .ai-label {
    max-width: 72px;
  }
}
</style>