import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import VisualEditorPane from './VisualEditorPane.vue'
import { useImages } from '../composables/useImages'

const imageMocks = vi.hoisted(() => ({ images: { value: [] }, uploadImage: vi.fn(), getImageUrl: vi.fn() }))
vi.mock('../composables/useImages', () => ({ useImages: () => imageMocks }))

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
  await wrapper.get('button[aria-label="Imagen a la izquierda"]').trigger('click')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('left-50 =360x480'))
  await wrapper.get('input[aria-label="Pie de imagen"]').setValue('Nuevo pie')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![Nuevo pie]'))
  await wrapper.setProps({ modelValue: wrapper.emitted('update:modelValue')!.at(-1)![0] as string })
  expect(wrapper.find('.outline-columns-text').text()).toContain('Texto contiguo.')
  expect(wrapper.find('.outline-columns img').attributes('width')).toBe('360')
  ;(wrapper.vm as unknown as { undo(): void }).undo()
  await vi.waitFor(() => expect((wrapper.get('input[aria-label="Pie de imagen"]').element as HTMLInputElement).value).toBe('Original'))
})

it('opens the leading-space image syntax exported by Outline as editable columns', async () => {
  const wrapper = await editor(' ![Pie](./foto.png "left-50 =360x480")\n\nTexto.')
  expect(wrapper.find('.outline-columns').exists()).toBe(true)
})

it('preserves a normal image caption when editing text in an adjacent composition', async () => {
  const wrapper = await editor('![Columna](./columna.png "left-50 =360x480")\n\nTexto.\n\n## Imagen normal\n\n![Pie normal](./foto.png)')
  await wrapper.get('input[aria-label="Pie de imagen"]').setValue('Pie nuevo')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![Pie normal](./foto.png)'))
})

it('inserts an empty image and text block with the cursor in its text column', async () => {
  const wrapper = await editor('')
  ;(wrapper.vm as unknown as { insertImageColumns(): void }).insertImageColumns()
  await vi.waitFor(() => expect(wrapper.find('.outline-columns').exists()).toBe(true))
  expect(wrapper.find('.outline-columns input[type=file]').exists()).toBe(true)
  expect(document.activeElement).toBe(wrapper.find('.ProseMirror').element)
  expect(wrapper.find('.outline-columns-text').element.contains(window.getSelection()?.anchorNode ?? null)).toBe(true)
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![](<> "left-50")'))
  const md = wrapper.emitted('update:modelValue')!.at(-1)![0] as string
  expect(md).toContain('![](<> "left-50")')
  await wrapper.setProps({ modelValue: md + '\n\nTexto pendiente.' })
  await vi.waitFor(() => expect(wrapper.find('.outline-columns-text').text()).toContain('Texto pendiente.'))
})

it('can flush a newly inserted block before the debounced listener runs', async () => {
  const wrapper = await editor('')
  const vm = wrapper.vm as unknown as { insertImageColumns(): void; flushContent(): string }
  vm.insertImageColumns()
  expect(vm.flushContent()).toContain('![](<> "left-50")')
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('![](<> "left-50")')
})

it('accepts a URL in a pending image block without losing adjacent text', async () => {
  const wrapper = await editor('![](<> "left-50")\n\nTexto pendiente.')
  await wrapper.get('input[aria-label="URL de la imagen"]').setValue('https://example.com/foto.png')
  await wrapper.get('button[aria-label="Añadir imagen por URL"]').trigger('click')
  await vi.waitFor(() => expect(wrapper.get('.outline-columns img').attributes('src')).toBe('https://example.com/foto.png'))
  expect(wrapper.get('.outline-columns-text').text()).toContain('Texto pendiente.')
})

it.each(['columns', 'normal'])('persists dimensions when resizing a %s image and can undo it', async type => {
  const wrapper = await editor(`![Pie](./foto.png "${type === 'columns' ? 'left-50 ' : ''}=360x480")\n\nTexto.`)
  const field = wrapper.get('input[aria-label="Ancho de la imagen"]')
  await field.setValue('180')
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('=180x240'))
  expect(wrapper.get('img').attributes('width')).toBe('180')
  ;(wrapper.vm as unknown as { undo(): void }).undo()
  await vi.waitFor(() => expect(wrapper.get('img').attributes('width')).toBe('360'))
})

