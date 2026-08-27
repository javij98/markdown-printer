<template>
  <div class="preset-picker">
    <label for="print-preset">Estilo:</label>
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
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import { PRINT_PRESETS } from '../utils/constants'
import type { PrintPreset } from '../utils/types'

defineProps<{ modelValue: PrintPreset }>()

defineEmits<{
  'update:modelValue': [value: PrintPreset]
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

.preset-select {
  min-width: 128px;
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
