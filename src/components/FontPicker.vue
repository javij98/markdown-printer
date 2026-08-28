<template>
  <div class="font-picker">
    <label>Fuente:</label>
    <Select
      ref="selectRef"
      :modelValue="modelValue"
      @update:modelValue="handleFontSelect"
      :options="selectGroups"
      optionLabel="name"
      optionValue="family"
      optionGroupLabel="label"
      optionGroupChildren="items"
      size="small"
      class="font-select"
    >
      <template #value="{ value }">
        <span v-if="value" :style="{ fontFamily: value }" class="font-value-text">
          {{ getFontName(value) }}
        </span>
        <span v-else>Selecciona una fuente</span>
      </template>
      <template #option="{ option, selected }">
        <div
          :class="['font-option-item', { 'font-option-selected': selected }]"
          :style="{ fontFamily: option.family }"
          @mousedown="handleOptionMouseDown($event, option)"
          @contextmenu.prevent="handleOptionContextMenu($event, option)"
        >
          {{ option.name }}
        </div>
      </template>
      <template #optiongroup="{ option }">
        <div class="font-group-header">{{ option.label }}</div>
      </template>
      <template #footer>
        <div class="font-upload-footer" @click="startUpload">
          ＋ Subir fuente…
        </div>
      </template>
    </Select>

    <Menu ref="contextMenuRef" :model="contextMenuItems" :popup="true" @hide="contextMenuFont = null">
      <template #item="{ item, props }">
        <a v-bind="props.action" :class="{ 'font-context-danger': item.class === 'danger' }">
          {{ item.label }}
        </a>
      </template>
    </Menu>

    <input ref="fileInput" type="file" accept=".woff,.woff2,.ttf,.otf" @change="handleUpload" hidden />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { FontOption } from '../utils/types'
import { getAllFonts } from '../utils/constants'
import { getAllStoredFonts, putFont, deleteFont } from '../utils/storage'
import Select from 'primevue/select'
import Menu from 'primevue/menu'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fileInput = ref<HTMLInputElement>()
const fonts = ref<FontOption[]>([])
const contextMenuRef = ref()
const contextMenuFont = ref<FontOption | null>(null)
const selectRef = ref()

const uploadedFonts = computed(() => fonts.value.filter(f => f.source === 'uploaded'))

const groupedFonts = computed(() => {
  const groups: Record<string, FontOption[]> = {}
  for (const font of fonts.value) {
    if (font.source === 'uploaded') continue
    const label = font.group || 'Other'
    if (!groups[label]) groups[label] = []
    groups[label].push(font)
  }
  return groups
})

const selectGroups = computed(() => {
  const groups: { label: string; items: FontOption[] }[] = []
  if (uploadedFonts.value.length > 0) {
    groups.push({ label: 'Custom', items: [...uploadedFonts.value] })
  }
  for (const [label, groupFonts] of Object.entries(groupedFonts.value)) {
    groups.push({ label, items: groupFonts })
  }
  return groups
})

const contextMenuItems = computed(() => [
  { label: 'Renombrar', command: () => renameFont() },
  { label: 'Eliminar', command: () => removeFont(), class: 'danger' },
])

function getFontName(family: string): string {
  const font = fonts.value.find(f => f.family === family)
  return font ? font.name : family
}

function handleFontSelect(value: string) {
  emit('update:modelValue', value)
}

function startUpload() {
  selectRef.value?.hide()
  fileInput.value?.click()
}

function openContextMenu(event: MouseEvent, font: FontOption) {
  contextMenuFont.value = font
  contextMenuRef.value?.show(event)
}

function handleOptionMouseDown(event: MouseEvent, option: FontOption) {
  if (event.button === 2 && option.source === 'uploaded') {
    event.stopImmediatePropagation()
  }
}

function handleOptionContextMenu(event: MouseEvent, option: FontOption) {
  if (option.source === 'uploaded') {
    openContextMenu(event, option)
  }
}

onMounted(async () => {
  fonts.value = getAllFonts()

  const stored = await getAllStoredFonts()
  for (const s of stored) {
    const buffer = await s.blob.arrayBuffer()
    const fontFace = new FontFace(s.family, buffer)
    await fontFace.load()
    document.fonts.add(fontFace)
    fonts.value.push({
      name: s.name,
      family: s.family,
      source: 'uploaded',
      group: s.group,
    })
  }
})

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const defaultName = file.name.replace(/\.(woff2?|ttf|otf)$/, '')
  const customName = window.prompt('Nombre de la fuente:', defaultName)
  if (customName === null || customName.trim() === '') {
    input.value = ''
    return
  }

  const fontName = customName.trim()
  const fontFamily = `Custom-${fontName}`

  if (fonts.value.some(f => f.source === 'uploaded' && f.name.toLowerCase() === fontName.toLowerCase())) {
    alert(`Ya existe una fuente personalizada llamada "${fontName}".`)
    input.value = ''
    return
  }

  const buffer = await file.arrayBuffer()

  try {
    const font = new FontFace(fontFamily, buffer)
    await font.load()
    document.fonts.add(font)

    const newFont: FontOption = {
      name: fontName,
      family: fontFamily,
      source: 'uploaded',
      group: 'Custom',
    }
    fonts.value.push(newFont)

    await putFont({
      family: fontFamily,
      name: fontName,
      group: 'Custom',
      blob: new File([buffer], file.name, { type: file.type }),
    })

    emit('update:modelValue', fontFamily)
  } catch (err) {
    console.error('Failed to load font:', err)
  }

  input.value = ''
}

async function renameFont() {
  const font = contextMenuFont.value
  if (!font) return

  const newName = window.prompt('Nombre de la fuente:', font.name)
  if (newName === null || newName.trim() === '' || newName.trim() === font.name) return

  const trimmed = newName.trim()
  const newFamily = `Custom-${trimmed}`
  const oldFamily = font.family

  if (fonts.value.some(f => f.source === 'uploaded' && f.family !== oldFamily && f.name.toLowerCase() === trimmed.toLowerCase())) {
    alert(`Ya existe una fuente personalizada llamada "${trimmed}".`)
    return
  }

  const oldFont = (await getAllStoredFonts()).find(f => f.family === oldFamily)
  if (!oldFont) return

  await deleteFont(oldFamily)

  await putFont({
    family: newFamily,
    name: trimmed,
    group: 'Custom',
    blob: oldFont.blob,
  })

  font.name = trimmed
  font.family = newFamily

  if (props.modelValue === oldFamily) {
    emit('update:modelValue', newFamily)
  }
}

async function removeFont() {
  const font = contextMenuFont.value
  if (!font) return

  if (!window.confirm(`¿Eliminar "${font.name}"?`)) return

  await deleteFont(font.family)
  fonts.value = fonts.value.filter(f => f.family !== font.family)

  if (props.modelValue === font.family) {
    emit('update:modelValue', 'Open Sans')
  }
}
</script>

<style scoped>
.font-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.font-select {
  min-width: 128px;
}

.font-value-text {
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-option-item {
  padding-block: 2px;
  white-space: nowrap;
}

.font-group-header {
  padding: 5px 2px 3px;
  color: var(--text-tertiary);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.font-upload-footer {
  margin: 4px 6px 6px;
  padding: 8px 10px;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--accent-color);
  cursor: pointer;
  font-size: 11px;
  font-weight: 650;
}

.font-upload-footer:hover {
  border-color: var(--accent-color);
  background: var(--accent-soft);
}
</style>

<style>
.font-context-danger {
  color: #e55;
}
</style>
