<template>
  <div class="preset-picker">
    <label for="print-preset">Diseño:</label>
    <div class="preset-control">
      <Select
        input-id="print-preset"
        :model-value="modelValue"
        :options="PRINT_PRESETS"
        option-label="name"
        option-value="id"
        size="small"
        class="preset-select"
        @update:model-value="$emit('update:modelValue', $event)"
      >
        <template #option="{ option }">
          <div class="preset-option">
            <strong>{{ option.name }}</strong>
            <span>{{ option.description }}</span>
          </div>
        </template>
      </Select>
      <button
        type="button"
        class="advanced-trigger"
        :class="{ active: advancedActive }"
        :aria-pressed="advancedActive"
        :title="advancedActive ? 'Personalización activa: abrir ajustes de diseño' : 'Personalizar este diseño'"
        @click="$emit('openAdvanced')"
      >
        <SlidersHorizontal :size="15" />
        <span v-if="advancedActive" class="active-dot"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import { SlidersHorizontal } from '@lucide/vue'
import { PRINT_PRESETS } from '../utils/constants'
import type { PrintPreset } from '../utils/types'

defineProps<{ modelValue: PrintPreset; advancedActive: boolean }>()

defineEmits<{
  'update:modelValue': [value: PrintPreset]
  openAdvanced: []
}>()
</script>

<style scoped>
.preset-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

label {
  color: var(--text-primary);
  font-size: 12px;
  opacity: 0.8;
}

.preset-control {
  display: flex;
  align-items: stretch;
  border-radius: 9px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 5%);
}

.preset-select {
  min-width: 128px;
}

.preset-control :deep(.preset-select.p-select) {
  border-radius: 9px 0 0 9px;
  border-right: 0;
}

.advanced-trigger {
  position: relative;
  display: grid;
  width: 34px;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 0 9px 9px 0;
  background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
  color: color-mix(in srgb, var(--text-primary) 72%, transparent);
  cursor: pointer;
  transition: background-color .16s ease, color .16s ease, transform .16s ease;
}

.advanced-trigger:hover,
.advanced-trigger.active {
  background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-primary));
  color: var(--accent-color);
}

.advanced-trigger:active {
  transform: scale(.96);
}

.active-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 15%, transparent);
}

.preset-option {
  display: flex;
  max-width: 280px;
  flex-direction: column;
  gap: 2px;
}

.preset-option span {
  color: var(--text-primary);
  font-size: 11px;
  opacity: 0.65;
  white-space: normal;
}
</style>
