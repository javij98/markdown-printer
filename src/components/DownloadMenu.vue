<template>
  <div class="download-menu">
    <SplitButton
      severity="info"
      size="small"
      @click="downloadPDF"
      :model="menuItems"
      :disabled="isGenerating"
      :buttonProps="{ title: isGenerating ? 'Preparando impresión...' : 'Imprimir' }"
    >
      <LoaderCircle v-if="isGenerating" :size="16" class="spin" />
      <Printer v-else :size="16" />
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

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
