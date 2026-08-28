<template>
  <div class="preset-picker">
    <label for="print-preset">Diseño:</label>
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
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .025em;
}

.preset-select {
  min-width: 142px;
}

.preset-option {
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-block: 2px;
}

.preset-option strong {
  font-size: 12px;
  font-weight: 700;
}

.preset-option span {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.4;
  white-space: normal;
}
</style>
