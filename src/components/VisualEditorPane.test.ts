import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import VisualEditorPane from './VisualEditorPane.vue'

vi.mock('../composables/useImages', () => ({
  useImages: () => ({ images: { value: [] }, uploadImage: vi.fn(), getImageUrl: vi.fn() }),
}))

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

async function editor(markdown: string) {
  const wrapper = mount(VisualEditorPane, {
    attachTo: document.body,
    props: { modelValue: markdown, tabId: 'test', font: 'Open Sans', fontSize: 11 },
  })
  wrappers.push(wrapper)
  await vi.waitFor(() => expect(wrapper.find('.ProseMirror').exists()).toBe(true))
  return wrapper
}

it('uses typographic points for the font size shown in the toolbar', async () => {
  const wrapper = await editor('Texto de prueba')
  expect((wrapper.element as HTMLElement).style.getPropertyValue('--visual-editor-size')).toBe('11pt')
})

it('edits the text beside an Outline image while preserving its caption and dimensions', async () => {
  const markdown = '![Pie privado](/api/attachments.redirect?id=123 "left-50 =360x480")\n\nPrimer **párrafo**.\n\nSegundo párrafo.\n\n## Fin'
  const wrapper = await editor(markdown)
  expect(wrapper.find('.outline-columns').exists()).toBe(true)
  expect(wrapper.find('.outline-columns img').attributes('src')).toContain('/api/attachments.redirect')
  expect(wrapper.find('.outline-columns-text strong').text()).toBe('párrafo')
  expect(wrapper.findAll('.outline-columns-text p')).toHaveLength(2)
  expect(wrapper.find('.outline-columns-text h2').exists()).toBe(false)
  const paragraph = wrapper.find('.outline-columns-text p').element
  paragraph.append(document.createTextNode(' Añadido.'))
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('Añadido.'))
  const updated = wrapper.emitted('update:modelValue')!.at(-1)![0] as string
  expect(updated).toContain('![Pie privado](/api/attachments.redirect?id=123 "left-50 =360x480")')
  expect(updated).toContain('**párrafo**')
  expect(updated).toContain('## Fin')
  await nextTick()
})

it('changes image placement and caption without losing Outline dimensions, including undo', async () => {
  const wrapper = await editor('![Original](./foto.png "right-50 =360x480")\n\nTexto contiguo.')
  await wrapper.find('.outline-columns select').setValue('left-50')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('left-50 =360x480'))
  await wrapper.find('.outline-columns input').setValue('Nuevo pie')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![Nuevo pie]'))
  await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')!.at(-1)![0] as string })
  expect(wrapper.find('.outline-columns-text').text()).toContain('Texto contiguo.')
  expect(wrapper.find('.outline-columns img').attributes('width')).toBe('360')
  ;(wrapper.vm as unknown as { undo(): void }).undo()
  await vi.waitFor(() => expect(wrapper.find('input').element.value).toBe('Original'))
})

it('opens the leading-space image syntax exported by Outline as editable columns', async () => {
  const wrapper = await editor(' ![Pie](./foto.png "left-50 =360x480")\n\nTexto.')
  expect(wrapper.find('.outline-columns').exists()).toBe(true)
})

it('preserves a normal image caption when editing text in an adjacent composition', async () => {
  const wrapper = await editor('![Columna](./columna.png "left-50 =360x480")\n\nTexto.\n\n## Imagen normal\n\n![Pie normal](./foto.png)')
  await wrapper.find('.outline-columns input').setValue('Pie nuevo')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![Pie normal](./foto.png)'))
})
