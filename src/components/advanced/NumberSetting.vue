<template>
  <label class="number-setting">
    <span>{{ label }}</span>
    <InputNumber
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :min-fraction-digits="step < 1 ? 2 : 0"
      :max-fraction-digits="step < 1 ? 2 : 0"
      :suffix="suffix"
      show-buttons
      button-layout="horizontal"
      size="small"
      @update:model-value="$emit('update:modelValue', $event ?? modelValue)"
    />
  </label>
</template>

<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'

defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step: number
  suffix?: string
}>()

defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<style scoped>
.number-setting {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 550;
}

.number-setting :deep(.p-inputnumber) {
  width: 140px;
}

.number-setting :deep(.p-inputtext) {
  width: 74px;
  border-radius: 7px;
  font-size: 10px;
  text-align: center;
}

.number-setting :deep(.p-inputnumber-button) {
  width: 30px;
  border-color: var(--border-color);
  color: var(--text-secondary);
  background: var(--bg-primary);
}
</style>
