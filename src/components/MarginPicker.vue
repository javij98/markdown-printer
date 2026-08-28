<template>
  <div class="margin-picker">
    <span class="margin-picker-label">Márgenes:</span>
    <div class="margin-selector">
      <Select
        :modelValue="selectedPresetValue"
        :options="presetOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        @change="handleSelectChange"
      />
    </div>

    <!-- Custom margin dialog -->
    <Dialog
      v-model:visible="showDialog"
      header="Márgenes personalizados"
      modal
      :closable="true"
      :style="{ minWidth: '340px', maxWidth: '95vw' }"
    >
      <div class="margin-preview-layout">
        <!-- Top margin input -->
        <div class="margin-input-group">
          <Button severity="secondary" text size="small" @click="stepMargin('top', -0.25)">
            <template #icon><Minus :size="14" /></template>
          </Button>
          <InputNumber
            :modelValue="dialogMargin.top"
            @update:modelValue="(val: number | null) => updateDialogMargin('top', val ?? 0)"
            mode="decimal"
            :minFractionDigits="2"
            :maxFractionDigits="2"
            :min="0"
            :step="0.25"
            :inputStyle="{ width: '64px', textAlign: 'center' }"
            :showButtons="false"
          />
          <Button severity="secondary" text size="small" @click="stepMargin('top', 0.25)">
            <template #icon><Plus :size="14" /></template>
          </Button>
        </div>

        <div class="margin-preview-middle">
          <!-- Left margin input -->
          <div class="margin-input-group">
            <Button severity="secondary" text size="small" @click="stepMargin('left', -0.25)">
              <template #icon><Minus :size="14" /></template>
            </Button>
            <InputNumber
              :modelValue="dialogMargin.left"
              @update:modelValue="(val: number | null) => updateDialogMargin('left', val ?? 0)"
              mode="decimal"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              :min="0"
              :step="0.25"
              :inputStyle="{ width: '64px', textAlign: 'center' }"
              :showButtons="false"
            />
            <Button severity="secondary" text size="small" @click="stepMargin('left', 0.25)">
              <template #icon><Plus :size="14" /></template>
            </Button>
          </div>

          <!-- Preview box with independent margin lines -->
          <div class="margin-preview-box" :style="previewBoxStyle">
            <div class="margin-line margin-line-top" :style="lineStyle.top"></div>
            <div class="margin-line margin-line-bottom" :style="lineStyle.bottom"></div>
            <div class="margin-line margin-line-left" :style="lineStyle.left"></div>
            <div class="margin-line margin-line-right" :style="lineStyle.right"></div>
          </div>

          <!-- Right margin input -->
          <div class="margin-input-with-lock">
            <div class="margin-input-group">
              <Button severity="secondary" text size="small" @click="stepMargin('right', -0.25)">
                <template #icon><Minus :size="14" /></template>
              </Button>
              <InputNumber
                :modelValue="dialogMargin.right"
                @update:modelValue="(val: number | null) => updateDialogMargin('right', val ?? 0)"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                :min="0"
                :step="0.25"
                :inputStyle="{ width: '64px', textAlign: 'center' }"
                :showButtons="false"
              />
              <Button severity="secondary" text size="small" @click="stepMargin('right', 0.25)">
                <template #icon><Plus :size="14" /></template>
              </Button>
            </div>
            <button class="margin-lock-btn" :class="{ active: lockHorizontal }" @click="toggleLock('horizontal')" title="Bloquear márgenes horizontales">
              <LockOpen v-if="!lockHorizontal" :size="12" />
              <Lock v-else :size="12" />
            </button>
          </div>
        </div>

        <!-- Bottom margin input -->
        <div class="margin-input-with-lock">
          <div class="margin-input-group">
            <Button severity="secondary" text size="small" @click="stepMargin('bottom', -0.25)">
              <template #icon><Minus :size="14" /></template>
            </Button>
            <InputNumber
              :modelValue="dialogMargin.bottom"
              @update:modelValue="(val: number | null) => updateDialogMargin('bottom', val ?? 0)"
              mode="decimal"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              :min="0"
              :step="0.25"
              :inputStyle="{ width: '64px', textAlign: 'center' }"
              :showButtons="false"
            />
            <Button severity="secondary" text size="small" @click="stepMargin('bottom', 0.25)">
              <template #icon><Plus :size="14" /></template>
            </Button>
          </div>
          <button class="margin-lock-btn" :class="{ active: lockVertical }" @click="toggleLock('vertical')" title="Bloquear márgenes verticales">
            <LockOpen v-if="!lockVertical" :size="12" />
            <Lock v-else :size="12" />
          </button>
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text size="small" @click="closeDialog" />
        <Button label="Aplicar" size="small" @click="applyCustom" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { MarginConfig } from '../utils/types'
