<template>
  <label class="switch-setting">
    <span>
      <strong>{{ label }}</strong>
      <small>{{ description }}</small>
    </span>
    <ToggleSwitch :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
  </label>
</template>

<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'

defineProps<{ label: string; description: string; modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.switch-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
}
.switch-setting > span { display: grid; gap: 3px; }
.switch-setting strong { color: var(--text-primary); font-size: 12px; font-weight: 600; }
.switch-setting small { max-width: 270px; color: var(--text-secondary); font-size: 11px; line-height: 1.35; }
</style>
