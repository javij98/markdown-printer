<template>
  <div class="page-size-selector">
    <label>Página:</label>
    <Select
      :modelValue="modelValue"
      @update:modelValue="selectSize"
      :options="selectGroups"
      optionLabel="name"
      optionValue="name"
      optionGroupLabel="label"
      optionGroupChildren="items"
      size="small"
      class="page-size-select"
    >
      <template #value="{ value }">
        <span v-if="value">{{ value }}</span>
        <span v-else>Selecciona un tamaño</span>
      </template>
      <template #option="{ option, selected }">
        <div class="size-option">
          <div class="size-preview-wrapper">
            <div class="size-preview" :style="getPreviewStyle(option)"></div>
          </div>
          <div class="size-info">
            <span class="size-name">{{ option.name }}</span>
            <span class="size-dims">{{ formatDimensions(option) }}</span>
          </div>
        </div>
      </template>
      <template #optiongroup="{ option }">
        <div class="size-group-header">{{ PAGE_CATEGORIES[option.label as keyof typeof PAGE_CATEGORIES] || option.label }}</div>
      </template>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SIZES, PAGE_CATEGORIES, getPreviewScale } from '../utils/constants'
import type { PageSize } from '../utils/types'
import Select from 'primevue/select'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const groupedSizes = computed(() => {
  const groups: Record<string, PageSize[]> = {}
  for (const size of PAGE_SIZES) {
    if (!groups[size.category]) groups[size.category] = []
    groups[size.category].push(size)
  }
  return groups
})

const selectGroups = computed(() => {
  return Object.entries(groupedSizes.value).map(([category, sizes]) => ({
    label: category,
    items: sizes,
  }))
})

const MM_TO_INCH = 1 / 25.4

function formatDimensions(size: PageSize): string {
  const w = parseFloat(size.width) * MM_TO_INCH
  const h = parseFloat(size.height) * MM_TO_INCH
  return `${w.toFixed(1)} x ${h.toFixed(1)}"`
}

const PREVIEW_MAX = 32

function getPreviewStyle(size: PageSize) {
  const w = parseFloat(size.width)
  const h = parseFloat(size.height)
  const previewMax = PREVIEW_MAX * getPreviewScale(size)
  const ratio = Math.min(w, h) / Math.max(w, h)
  let previewW: number
  let previewH: number
  if (w >= h) {
    previewW = previewMax
    previewH = previewMax * ratio
  } else {
    previewH = previewMax
    previewW = previewMax * ratio
  }
  return {
    width: `${previewW}px`,
    height: `${previewH}px`,
  }
}

function selectSize(name: string) {
  emit('update:modelValue', name)
}
</script>

<style scoped>
.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.page-size-select {
  min-width: 88px;
}

.size-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-block: 2px;
}

.size-preview-wrapper {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.size-preview {
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  background: white;
  box-shadow: 0 2px 4px rgb(16 24 40 / 8%);
}

.size-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.size-name {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.size-dims {
  color: var(--text-tertiary);
  font-size: 9px;
  white-space: nowrap;
}

.size-group-header {
  padding: 5px 2px 3px;
  color: var(--text-tertiary);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: .08em;
  text-transform: uppercase;
}
</style>
