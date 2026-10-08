import { effectScope, ref } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { usePagination } from './usePagination'
import { DEFAULT_ADVANCED_PRINT_STYLE } from '../utils/constants'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

it.each(['left', 'right'])('moves a %s floated image to the next page when its paragraph box is too short', async (side) => {
  vi.useFakeTimers()
  // Browser floats extend below their paragraph's line box. Happy DOM has no
  // layout engine, so supply the geometry observed in the Chromium fixture.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('intro')) return new DOMRect(0, 0, 600, 180)
    if (this.classList.contains('outline-image')) return new DOMRect(0, 188, 300, 220)
    return new DOMRect(0, 180, 600, 20)
  })
  const scope = effectScope()
  const result = scope.run(() => usePagination(
    ref(`<p class="intro">Contenido anterior</p><p><span class="outline-image outline-image-${side}-50" style="float:${side};margin-bottom:16px">Imagen y pie</span></p>`),
    ref(300), ref(1), ref('A4'),
    ref({ top: '0px', right: '0px', bottom: '0px', left: '0px' }),
    ref('Open Sans'), ref(14), ref('outline'), ref({ ...DEFAULT_ADVANCED_PRINT_STYLE }),
  ))!
  await vi.advanceTimersByTimeAsync(150)

  expect(result.totalPages.value).toBe(2)
  expect(result.pages.value[0].elements.join('')).toContain('Contenido anterior')
  expect(result.pages.value[0].elements.join('')).not.toContain('outline-image')
  expect(result.pages.value[1].elements.join('')).toContain('Imagen y pie')
  scope.stop()
})

it('splits a composition with many paragraphs across pages without repeating its image', async () => {
  vi.useFakeTimers()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const group = this.classList.contains('outline-image-group') ? this : this.querySelector('.outline-image-group')
    const height = group ? group.querySelectorAll('p').length * 80 : 80
    return new DOMRect(0, 0, 600, height)
  })
  const scope = effectScope()
  const result = scope.run(() => usePagination(
    ref('<div class="outline-image-group"><p><span class="outline-image">Imagen</span></p>' + [1, 2, 3, 4, 5].map(i => `<p>Párrafo ${i}</p>`).join('') + '</div>'),
    ref(300), ref(1), ref('A4'),
    ref({ top: '0px', right: '0px', bottom: '0px', left: '0px' }),
    ref('Open Sans'), ref(11), ref('outline'), ref({ ...DEFAULT_ADVANCED_PRINT_STYLE }),
  ))!
  await vi.advanceTimersByTimeAsync(150)
  expect(result.totalPages.value).toBe(2)
  const all = result.pages.value.map(page => page.elements.join('')).join('')
  expect(all.match(/class="outline-image"/g)).toHaveLength(1)
  for (let i = 1; i <= 5; i++) expect(all).toContain(`Párrafo ${i}`)
  scope.stop()
})
