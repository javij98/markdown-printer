<template>
  <div class="ai-settings-wrapper">
    <Popover ref="popoverRef" @hide="onHide" :dismissable="true" :closeOnEscape="true">
      <div class="ai-settings">
        <div class="ai-settings-header">Asistente de escritura</div>
        <div class="field">
          <label for="ai-endpoint">Endpoint de la API</label>
          <InputText id="ai-endpoint" v-model="form.endpoint" placeholder="https://api.openai.com" class="w-full" />
        </div>
        <div class="field">
          <label for="ai-apikey">Clave API</label>
          <InputText
            id="ai-apikey"
            v-model="form.apiKey"
            type="password"
            :placeholder="hasSavedKey ? '•••••••• (saved)' : 'sk-...'"
            class="w-full"
          />
          <small class="field-hint">La clave se guarda solo en este navegador y nunca se comparte.</small>
        </div>
        <div class="field">
          <label for="ai-model">Modelo</label>
          <div class="model-row">
            <Select
              id="ai-model"
              v-model="form.model"
              :options="models"
              option-value="name"
              option-label="name"
              placeholder="Selecciona o busca un modelo"
              class="model-select"
              :loading="fetchingModels"
              :disabled="!form.endpoint || !getEffectiveApiKey()"
              filter
              :filter-fields="['name']"
              :show-clear="false"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              :loading="fetchingModels"
              :disabled="!form.endpoint || !getEffectiveApiKey()"
              @click="loadModels"
              title="Actualizar modelos disponibles"
            />
          </div>
        </div>
        <div class="field row">
          <label>Activar autocompletado con IA</label>
          <ToggleSwitch v-model="form.enabled" />
        </div>
        <div class="test-row">
          <Button
            label="Probar conexión"
            severity="secondary"
            size="small"
            :loading="testing"
            :disabled="!form.endpoint || !getEffectiveApiKey() || !form.model"
            @click="testConnection"
          />
          <span v-if="testResult === 'success'" class="test-success">Conectado</span>
          <span v-else-if="testResult === 'error'" class="test-error">{{ testError }}</span>
        </div>
        <div v-if="testResult === 'error' && testError.includes('CORS')" class="cors-hint">
          <strong>Error CORS:</strong> El servidor de la API debe incluir <code>Access-Control-Allow-Origin</code> para permitir peticiones desde el navegador. Activa CORS en el proveedor de la API.
        </div>
        <div class="ai-settings-footer">
          <Button label="Cancelar" severity="secondary" size="small" text @click="visible = false" />
          <Button label="Guardar" size="small" :disabled="!form.endpoint || !getEffectiveApiKey() || !form.model" @click="save" />
        </div>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import Popover from 'primevue/popover'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { loadLlmConfig, saveLlmConfig, isLlmEnabled, setLlmEnabled } from '../utils/storage'
import { streamCompletion, fetchModels } from '../services/llm'

const props = defineProps<{
  triggerEl?: HTMLElement | null
}>()

const visible = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  saved: []
}>()

const form = reactive({
  endpoint: '',
  apiKey: '',
  model: '',
  enabled: false,
})

const models = ref<{ name: string }[]>([])
const fetchingModels = ref(false)
const testing = ref(false)
const testResult = ref<'success' | 'error' | null>(null)
const testError = ref('')
const hasSavedKey = ref(false)
let savedApiKey = ''

const popoverRef = ref()

watch(visible, async (v) => {
  await nextTick()
  if (v) {
    testResult.value = null
    testError.value = ''
    models.value = []
    form.apiKey = ''
    hasSavedKey.value = false
    savedApiKey = ''
    const config = await loadLlmConfig()
    if (config) {
      form.endpoint = config.endpoint
      form.model = config.model
      if (config.apiKey) {
        hasSavedKey.value = true
        savedApiKey = config.apiKey
      }
      if (form.endpoint && hasSavedKey.value) {
        loadModels()
      }
    }
    form.enabled = isLlmEnabled()

    // Show popover anchored to the trigger element
    if (props.triggerEl && popoverRef.value) {
      const rect = props.triggerEl.getBoundingClientRect()
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top,
      })
      Object.defineProperty(event, 'target', { value: props.triggerEl })
      Object.defineProperty(event, 'currentTarget', { value: props.triggerEl })
      popoverRef.value.show(event)
    }
  } else if (!v && popoverRef.value) {
    popoverRef.value.hide()
  }
})

function onHide() {
  visible.value = false
}

function getEffectiveApiKey(): string {
  return form.apiKey || savedApiKey
}

async function loadModels() {
  const key = getEffectiveApiKey()
  if (!form.endpoint || !key) return
  fetchingModels.value = true
  try {
    const list = await fetchModels(form.endpoint, key)
    models.value = list.filter(Boolean).map(m => ({ name: m }))
  } catch (e: any) {
    console.error('[AiSettings] Failed to fetch models:', e)
    models.value = []
  } finally {
    fetchingModels.value = false
  }
}

async function testConnection() {
  const key = getEffectiveApiKey()
  testing.value = true
  testResult.value = null
  testError.value = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const gen = streamCompletion({
      endpoint: form.endpoint,
      apiKey: key,
      model: form.model,
      messages: [{ role: 'user', content: 'Hi' }],
      signal: controller.signal,
    })
    await gen.next()
    clearTimeout(timeout)
    controller.abort()
    testResult.value = 'success'
  } catch (e: any) {
    testResult.value = 'error'
    testError.value = e?.message || 'Connection failed'
  } finally {
    testing.value = false
  }
}

async function save() {
  const key = getEffectiveApiKey()
  await saveLlmConfig({
    endpoint: form.endpoint,
    apiKey: key,
    model: form.model,
  })
  setLlmEnabled(form.enabled)
  emit('saved')
  visible.value = false
}
</script>

<style scoped>
.ai-settings {
  width: 470px;
  max-width: 88dvw;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.ai-settings-header {
  margin-bottom: 2px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -.02em;
}

.ai-settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 3px -18px -18px;
  padding: 13px 18px 0;
  border-top: 1px solid var(--border-color);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 680;
}

.field.row {
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  flex-direction: row;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-subtle);
}

.model-row,
.test-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select {
  flex: 1;
}

.test-row {
  min-height: 36px;
}

.test-success,
.test-error {
  font-size: 10px;
  font-weight: 650;
}

.test-success {
  color: var(--success-color);
}

.test-error {
  color: var(--danger-color);
}

.cors-hint {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--warning-color) 30%, var(--border-color));
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--warning-color) 9%, var(--bg-primary));
  font-size: 10px;
  line-height: 1.5;
}

.cors-hint code {
  padding: 2px 4px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--warning-color) 12%, transparent);
  font-size: 9px;
}

.field-hint {
  margin-top: 1px;
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.4;
}

.w-full {
  width: 100%;
}

@media (max-width: 520px) {
  .ai-settings {
    width: 82vw;
  }
}
</style>