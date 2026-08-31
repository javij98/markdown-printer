<template>
  <Teleport to="body">
    <Dialog v-model:visible="visible" header="Política de privacidad" modal :closable="true" :style="{ width: 'min(760px, 92vw)' }">
      <div class="privacy-content markdown-body" v-html="policyHtml"></div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import { marked } from 'marked'
import policyMd from '../POLICY.md?raw'

const visible = defineModel<boolean>({ default: false })

const policyHtml = computed(() => marked.parse(policyMd) as string)
</script>

<style scoped>
.privacy-content {
  max-height: min(68vh, 720px);
  padding: 4px 8px 12px 2px;
  overflow: auto;
  color: var(--text-primary);
  background-color: transparent;
}

.privacy-content :deep(h1:first-child) {
  display: none;
}

.privacy-content :deep(h2) {
  margin-top: 28px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 16px;
}

.privacy-content :deep(p),
.privacy-content :deep(li) {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.privacy-content :deep(a) {
  color: var(--accent-color, #30b9f5);
}
</style>
