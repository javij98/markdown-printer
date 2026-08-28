<template>
  <div class="download-menu">
    <SplitButton
      size="small"
      class="print-action"
      @click="downloadPDF"
      :model="menuItems"
      :disabled="isGenerating"
      :buttonProps="{ title: isGenerating ? 'Preparando impresión...' : 'Imprimir o guardar como PDF', 'aria-label': isGenerating ? 'Preparando impresión' : 'Imprimir o guardar como PDF' }"
    >
      <LoaderCircle v-if="isGenerating" :size="16" class="spin" />
      <Printer v-else :size="16" />
      <span>{{ isGenerating ? 'Preparando…' : 'Imprimir' }}</span>
    </SplitButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SplitButton from 'primevue/splitbutton'
import type { MenuItem } from 'primevue/menuitem'
import { Printer, LoaderCircle } from '@lucide/vue'

const props = defineProps<{
  content: string
  renderedHtml: string
  isGenerating: boolean
}>()

const emit = defineEmits<{
  'download-pdf': []
}>()

function downloadMD() {
  const blob = new Blob([props.content], { type: 'text/markdown' })
  downloadBlob(blob, 'document.md')
}

function downloadPDF() {
  emit('download-pdf')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const menuItems = ref<MenuItem[]>([
  {
    label: 'Markdown (.md)',
    command: downloadMD,
  },
])
</script>

<style scoped>
.download-menu {
  position: relative;
}

.download-menu :deep(.print-action) {
  overflow: hidden;
  border-radius: 11px;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--accent-color) 24%, transparent);
  transition: transform .16s ease, box-shadow .16s ease;
}

.download-menu :deep(.print-action:hover:not(.p-disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 9px 22px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.download-menu :deep(.print-action .p-splitbutton-button),
.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  height: 38px;
  border-color: transparent;
  color: #fff;
  background: var(--accent-color);
}

.download-menu :deep(.print-action .p-splitbutton-button) {
  min-width: 108px;
  display: flex;
  justify-content: center;
  gap: 8px;
  border-radius: 11px 0 0 11px;
  font-size: 11px;
  font-weight: 750;
}

.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  width: 34px;
  border-left: 1px solid rgb(255 255 255 / 20%);
  border-radius: 0 11px 11px 0;
  background: color-mix(in srgb, var(--accent-color) 88%, #182033);
}

.download-menu :deep(.print-action .p-splitbutton-button:hover),
.download-menu :deep(.print-action .p-splitbutton-dropdown:hover) {
  background: var(--accent-hover);
}

.download-menu :deep(.print-action .p-splitbutton-button:focus-visible),
.download-menu :deep(.print-action .p-splitbutton-dropdown:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--accent-color) 55%, white);
  outline-offset: 2px;
}

.download-menu :deep(.print-action.p-disabled) {
  box-shadow: none;
  opacity: .7;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 680px) {
  .download-menu :deep(.print-action .p-splitbutton-button) {
    min-width: 38px;
    width: 38px;
    padding: 0;
    border-radius: 10px;
  }

  .download-menu :deep(.print-action .p-splitbutton-button span) {
    display: none;
  }

  .download-menu :deep(.print-action .p-splitbutton-dropdown) {
    display: none;
  }
}
</style>