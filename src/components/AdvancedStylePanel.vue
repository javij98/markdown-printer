<template>
  <Drawer
    :visible="visible"
    position="right"
    class="advanced-style-drawer"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-heading">
        <div class="drawer-icon"><SlidersHorizontal :size="18" /></div>
        <div>
          <strong>Estilo avanzado</strong>
          <small>Personaliza la plantilla sin cambiar el Markdown</small>
        </div>
      </div>
    </template>

    <div class="advanced-content">
      <label class="master-toggle">
        <span>
          <strong>Aplicar personalización</strong>
          <small>Los cambios se reflejan al instante en la vista y el PDF.</small>
        </span>
        <ToggleSwitch
          :model-value="modelValue.enabled"
          @update:model-value="update('enabled', $event)"
        />
      </label>

      <div class="settings-body" :class="{ disabled: !modelValue.enabled }">
        <section>
          <h3>Colores</h3>
          <div class="color-grid">
            <label v-for="field in colorFields" :key="field.key" class="color-field">
              <span>{{ field.label }}</span>
              <span class="color-control">
                <input
                  type="color"
                  :value="modelValue[field.key]"
                  :aria-label="field.label"
                  @input="update(field.key, ($event.target as HTMLInputElement).value)"
                />
                <code>{{ modelValue[field.key] }}</code>
              </span>
            </label>
          </div>
        </section>

        <section>
          <h3>Ritmo y espaciado</h3>
          <NumberSetting
            label="Interlineado"
            :model-value="modelValue.lineHeight"
            :min="1.2"
            :max="2.2"
            :step="0.02"
            @update:model-value="update('lineHeight', $event)"
          />
          <NumberSetting
            label="Espacio entre párrafos"
            suffix=" em"
            :model-value="modelValue.paragraphSpacing"
            :min="0"
            :max="2.5"
            :step="0.05"
            @update:model-value="update('paragraphSpacing', $event)"
          />
          <NumberSetting
            label="Espacio antes de bloques"
            suffix=" em"
            :model-value="modelValue.blockSpacing"
            :min="0"
            :max="3"
            :step="0.05"
            @update:model-value="update('blockSpacing', $event)"
          />
          <NumberSetting
            label="Redondeo del código"
            suffix=" px"
            :model-value="modelValue.codeRadius"
            :min="0"
            :max="24"
            :step="1"
            @update:model-value="update('codeRadius', $event)"
          />
        </section>

        <section>
          <h3>Detalles de maquetación</h3>
          <SwitchSetting
            label="Borde en bloques de código"
            description="Añade un contorno fino alrededor del código."
            :model-value="modelValue.codeBorder"
            @update:model-value="update('codeBorder', $event)"
          />
          <SwitchSetting
            label="Acento lateral en el código"
            description="Añade una línea con el color principal. Desactivado por defecto."
            :model-value="modelValue.codeAccent"
            @update:model-value="update('codeAccent', $event)"
          />
          <SwitchSetting
            label="Divisores en los títulos"
            description="Separa los títulos principales con una línea discreta."
            :model-value="modelValue.headingDividers"
            @update:model-value="update('headingDividers', $event)"
          />
          <SwitchSetting
            label="Justificar párrafos"
            description="Alinea ambos márgenes para documentos académicos."
            :model-value="modelValue.justifyText"
            @update:model-value="update('justifyText', $event)"
          />
          <SwitchSetting
            label="Separación automática de palabras"
            description="Reduce huecos en texto justificado cuando el navegador lo permite."
            :model-value="modelValue.hyphenate"
            @update:model-value="update('hyphenate', $event)"
          />
        </section>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <Button label="Restablecer" severity="secondary" text @click="$emit('reset')">
          <RotateCcw :size="15" />
        </Button>
        <Button label="Listo" @click="$emit('update:visible', false)" />
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { RotateCcw, SlidersHorizontal } from '@lucide/vue'
import type { AdvancedPrintStyle } from '../utils/types'
import NumberSetting from './advanced/NumberSetting.vue'
import SwitchSetting from './advanced/SwitchSetting.vue'

const props = defineProps<{
  visible: boolean
  modelValue: AdvancedPrintStyle
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:modelValue': [value: AdvancedPrintStyle]
  reset: []
}>()

const colorFields: Array<{
  key: 'accentColor' | 'textColor' | 'headingColor' | 'mutedColor' | 'borderColor' | 'codeBackground'
  label: string
}> = [
  { key: 'accentColor', label: 'Acento' },
  { key: 'textColor', label: 'Texto' },
  { key: 'headingColor', label: 'Títulos' },
  { key: 'mutedColor', label: 'Texto secundario' },
  { key: 'borderColor', label: 'Bordes' },
  { key: 'codeBackground', label: 'Fondo del código' },
]

function update<K extends keyof AdvancedPrintStyle>(key: K, value: AdvancedPrintStyle[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.drawer-heading,
.master-toggle,
.color-control,
.drawer-footer { display: flex; align-items: center; }
.drawer-heading { gap: 10px; }
.drawer-heading > div:last-child { display: grid; gap: 2px; }
.drawer-heading small,
.master-toggle small { color: var(--text-secondary); font-size: 11px; font-weight: 400; }
.drawer-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: color-mix(in srgb, var(--accent-color) 13%, transparent); color: var(--accent-color); }
.advanced-content { display: grid; gap: 18px; }
.master-toggle { justify-content: space-between; gap: 16px; padding: 14px; border: 1px solid var(--border-color); border-radius: 12px; background: color-mix(in srgb, var(--bg-secondary) 75%, transparent); }
.master-toggle > span { display: grid; gap: 3px; }
.settings-body { display: grid; gap: 22px; transition: opacity .18s ease; }
.settings-body.disabled { opacity: .45; pointer-events: none; }
section { display: grid; gap: 12px; }
h3 { margin: 0; color: var(--text-secondary); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.color-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.color-field { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 12px; }
.color-control { gap: 8px; }
.color-control input { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px; background: none; cursor: pointer; }
.color-control code { color: var(--text-secondary); font-size: 10px; }
.drawer-footer { justify-content: space-between; width: 100%; }
</style>

<style>
.advanced-style-drawer { width: min(430px, 94vw) !important; }
</style>
