<template>
  <div
    class="tab-item"
    :class="{ active: isActive }"
    @click="$emit('select')"
    @dblclick="startRename"
    @contextmenu.prevent="showContextMenu"
  >
    <input
      v-if="isRenaming"
      ref="renameInput"
      v-model="renameValue"
      class="tab-rename-input"
      @blur="finishRename"
      @keydown.enter="finishRename"
      @keydown.escape="cancelRename"
    />
    <span v-else class="tab-name">{{ tab.name }}</span>
    <button
      v-if="closable"
      class="tab-close"
      @click.stop="$emit('close')"
      title="Cerrar pestaña"
    >
      <X :size="14" />
    </button>
    <div v-if="contextMenuVisible" class="tab-context-menu" :style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }" @click.stop>
      <button class="context-menu-item" @click="startRenameFromContext">Renombrar</button>
      <button class="context-menu-item" @click="$emit('close')">Cerrar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import type { Tab } from '../utils/types'
import { X } from '@lucide/vue';

const props = defineProps<{
  tab: Tab
  isActive: boolean
  closable: boolean
  isNewTab: boolean
}>()

const emit = defineEmits<{
  select: []
  close: []
  rename: [name: string]
}>()

const isRenaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function showContextMenu(e: MouseEvent) {
  if (props.isNewTab) return
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

function startRenameFromContext() {
  contextMenuVisible.value = false
  startRename()
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})

function startRename() {
  if (props.isNewTab) return
  renameValue.value = props.tab.name
  isRenaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

function finishRename() {
  if (renameValue.value.trim()) {
    emit('rename', renameValue.value.trim())
  }
  isRenaming.value = false
}

function cancelRename() {
  isRenaming.value = false
}
</script>

<style scoped>
.tab-item {
  position: relative;
  min-width: 128px;
  max-width: 220px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 12px;
  border-right: 1px solid transparent;
  border-left: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transform-origin: left center;
  transition: color .15s ease, background-color .15s ease, border-color .15s ease;
}

.tab-item::after {
  position: absolute;
  right: 12px;
  bottom: 0;
  left: 12px;
  height: 2px;
  content: "";
  border-radius: 999px 999px 0 0;
  background: transparent;
  transform: scaleX(.65);
  transition: background-color .15s ease, transform .15s ease;
}

.tab-item:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}

.tab-item.active {
  z-index: 1;
  border-color: var(--border-color);
  color: var(--text-primary);
  background: var(--bg-primary);
}

.tab-item.active::after {
  background: var(--accent-color);
  transform: scaleX(1);
}

.tab-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-rename-input {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid var(--accent-color);
  border-radius: 6px;
  outline: none;
  color: var(--text-primary);
  background: var(--bg-primary);
  font-size: 11px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 13%, transparent);
}

.tab-close {
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 7px;
  color: var(--text-tertiary);
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition: color .15s ease, background-color .15s ease, opacity .15s ease;
}

.tab-item:hover .tab-close,
.tab-item.active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  color: var(--danger-color);
  background: color-mix(in srgb, var(--danger-color) 10%, transparent);
}

.tab-context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 144px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
}

.context-menu-item {
  width: 100%;
  display: block;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
}

.context-menu-item:hover {
  background: var(--surface-hover);
}

@media (max-width: 620px) {
  .tab-item {
    min-width: 105px;
    max-width: 150px;
    padding-inline: 9px;
  }

  .tab-close {
    opacity: 1;
  }
}
</style>