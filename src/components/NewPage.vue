<template>
  <div class="new-page">
    <div class="new-page-glow" aria-hidden="true"></div>
    <main class="new-page-content">
      <div class="hero-badge">
        <Sparkles :size="13" />
        <span>Espacio de maquetación</span>
      </div>

      <h1>Convierte tus ideas en un documento impecable.</h1>
      <p class="hero-description">
        Edita desde Markdown o por bloques, aplica un diseño profesional y comprueba cada página antes de imprimir.
      </p>

      <div
        class="drop-area"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <button class="start-box action-card action-primary" type="button" @click="$emit('create-new')">
          <span class="action-icon"><FileEdit :size="22" /></span>
          <span class="action-copy">
            <strong>Nuevo documento</strong>
            <small>Empieza con un lienzo limpio</small>
          </span>
          <ArrowRight :size="17" class="action-arrow" />
        </button>

        <button class="upload-box action-card" type="button" @click="triggerUpload">
          <span class="action-icon"><Upload :size="22" /></span>
          <span class="action-copy">
            <strong>Abrir Markdown</strong>
            <small>Importa archivos .md o .txt</small>
          </span>
          <ArrowRight :size="17" class="action-arrow" />
        </button>
        <input ref="fileInputRef" type="file" accept=".md,.markdown,.txt" @change="handleUpload" hidden />

        <div v-if="isDragging" class="drop-overlay">
          <span class="drop-icon"><FileUp :size="30" /></span>
          <strong>Suelta el documento aquí</strong>
          <small>Se abrirá en una pestaña nueva</small>
        </div>
      </div>

      <Button severity="secondary" text class="learn-btn" @click="$emit('upload-file', exampleContent, 'Ejemplo Markdown')">
        <CircleQuestionMark :size="15" />
        <span>Explorar un documento de ejemplo</span>
      </Button>

      <section v-if="history.length > 0" class="history-section">
        <div class="history-header">
          <div>
            <Clock3 :size="15" />
            <h2>Documentos recientes</h2>
          </div>
          <Button severity="secondary" text size="small" title="Borrar historial" @click="handleClearHistory">
            <Trash2 :size="14" />
          </Button>
        </div>

        <div class="history-list">
          <button
            v-for="tab in history"
            :key="tab.id"
            class="history-item"
            type="button"
            @click="$emit('open-tab', tab)"
          >
            <span class="history-icon"><FileText :size="15" /></span>
            <span class="history-info">
              <span class="history-name">{{ tab.name }}</span>
              <span class="history-date">{{ formatDate(tab.updatedAt) }}</span>
            </span>
            <span class="history-open"><ArrowRight :size="14" /></span>
            <span
              class="history-delete"
              role="button"
              tabindex="0"
              title="Eliminar del historial"
              @click.stop="handleDeleteHistory(tab.id)"
              @keydown.enter.stop="handleDeleteHistory(tab.id)"
            >
              <X :size="13" />
            </span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import type { Tab } from '../utils/types'
import { loadTabHistory, removeTabFromHistory, clearTabHistory } from '../utils/storage'
import { FileEdit, Upload, FileUp, Trash2, FileText, X, CircleQuestionMark, Sparkles, ArrowRight, Clock3 } from '@lucide/vue'
import exampleContent from '../EXAMPLE.md?raw'

const emit = defineEmits<{
  'create-new': []
  'open-tab': [tab: Tab]
  'upload-file': [content: string, name: string]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const history = ref<Tab[]>([])

onMounted(async () => {
  history.value = await loadTabHistory()
  document.addEventListener('dragenter', onDragEnter)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('drop', onGlobalDrop)
})

async function handleDeleteHistory(id: string) {
  if (!window.confirm('Remove from history?')) return
  await removeTabFromHistory(id)
  history.value = history.value.filter(t => t.id !== id)
}

async function handleClearHistory() {
  if (!window.confirm('Clear all history?')) return
  await clearTabHistory()
  history.value = []
}

onUnmounted(() => {
  document.removeEventListener('dragenter', onDragEnter)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('drop', onGlobalDrop)
})

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const content = await file.text()
  emit('upload-file', content, file.name.replace(/\.(md|markdown|txt)$/, ''))
  input.value = ''
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return

  file.text().then(text => {
    emit('upload-file', text, file.name.replace(/\.(md|markdown|txt)$/, ''))
  })
}

let dragCounter = 0

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) isDragging.value = false
}

function onGlobalDrop(e: DragEvent) {
  e.preventDefault()
  dragCounter = 0
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  file.text().then(text => {
    emit('upload-file', text, file.name.replace(/\.(md|markdown|txt)$/, ''))
  })
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-ES')
}
</script>

