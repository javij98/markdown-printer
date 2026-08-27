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
  border-radius: 10px;
  box-shadow: 0 4px 12px rgb(15 23 42 / 15%);
}

.download-menu :deep(.print-action .p-splitbutton-button),
.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  border-color: #172033;
  background: linear-gradient(135deg, #172033, #26364d);
  color: #fff;
  transition: filter .16s ease, transform .16s ease, box-shadow .16s ease;
}

.download-menu :deep(.print-action .p-splitbutton-button) {
  display: flex;
  min-width: 102px;
  gap: 7px;
  justify-content: center;
  border-radius: 10px 0 0 10px;
  font-weight: 650;
}

.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  width: 32px;
  border-left-color: rgb(255 255 255 / 18%);
  border-radius: 0 10px 10px 0;
}

.download-menu :deep(.print-action .p-splitbutton-button:hover),
.download-menu :deep(.print-action .p-splitbutton-dropdown:hover) {
  filter: brightness(1.14);
}

.download-menu :deep(.print-action .p-splitbutton-button:focus-visible),
.download-menu :deep(.print-action .p-splitbutton-dropdown:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--accent-color) 70%, white);
  outline-offset: 2px;
}

.download-menu :deep(.print-action.p-disabled) {
  box-shadow: none;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