it.each(['columns', 'normal'])('clamps the keyboard width of a %s image and shows the committed size', async type => {
  const wrapper = await editor(`![Pie](./foto.png "Título ${type === 'columns' ? 'left-50 ' : ''}=360x480")\n\nTexto.`)
  const figure = wrapper.get('.studio-image-controls').element as HTMLElement
  const geometry = vi.spyOn(figure, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 250, 400))
  const field = wrapper.get('input[aria-label="Ancho de la imagen"]')
  ;(field.element as HTMLInputElement).focus()
  await field.setValue('1000')
  expect(wrapper.get('img').attributes('width')).toBe('250')
  expect((field.element as HTMLInputElement).value).toBe('250')
  await field.setValue('10')
  const markdown = (wrapper.vm as unknown as { flushContent(): string }).flushContent()
  expect(markdown).toContain(`Título ${type === 'columns' ? 'left-50 ' : ''}=64x85`)
  expect(markdown).toContain('![Pie](./foto.png')
  geometry.mockRestore()
})

it('uses buttons for placement and a visible caret in captions', async () => {
  const wrapper = await editor('![Pie](./foto.png "left-50 =360x480")\n\nTexto.')
  await wrapper.get('button[aria-label="Imagen a la derecha"]').trigger('click')
  expect(wrapper.find('select').exists()).toBe(false)
  expect(wrapper.get('button[aria-label="Imagen a la derecha"]').attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('input[aria-label="Pie de imagen"]').attributes('class')).toContain('image-caption-input')
})

it('keeps the pending image editable after an upload fails', async () => {
  const wrapper = await editor('![](<> "left-50")\n\nTexto pendiente.')
  vi.mocked(useImages().uploadImage).mockRejectedValueOnce(new Error('fallo'))
  const fileInput = wrapper.get('input[type=file]')
  Object.defineProperty(fileInput.element, 'files', { value: [new File(['PNG'], 'foto.png', { type: 'image/png' })] })
  await fileInput.trigger('change')
  await vi.waitFor(() => expect(wrapper.get('[role=alert]').text()).toContain('No se ha podido'))
  expect(wrapper.get('.outline-columns-text').text()).toContain('Texto pendiente.')
  expect(wrapper.find('input[type=file]').exists()).toBe(true)
})

it('uploads a local image and returns focus to the text column', async () => {
  const wrapper = await editor('![](<> "left-50")\n\nTexto pendiente.')
  vi.mocked(useImages().uploadImage).mockResolvedValueOnce({ id: 'test', name: 'foto.png', mimeType: 'image/png', blob: new Blob(), createdAt: 0 })
  const field = wrapper.get('input[type=file]')
  Object.defineProperty(field.element, 'files', { value: [new File(['PNG'], 'foto.png', { type: 'image/png' })] })
  await field.trigger('change')
  await vi.waitFor(() => expect(wrapper.get('img').attributes('src')).toBe('./foto.png'))
  expect(document.activeElement).toBe(wrapper.get('.ProseMirror').element)
  expect(wrapper.get('.outline-columns-text').text()).toContain('Texto pendiente.')
  await field.trigger('cancel')
  expect(document.activeElement).toBe(wrapper.get('.ProseMirror').element)
})

it.each(['columns', 'normal'])('commits a pointer drag of a %s image as a single undo operation', async type => {
  const wrapper = await editor(`![Pie](./foto.png "${type === 'columns' ? 'left-50 ' : ''}=360x480")\n\nTexto.`)
  const handle = wrapper.get('.studio-image-resize-right')
  await handle.trigger('pointerdown', { clientX: 360 })
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300 }))
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: 180 }))
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: 180 }))
  await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain('=180x240'))
  ;(wrapper.vm as unknown as { undo(): void }).undo()
  expect(wrapper.get('img').attributes('width')).toBe('360')
})

it('preserves caption focus and selection during control updates and IME composition', async () => {
  const wrapper = await editor('![Pie de prueba](./foto.png "left-50 =360x480")\n\nTexto.')
  const caption = wrapper.get('input[aria-label="Pie de imagen"]')
  const input = caption.element as HTMLInputElement
  input.focus()
  input.setSelectionRange(2, 6)
  await wrapper.get('button[aria-label="Imagen a la derecha"]').trigger('click')
  expect(document.activeElement).toBe(input)
  expect(input.selectionStart).toBe(2)
  expect(input.selectionEnd).toBe(6)
  await caption.trigger('keydown', { key: 'Enter', isComposing: true })
  expect(document.activeElement).toBe(input)
})