import { MARGIN_PRESETS, PAGE_SIZES } from '../utils/constants'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { Lock, LockOpen, Plus, Minus } from '@lucide/vue'

const props = defineProps<{
  modelValue: MarginConfig
  pageSize: string
  orientation: 'portrait' | 'landscape'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MarginConfig]
}>()

const showDialog = ref(false)
// Dialog stores plain numbers (inches), separate from the CSS-value MarginConfig
const dialogMargin = ref({ top: 1, right: 1, bottom: 1, left: 1 })

// Lock state: sync horizontal (left=right) or vertical (top=bottom)
const lockHorizontal = ref(localStorage.getItem('margin-lock-h') !== 'false')
const lockVertical = ref(localStorage.getItem('margin-lock-v') !== 'false')

function toggleLock(axis: 'horizontal' | 'vertical') {
  if (axis === 'horizontal') {
    lockHorizontal.value = !lockHorizontal.value
    localStorage.setItem('margin-lock-h', String(lockHorizontal.value))
    if (lockHorizontal.value) {
      dialogMargin.value = { ...dialogMargin.value, right: dialogMargin.value.left }
    }
  } else {
    lockVertical.value = !lockVertical.value
    localStorage.setItem('margin-lock-v', String(lockVertical.value))
    if (lockVertical.value) {
      dialogMargin.value = { ...dialogMargin.value, top: dialogMargin.value.bottom }
    }
  }
}

const marginPresetLabels: Record<string, string> = {
  moderate: 'Moderados',
  standard: 'Estándar',
  narrow: 'Estrechos',
  wide: 'Amplios',
}

const findPresetKey = (m: MarginConfig): string | null => {
  for (const [key, preset] of Object.entries(MARGIN_PRESETS)) {
    if (preset.top === m.top && preset.right === m.right && preset.bottom === m.bottom && preset.left === m.left) {
      return key
    }
  }
  return null
}

// Build Select options from MARGIN_PRESETS + Custom
const presetOptions = computed(() => {
  const options = Object.keys(MARGIN_PRESETS).map(key => ({
    label: marginPresetLabels[key] ?? key,
    value: key,
  }))
  options.push({ label: 'Personalizados', value: 'custom' })
  return options
})

const selectedPresetValue = computed(() => {
  const key = findPresetKey(props.modelValue)
  return key ?? 'custom'
})

function handleSelectChange(event: { value: string }) {
  handlePresetChange(event.value)
}

function handlePresetChange(value: string) {
  if (value === 'custom') {
    openDialog()
    return
  }
  const preset = MARGIN_PRESETS[value]
  if (preset) {
    emit('update:modelValue', { ...preset })
  }
}

// Preview box dimensions for the dialog
const PREVIEW_WIDTH = 200
const PREVIEW_HEIGHT = 280

const previewBoxStyle = computed(() => {
  const page = PAGE_SIZES.find(p => p.name === props.pageSize)
  if (!page) return { width: `${PREVIEW_WIDTH}px`, height: `${PREVIEW_HEIGHT}px` }

  const w = parseFloat(page.width)
  const h = parseFloat(page.height)
  const isLandscape = props.orientation === 'landscape'
  const pageW = isLandscape ? h : w
  const pageH = isLandscape ? w : h
  const scale = Math.min(PREVIEW_WIDTH / pageW, PREVIEW_HEIGHT / pageH) * 0.8

  return {
    width: `${Math.round(pageW * scale)}px`,
    height: `${Math.round(pageH * scale)}px`,
  }
})

