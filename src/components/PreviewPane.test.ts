import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import PreviewPane from './PreviewPane.vue'
import { DEFAULT_ADVANCED_PRINT_STYLE } from '../utils/constants'
import { ref } from 'vue'

vi.mock('../composables/useImages', () => ({ useImages: () => ({ images: ref([]), getImageUrl: vi.fn() }) }))

it('uses the selected point size in the preview and pagination measurement', async () => {
  const wrapper = mount(PreviewPane, { attachTo: document.body, props: {
    html: '<p>Texto de prueba</p>', pageSize: 'A4', scale: 1, font: 'Open Sans', fontSize: 11,
    rtl: false, margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
    orientation: 'portrait', contentScale: 1, containerWidth: 1000, printPreset: 'outline',
    advancedStyle: { ...DEFAULT_ADVANCED_PRINT_STYLE },
  } })
  try {
    await vi.waitFor(() => expect(wrapper.find('.preview-page').exists()).toBe(true))
    expect((wrapper.find('.preview-page').element as HTMLElement).style.fontSize).toBe('11pt')
    await vi.waitFor(() => {
      const measure = [...document.body.querySelectorAll<HTMLElement>('div')].find(el => el.style.position === 'absolute' && el.style.fontSize)
      expect(measure?.style.fontSize).toBe('11pt')
    })
  } finally { wrapper.unmount(); document.body.innerHTML = '' }
})
