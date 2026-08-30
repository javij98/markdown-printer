<template>
  <div class="font-size-picker">
    <label for="print-font-size">Tamaño:</label>
    <Select
      input-id="print-font-size"
      :model-value="modelValue"
      :options="sizes"
      size="small"
      class="font-size-select"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <span class="unit">pt</span>
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select'

defineProps<{ modelValue: number }>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const sizes = [9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24]
</script>

<style scoped>
.font-size-picker {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

label,
.unit {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 650;
}

.unit {
  margin-left: -2px;
  color: var(--text-tertiary);
}

.font-size-select {
  width: 84px;
  min-width: 84px;
}

.font-size-select :deep(.p-select-label) {
  min-width: 34px;
  padding-inline: 10px 4px;
  overflow: visible;
  text-overflow: clip;
}

.font-size-select :deep(.p-select-dropdown) {
  width: 28px;
  flex: 0 0 28px;
}
</style>
