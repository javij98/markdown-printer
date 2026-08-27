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
  font-size: 12px;
  color: var(--text-primary);
  opacity: 0.8;
}

.size-option {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-preview-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.size-preview {
  border: 1.5px solid #999;
  border-radius: 2px;
  background: white;
}

.size-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.size-name {
  font-weight: 500;
  white-space: nowrap;
}

.size-dims {
  font-size: 10px;
  color: #888;
  white-space: nowrap;
}

.size-group-header {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  opacity: 0.5;
  padding: 4px 0;
}
</style>
