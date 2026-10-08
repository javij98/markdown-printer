import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import PrimeVue from 'primevue/config'
import App from './App.vue'
const flushMock = vi.hoisted(() => vi.fn())
const downloadMock = vi.hoisted(() => vi.fn())

vi.mock('./composables/useImages', () => ({ useImages: () => ({ loadImages: vi.fn(), images: ref([]) }) }))
vi.mock('./composables/usePDF', () => ({ usePDF: () => ({ download: downloadMock, isGenerating: ref(false) }) }))
vi.mock('./composables/useScrollSync', () => ({ useScrollSync: () => ({ onPreviewClick: vi.fn() }) }))
vi.mock('./components/TabBar.vue', () => ({ default: defineComponent({
  props: ['tabs'], emits: ['select-tab', 'add-tab'],
  template: '<div><button v-for="tab in tabs" :key="tab.id" @click="$emit(\'select-tab\', tab.id)">{{tab.name}}</button><button aria-label="Nueva pestaña de prueba" @click="$emit(\'add-tab\')">Nueva</button></div>',
}) }))
vi.mock('./components/VisualEditorPane.vue', () => ({ default: defineComponent({
  props: ['modelValue'], emits: ['update:modelValue'],
  template: '<textarea aria-label="Texto de prueba" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  setup(_props, { expose }) { expose({ flushContent: flushMock }) },
}) }))
vi.mock('./utils/storage', async importOriginal => ({
  ...await importOriginal<typeof import('./utils/storage')>(),
  loadSettings: () => ({
    printPreset: 'academic', fontSize: 12, font: 'Roboto', pageSize: 'Letter',
    orientation: 'landscape', margin: { top: '2in', right: '2in', bottom: '2in', left: '2in' },
    advancedPrintStyle: { enabled: true },
  }),
  loadTabs: () => [], loadActiveTabId: () => null,
  saveTabs: vi.fn(), saveActiveTabId: vi.fn(), saveSettings: vi.fn(),
  loadLlmConfig: async () => null, isLlmEnabled: () => false,
  getAllStoredFonts: async () => [],
}))

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks(); flushMock.mockReset(); downloadMock.mockReset(); document.body.innerHTML = '' })
async function app() {
  window.history.replaceState({}, '', '/print/document/doc-1')
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ document: { id: 'doc-1', title: 'Original', text: 'Texto de Outline' } })))
  vi.stubGlobal('fetch', fetcher)
  const wrapper = mount(App, { attachTo: document.body, global: {
    plugins: [PrimeVue], stubs: ['EditorPane', 'PreviewPane', 'FooterBar', 'AiSettings', 'PrivacyPolicy', 'NewPage'],
  } })
  wrappers.push(wrapper)
  await vi.waitFor(() => expect((wrapper.find('textarea').element as HTMLTextAreaElement | undefined)?.value).toContain('Texto de Outline'))
  return { wrapper, fetcher }
}

it('asks before reset and cancel leaves the working copy and design untouched', async () => {
  const { wrapper, fetcher } = await app()
  await wrapper.get('textarea').setValue('Mis cambios')
  await wrapper.get('button[aria-label="Reiniciar documento de Outline"]').trigger('click')
  expect(document.body.textContent).toContain('Los cambios realizados en Print Studio se perderán')
  const cancel = [...document.body.querySelectorAll('button')].find(b => b.textContent === 'Cancelar')!
  await vi.waitFor(() => expect(document.activeElement).toBe(cancel))
  cancel.click()
  expect(wrapper.get('textarea').element.value).toBe('Mis cambios')
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('reloads the latest source and default design, recreating the editor after success', async () => {
  const { wrapper, fetcher } = await app()
  await wrapper.get('textarea').setValue('Mis cambios')
  const editor = wrapper.get('textarea').element
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ document: { id: 'doc-1', title: 'Actualizado', text: 'Última versión' } })))
  await wrapper.get('button[aria-label="Reiniciar documento de Outline"]').trigger('click')
  ;[...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Reiniciar documento') && b.closest('[role=dialog]'))!.click()
  await vi.waitFor(() => expect(wrapper.get('textarea').element.value).toContain('Última versión'))
  expect(wrapper.get('textarea').element).not.toBe(editor)
  expect(wrapper.findComponent({ name: 'Toolbar' }).props('fontSize')).toBe(10.5)
  expect(wrapper.findComponent({ name: 'Toolbar' }).props('printPreset')).toBe('outline')
  expect(wrapper.findComponent({ name: 'Toolbar' }).props()).toMatchObject({
    pageSize: 'A4', orientation: 'portrait', font: 'Open Sans', contentScale: 1,
    margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
    advancedStyle: { enabled: false },
  })
  expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({ cache: 'no-store' })
})

