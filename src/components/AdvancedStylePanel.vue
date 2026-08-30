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
          <small>Parte del estilo {{ presetName }} y sustituye solo los valores que edites.</small>
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
          <NumberSetting
            label="Escala de los títulos"
            suffix=" ×"
            :model-value="modelValue.headingScale"
            :min="0.75"
            :max="1.4"
            :step="0.05"
            @update:model-value="update('headingScale', $event)"
          />
          <NumberSetting
            label="Espacio antes de títulos"
            suffix=" ×"
            :model-value="modelValue.headingSpacing"
            :min="0.5"
            :max="1.8"
            :step="0.05"
            @update:model-value="update('headingSpacing', $event)"
          />
          <NumberSetting
            label="Escala del código"
            suffix=" ×"
            :model-value="modelValue.codeFontScale"
            :min="0.75"
            :max="1.3"
            :step="0.05"
            @update:model-value="update('codeFontScale', $event)"
          />
          <NumberSetting
            label="Interlineado del código"
            :model-value="modelValue.codeLineHeight"
            :min="1.1"
            :max="2"
            :step="0.05"
            @update:model-value="update('codeLineHeight', $event)"
          />
          <NumberSetting
            label="Separación en listas"
            suffix=" em"
            :model-value="modelValue.listSpacing"
            :min="0"
            :max="1.5"
            :step="0.05"
            @update:model-value="update('listSpacing', $event)"
          />
          <NumberSetting
            label="Relleno vertical de tablas"
            suffix=" em"
            :model-value="modelValue.tableCellPadding"
            :min="0.15"
            :max="1.2"
            :step="0.05"
            @update:model-value="update('tableCellPadding', $event)"
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
            label="Fondo en cabeceras de tabla"
            description="Diferencia la primera fila con el color propio de la plantilla."
            :model-value="modelValue.tableHeaderShade"
            @update:model-value="update('tableHeaderShade', $event)"
          />
          <SwitchSetting
            label="Filas alternas en tablas"
            description="Añade un sombreado suave para facilitar la lectura de tablas largas."
            :model-value="modelValue.zebraTables"
            @update:model-value="update('zebraTables', $event)"
          />
          <SwitchSetting
            label="Subrayar enlaces"
            description="Mantiene los enlaces reconocibles también en documentos impresos."
            :model-value="modelValue.underlineLinks"
            @update:model-value="update('underlineLinks', $event)"
          />
          <SwitchSetting
            label="Divisores en los títulos"
            description="Separa los títulos principales con una línea discreta."
            :model-value="modelValue.headingDividers"
            @update:model-value="update('headingDividers', $event)"
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
        <Button :label="`Valores de ${presetName}`" severity="secondary" text @click="$emit('reset')">
          <RotateCcw :size="15" />
        </Button>
        <Button label="Listo" @click="$emit('update:visible', false)" />
      </div>
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { RotateCcw, SlidersHorizontal } from '@lucide/vue'
import { PRINT_PRESETS } from '../utils/constants'
import type { AdvancedPrintStyle, PrintPreset } from '../utils/types'
import NumberSetting from './advanced/NumberSetting.vue'
import SwitchSetting from './advanced/SwitchSetting.vue'

const props = defineProps<{
  visible: boolean
  modelValue: AdvancedPrintStyle
  printPreset: PrintPreset
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

const presetName = computed(() => PRINT_PRESETS.find(preset => preset.id === props.printPreset)?.name ?? 'la plantilla')

function update<K extends keyof AdvancedPrintStyle>(key: K, value: AdvancedPrintStyle[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.drawer-heading,
.master-toggle,
.color-control,
.drawer-footer {
  display: flex;
  align-items: center;
}

.drawer-heading {
  gap: 11px;
}

.drawer-heading > div:last-child {
  display: grid;
  gap: 2px;
}

.drawer-heading strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -.015em;
}

.drawer-heading small,
.master-toggle small {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 400;
  line-height: 1.4;
}

.drawer-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--accent-color);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-color) 13%, transparent);
}

.advanced-content {
  display: grid;
  gap: 16px;
}

.master-toggle {
  position: sticky;
  z-index: 2;
  top: 0;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 20%, var(--border-color));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--accent-soft) 62%, var(--bg-primary));
  box-shadow: var(--shadow-sm);
}

.master-toggle > span {
  display: grid;
  gap: 3px;
}

.master-toggle strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 720;
}

.settings-body {
  display: grid;
  gap: 14px;
  transition: opacity .18s ease, filter .18s ease;
}

.settings-body.disabled {
  opacity: .42;
  filter: grayscale(.2);
  pointer-events: none;
}

section {
  display: grid;
  gap: 11px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-subtle);
  box-shadow: var(--shadow-xs);
}

h3 {
  margin: 0 0 2px;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 780;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.color-field {
  display: grid;
  gap: 7px;
  padding: 9px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  font-size: 10px;
}

.color-control {
  gap: 8px;
}

.color-control input {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: none;
  cursor: pointer;
}

.color-control code {
  overflow: hidden;
  color: var(--text-secondary);
  font-family: "Source Code Pro", monospace;
  font-size: 9px;
  text-overflow: ellipsis;
}

.drawer-footer {
  width: 100%;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 420px) {
  .color-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.advanced-style-drawer { width: min(430px, 94vw) !important; }
</style>