<style scoped>
.new-page {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: center;
  overflow: auto;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 40%, transparent), transparent 320px),
    var(--bg-secondary);
}

.new-page-glow {
  position: fixed;
  top: 80px;
  left: 50%;
  width: min(760px, 90vw);
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-color) 11%, transparent), transparent 68%);
  filter: blur(18px);
  pointer-events: none;
  transform: translateX(-50%);
}

.new-page-content {
  z-index: 1;
  width: min(100%, 840px);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  padding: clamp(54px, 9vh, 100px) 22px 64px;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 22%, var(--border-color));
  border-radius: 999px;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-soft) 74%, var(--bg-primary));
  box-shadow: var(--shadow-xs);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .025em;
}

h1 {
  max-width: 710px;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(34px, 5.5vw, 56px);
  font-weight: 760;
  line-height: 1.06;
  letter-spacing: -.055em;
  text-wrap: balance;
}

.hero-description {
  max-width: 620px;
  margin: 18px 0 32px;
  color: var(--text-secondary);
  font-size: clamp(13px, 1.7vw, 16px);
  line-height: 1.65;
  text-wrap: balance;
}

.drop-area {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-elevated) 90%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px);
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.drop-area.dragging {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-color) 13%, transparent), var(--shadow-lg);
  transform: translateY(-2px);
}

.action-card {
  min-height: 112px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  background: var(--surface-subtle);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--shadow-xs);
  transition: border-color .17s ease, background-color .17s ease, box-shadow .17s ease, transform .17s ease;
}

.action-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.action-primary {
  border-color: color-mix(in srgb, var(--accent-color) 24%, var(--border-color));
  background: linear-gradient(145deg, var(--accent-soft), color-mix(in srgb, var(--accent-soft) 45%, var(--bg-primary)));
}

.action-primary:hover {
  border-color: color-mix(in srgb, var(--accent-color) 52%, var(--border-color));
  background: var(--accent-soft);
}

.action-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.action-primary .action-icon {
  color: var(--accent-color);
}

.action-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.action-copy strong {
  font-size: 13px;
  font-weight: 730;
  letter-spacing: -.01em;
}

.action-copy small {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.35;
}

.action-arrow {
  color: var(--text-tertiary);
  transition: color .16s ease, transform .16s ease;
}

.action-card:hover .action-arrow {
  color: var(--accent-color);
  transform: translateX(3px);
}

.drop-overlay {
  position: absolute;
  z-index: 4;
  inset: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  border: 1px dashed var(--accent-color);
  border-radius: calc(var(--radius-xl) - 5px);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
  backdrop-filter: blur(14px);
}

.drop-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: 3px;
  border-radius: 14px;
  background: var(--accent-soft);
}

.drop-overlay strong {
  font-size: 13px;
}

.drop-overlay small {
  color: var(--text-secondary);
  font-size: 10px;
}

.learn-btn {
  width: fit-content;
  margin: 14px 0 28px;
  color: var(--text-secondary);
  font-size: 11px;
}

.history-section {
  width: 100%;
  text-align: left;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.history-header > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
}

.history-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 720;
  letter-spacing: -.01em;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: 235px;
  overflow-y: auto;
}

.history-item {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-primary) 86%, transparent);
  cursor: pointer;
  text-align: left;
  transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
}

.history-item:hover {
  border-color: var(--border-strong);
  background: var(--bg-primary);
  transform: translateY(-1px);
}

.history-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 9px;
  color: var(--accent-color);
  background: var(--accent-soft);
}

.history-info {
  min-width: 0;
  display: grid;
  flex: 1;
  gap: 3px;
}

.history-name {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-date {
  color: var(--text-tertiary);
  font-size: 9px;
}

.history-open {
  display: grid;
  place-items: center;
  color: var(--text-tertiary);
}

.history-delete {
  width: 25px;
  height: 25px;
  display: none;
  place-items: center;
  border-radius: 7px;
  color: var(--text-tertiary);
}

.history-item:hover .history-open {
  display: none;
}

.history-item:hover .history-delete {
  display: grid;
}

.history-delete:hover {
  color: var(--danger-color);
  background: color-mix(in srgb, var(--danger-color) 9%, transparent);
}

@media (max-width: 650px) {
  .new-page-content {
    padding: 42px 14px;
  }

  .drop-area,
  .history-list {
    grid-template-columns: 1fr;
  }

  .action-card {
    min-height: 92px;
  }

  h1 {
    font-size: 36px;
  }
}
</style>