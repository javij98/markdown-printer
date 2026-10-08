import { expect, it, vi } from 'vitest'
import { useImages } from './useImages'

vi.mock('../utils/storage', () => ({ saveImage: vi.fn(), getAllImages: vi.fn(async () => []), deleteImage: vi.fn(), getImage: vi.fn() }))

it('keeps filenames unique so uploading a duplicate cannot replace a previous image URL', async () => {
  const { uploadImage, loadImages } = useImages()
  await loadImages()
  const first = await uploadImage(new File(['a'], 'foto.png', { type: 'image/png' }))
  const second = await uploadImage(new File(['b'], 'foto.png', { type: 'image/png' }))
  expect(first?.name).toBe('foto.png')
  expect(second?.name).not.toBe(first?.name)
  expect(second?.name).toMatch(/\.png$/)
})

it('also reserves unique filenames for simultaneous uploads', async () => {
  const { uploadImage, loadImages } = useImages()
  await loadImages()
  const uploaded = await Promise.all([1, 2].map(() => uploadImage(new File(['PNG'], 'same.png'))))
  expect(new Set(uploaded.map(image => image?.name)).size).toBe(2)
})
