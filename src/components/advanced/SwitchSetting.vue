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
  min-height: 49px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
}

.switch-setting:last-child {
  border-bottom: 0;
}

.switch-setting > span {
  display: grid;
  gap: 3px;
}

.switch-setting strong {
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 680;
}

.switch-setting small {
  max-width: 270px;
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.4;
}
</style>
