<template>
  <Dialog
    v-model:visible="localVisible"
    modal
    header="Galería de imágenes"
    :style="{ width: '720px' }"
    :contentStyle="{ padding: 0 }"
  >
    <div class="gallery-container">
      <div class="gallery-upload">
        <FileUpload
          mode="basic"
          name="image"
          accept="image/*"
          :maxFileSize="10000000"
          chooseLabel="Subir imagen"
          chooseIcon="pi pi-upload"
          @select="onUpload"
          :auto="true"
          severity="secondary"
        />
      </div>

      <div v-if="loading" class="gallery-loading">
        <ProgressSpinner />
      </div>

      <div v-else-if="images.length === 0" class="gallery-empty">
        Todavía no hay imágenes. Sube la primera para insertarla.
      </div>

      <div v-else class="gallery-grid">
        <div
          v-for="img in images"
          :key="img.id"
          class="gallery-item"
          @click="onSelect(img)"
        >
          <img :src="getImageUrl(img.id) || ''" :alt="img.name" class="gallery-thumb" />
          <div class="gallery-item-name">{{ img.name }}</div>
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            class="gallery-delete-btn"
            @click.stop="onRemove(img.id)"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useImages } from '../composables/useImages'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [filename: string]
}>()

const { images, loading, loadImages, uploadImage, removeImage, getImageUrl } = useImages()

const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

watch(() => props.visible, (val) => {
  if (val) {
    loadImages()
  }
})

async function onUpload(event: FileUploadSelectEvent) {
  const file = event.files[0]
  if (file) {
    await uploadImage(file)
  }
}

function onSelect(img: { id: string; name: string }) {
  emit('select', img.name)
  localVisible.value = false
}

async function onRemove(id: string) {
  await removeImage(id)
}
</script>

<style scoped>
.gallery-container {
  max-height: min(560px, 72vh);
  display: flex;
  flex-direction: column;
}

.gallery-upload {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-subtle);
}

.gallery-loading,
.gallery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 190px;
  padding: 36px;
}

.gallery-empty {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
  gap: 12px;
  max-height: 430px;
  padding: 16px;
  overflow-y: auto;
}

.gallery-item {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}

.gallery-item:hover {
  border-color: color-mix(in srgb, var(--accent-color) 52%, var(--border-color));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.gallery-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  object-fit: cover;
  background: var(--bg-secondary);
}

.gallery-item-name {
  padding: 8px 9px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 600;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  color: white !important;
  background: rgb(17 24 39 / 78%) !important;
  backdrop-filter: blur(6px);
  transition: opacity .15s ease;
}

.gallery-item:hover .gallery-delete-btn {
  opacity: 1;
}

@media (max-width: 560px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 10px;
  }
}
</style>