it('keeps changes and settings if reloading fails', async () => {
  const { wrapper, fetcher } = await app()
  await wrapper.get('textarea').setValue('Mis cambios')
  const editor = wrapper.get('textarea').element
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Sin conexión' }), { status: 503 }))
  await wrapper.get('button[aria-label="Reiniciar documento de Outline"]').trigger('click')
  ;[...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Reiniciar documento') && b.closest('[role=dialog]'))!.click()
  await vi.waitFor(() => expect(document.body.textContent).toContain('Sin conexión'))
  expect(wrapper.get('textarea').element).toBe(editor)
  expect(wrapper.get('textarea').element.value).toBe('Mis cambios')
  expect(wrapper.findComponent({ name: 'Toolbar' }).props('printPreset')).toBe('academic')
  expect(wrapper.findComponent({ name: 'Toolbar' }).props()).toMatchObject({
    pageSize: 'Letter', orientation: 'landscape', font: 'Roboto', advancedStyle: { enabled: true },
  })
})

it('shows reset only in the source tab and preserves other tabs', async () => {
  const { wrapper } = await app()
  await wrapper.get('button[aria-label="Nueva pestaña de prueba"]').trigger('click')
  expect(wrapper.find('button[aria-label="Reiniciar documento de Outline"]').exists()).toBe(false)
  wrapper.findComponent({ name: 'NewPage' }).vm.$emit('create-new')
  await wrapper.vm.$nextTick()
  await wrapper.get('textarea').setValue('Cambios de la otra pestaña')
  const source = [...wrapper.element.querySelectorAll('button')].find(button => button.textContent === 'Original')!
  source.click()
  await vi.waitFor(() => expect(wrapper.find('button[aria-label="Reiniciar documento de Outline"]').exists()).toBe(true))
  await wrapper.get('button[aria-label="Reiniciar documento de Outline"]').trigger('click')
  ;[...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Reiniciar documento') && b.closest('[role=dialog]'))!.click()
  await vi.waitFor(() => expect(wrapper.findComponent({ name: 'Toolbar' }).props('printPreset')).toBe('outline'))
  expect(wrapper.findComponent({ name: 'TabBar' }).props('tabs')).toHaveLength(2)
  expect(wrapper.findComponent({ name: 'TabBar' }).props('tabs').find((tab: { name: string }) => tab.name === 'Untitled').content).toBe('Cambios de la otra pestaña')
})

it('flushes pending visual edits before switching to Markdown', async () => {
  const { wrapper } = await app()
  flushMock.mockReturnValueOnce('Contenido todavía no notificado')
  await wrapper.get('button[aria-label="Markdown"]').trigger('click')
  expect(flushMock).toHaveBeenCalled()
  expect(wrapper.findComponent({ name: 'EditorPane' }).props('modelValue')).toBe('Contenido todavía no notificado')
})

it('keeps pending visual edits in their source tab when adding another tab', async () => {
  const { wrapper } = await app()
  flushMock.mockReturnValueOnce('Último texto de la primera pestaña')
  await wrapper.get('button[aria-label="Nueva pestaña de prueba"]').trigger('click')
  const tabs = wrapper.findComponent({ name: 'TabBar' }).props('tabs')
  expect(tabs.find((tab: { name: string }) => tab.name === 'Original').content).toBe('Último texto de la primera pestaña')
  expect(tabs.at(-1).content).toBe('')
})

it('prints the latest visual content even before the preview updates', async () => {
  const { wrapper } = await app()
  flushMock.mockReturnValueOnce('![Último pie](./imagen.png "=180x120")')
  wrapper.findComponent({ name: 'Toolbar' }).vm.$emit('download-pdf')
  await vi.waitFor(() => expect(downloadMock).toHaveBeenCalled())
  expect(downloadMock.mock.calls[0]?.[0]).toContain('width="180"')
  expect(downloadMock.mock.calls[0]?.[0]).toContain('Último pie')
})