const lineStyle = computed(() => {
  const page = PAGE_SIZES.find(p => p.name === props.pageSize)
  if (!page) return { top: {}, bottom: {}, left: {}, right: {} }

  const w = parseFloat(page.width)
  const h = parseFloat(page.height)
  const isLandscape = props.orientation === 'landscape'
  const pageW = isLandscape ? h : w
  const pageH = isLandscape ? w : h
  const scale = Math.min(PREVIEW_WIDTH / pageW, PREVIEW_HEIGHT / pageH) * 0.8

  // Convert inches to mm (×25.4), then scale to preview pixels
  const topPx = Math.max(2, dialogMargin.value.top * 25.4 * scale)
  const bottomPx = Math.max(2, dialogMargin.value.bottom * 25.4 * scale)
  const leftPx = Math.max(2, dialogMargin.value.left * 25.4 * scale)
  const rightPx = Math.max(2, dialogMargin.value.right * 25.4 * scale)

  return {
    top: { position: 'absolute' as const, top: `${topPx}px`, left: 0, right: 0, height: 0, borderTop: dialogMargin.value.top === 0 ? 'none' : '2px dashed var(--text-primary)' },
    bottom: { position: 'absolute' as const, bottom: `${bottomPx}px`, left: 0, right: 0, height: 0, borderTop: dialogMargin.value.bottom === 0 ? 'none' : '2px dashed var(--text-primary)' },
    left: { position: 'absolute' as const, left: `${leftPx}px`, top: 0, bottom: 0, width: 0, borderLeft: dialogMargin.value.left === 0 ? 'none' : '2px dashed var(--text-primary)' },
    right: { position: 'absolute' as const, right: `${rightPx}px`, top: 0, bottom: 0, width: 0, borderLeft: dialogMargin.value.right === 0 ? 'none' : '2px dashed var(--text-primary)' },
  }
})

function parseInches(value: string): number {
  const num = parseFloat(value) || 0
  if (value.includes('in')) return num
  if (value.includes('cm')) return num / 2.54
  if (value.includes('mm')) return num / 25.4
  if (value.includes('px')) return num / 96
  return num
}

function openDialog() {
  dialogMargin.value = {
    top: parseInches(props.modelValue.top),
    right: parseInches(props.modelValue.right),
    bottom: parseInches(props.modelValue.bottom),
    left: parseInches(props.modelValue.left),
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
}

function updateDialogMargin(side: 'top' | 'right' | 'bottom' | 'left', value: number) {
  const num = value || 0
  const next = { ...dialogMargin.value, [side]: num }
  if (lockHorizontal.value && (side === 'left' || side === 'right')) {
    next.left = num
    next.right = num
  }
  if (lockVertical.value && (side === 'top' || side === 'bottom')) {
    next.top = num
    next.bottom = num
  }
  dialogMargin.value = next
}

function stepMargin(side: 'top' | 'right' | 'bottom' | 'left', delta: number) {
  const next = Math.round((dialogMargin.value[side] + delta) * 100) / 100
  const val = Math.max(0, next)
  const result = { ...dialogMargin.value, [side]: val }
  if (lockHorizontal.value && (side === 'left' || side === 'right')) {
    result.left = val
    result.right = val
  }
  if (lockVertical.value && (side === 'top' || side === 'bottom')) {
    result.top = val
    result.bottom = val
  }
  dialogMargin.value = result
}

function applyCustom() {
  emit('update:modelValue', {
    top: `${dialogMargin.value.top}in`,
    right: `${dialogMargin.value.right}in`,
    bottom: `${dialogMargin.value.bottom}in`,
    left: `${dialogMargin.value.left}in`,
  })
  showDialog.value = false
}
</script>

<style scoped>
.margin-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.margin-picker-label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.margin-selector {
  position: relative;
  min-width: 104px;
}

.margin-preview-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 8px 0;
}

.margin-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-subtle);
}

.margin-preview-middle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.margin-input-with-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.margin-lock-btn {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  color: var(--text-tertiary);
  background: transparent;
  cursor: pointer;
}

.margin-lock-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.margin-lock-btn.active {
  color: var(--accent-color);
  background: var(--accent-soft);
}

.margin-preview-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  background: #fff;
  box-shadow: var(--shadow-md);
}

.margin-preview-label {
  z-index: 1;
  color: var(--text-secondary);
  font-size: 9px;
}

@media (max-width: 560px) {
  .margin-preview-middle {
    gap: 4px;
  }

  .margin-input-group :deep(.p-inputnumber-input) {
    width: 52px !important;
  }
}
</style>
