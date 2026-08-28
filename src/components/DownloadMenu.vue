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
  box-shadow: 0 5px 14px rgb(37 99 235 / 22%);
  transition: transform .16s ease, box-shadow .16s ease;
}

.download-menu :deep(.print-action:hover:not(.p-disabled)) {
  transform: translateY(-1px);
  box-shadow: 0 7px 18px rgb(37 99 235 / 30%);
}

.download-menu :deep(.print-action .p-splitbutton-button),
.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  height: 36px;
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  transition: filter .16s ease, background .16s ease;
}

.download-menu :deep(.print-action .p-splitbutton-button) {
  display: flex;
  min-width: 104px;
  gap: 7px;
  justify-content: center;
  border-radius: 11px 0 0 11px;
  font-weight: 650;
}

.download-menu :deep(.print-action .p-splitbutton-dropdown) {
  width: 32px;
  border-left-color: rgb(255 255 255 / 18%);
  border-radius: 0 11px 11px 0;
}

.download-menu :deep(.print-action .p-splitbutton-button:hover),
.download-menu :deep(.print-action .p-splitbutton-dropdown:hover) {
  filter: brightness(1.08) saturate(1.05);
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
