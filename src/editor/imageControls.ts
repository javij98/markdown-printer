import { parseOutlineImageTitle } from '../markdown/outlineImages'

export interface ImageControlOptions {
  resolveImageUrl: (url: string) => string
  uploadImage: (file: File) => Promise<string>
  attributes: () => { src: string; caption: string; outlineTitle: string | null }
  update: (attribute: string, value: string, separateHistory?: boolean) => void
  focusText: () => void
  editable: () => boolean
  columns: boolean
}

export function createImageControls(options: ImageControlOptions) {
  const figure = document.createElement('figure')
  figure.className = 'studio-image-controls'
  figure.contentEditable = 'false'
  const canvas = document.createElement('div')
  canvas.className = 'studio-image-canvas'
  const image = document.createElement('img')
  image.draggable = false
  const uploader = document.createElement('div')
  uploader.className = 'studio-image-uploader'
  const file = document.createElement('input')
  file.type = 'file'
  file.accept = 'image/*'
  file.hidden = true
  file.setAttribute('aria-label', 'Archivo de imagen')
  const button = (label: string, text: string, action: () => void) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.setAttribute('aria-label', label)
    element.title = label
    element.textContent = text
    element.addEventListener('click', action)
    return element
  }
  const upload = button('Subir imagen', '↑ Subir imagen', () => file.click())
  const url = document.createElement('input')
  url.type = 'url'
  url.placeholder = 'Pega una URL de imagen'
  url.setAttribute('aria-label', 'URL de la imagen')
  const addUrl = () => {
    const value = url.value.trim()
    if (!value) return
    if (!/^(https?:\/\/|\/|\.\/)/i.test(value)) {
      showError('Introduce una URL de imagen http o https.')
      return
    }
    error.hidden = true
    options.update('src', value)
    options.focusText()
  }
  const confirm = button('Añadir imagen por URL', 'Añadir', addUrl)
  url.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addUrl() } })
  const error = document.createElement('div')
  error.className = 'studio-image-error'
  error.setAttribute('role', 'alert')
  error.hidden = true
  const showError = (message: string) => { error.textContent = message; error.hidden = false }
  uploader.append(upload, file, url, confirm)

  const caption = document.createElement('input')
  caption.type = 'text'
  caption.className = 'image-caption-input'
  caption.placeholder = 'Añadir un pie de imagen…'
  caption.setAttribute('aria-label', 'Pie de imagen')
  caption.addEventListener('change', () => options.update('caption', caption.value))
  caption.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); caption.blur(); options.focusText() }
  })
  const toolbar = document.createElement('div')
  toolbar.className = 'studio-image-toolbar'
  const placementButtons: HTMLButtonElement[] = []
  if (options.columns) {
    for (const [layout, label] of [['left-50', 'Imagen a la izquierda'], ['right-50', 'Imagen a la derecha']]) {
      const placement = button(label, '', () => options.update('outlineTitle',
        (options.attributes().outlineTitle ?? 'left-50').replace(/(?:left|right)-50/, layout)))
      const side = layout === 'left-50' ? 3 : 13
      const lines = layout === 'left-50' ? 'M15 6h6M15 12h6M15 18h6' : 'M3 6h6M3 12h6M3 18h6'
      placement.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="${side}" y="3" width="8" height="18" rx="2"/><path d="${lines}"/></svg>`
      placement.dataset.layout = layout
      placementButtons.push(placement)
      toolbar.append(placement)
    }
  }
  const widthLabel = document.createElement('label')
  widthLabel.className = 'studio-image-width'
  const width = document.createElement('input')
  width.type = 'number'
  width.min = '64'
  width.step = '1'
  width.setAttribute('aria-label', 'Ancho de la imagen')
  widthLabel.append(width, document.createTextNode('px'))
  toolbar.append(widthLabel)
  figure.append(canvas, uploader, error, caption, toolbar)
  canvas.append(image)

  let alive = true
  let uploadSequence = 0
  let rawSource: string | null = null
  let resolvedSource = ''
  let dragging = false
  let removeDragListeners = () => {}
  const aspectRatio = () => {
    const attributes = parseOutlineImageTitle(options.attributes().outlineTitle)
    return attributes.width && attributes.height ? attributes.height / attributes.width
      : image.naturalWidth ? image.naturalHeight / image.naturalWidth : 1
  }
  const maxWidth = () => figure.getBoundingClientRect().width || Number.POSITIVE_INFINITY
  const clamp = (value: number) => Math.round(Math.min(maxWidth(), Math.max(64, value)))
  const commitWidth = (value: number) => {
    if (!Number.isFinite(value) || !options.attributes().src) return
    const nextWidth = clamp(value)
    width.value = String(nextWidth)
    const height = Math.max(1, Math.round(nextWidth * aspectRatio()))
    const title = (options.attributes().outlineTitle ?? '').replace(/\s*=[0-9]*x[0-9]*\s*$/, '').trim()
    options.update('outlineTitle', `${title ? title + ' ' : ''}=${nextWidth}x${height}`, true)
  }
  width.addEventListener('change', () => commitWidth(width.valueAsNumber))
  image.addEventListener('load', () => {
    if (document.activeElement !== width) width.value = String(Math.round(image.getBoundingClientRect().width || image.width || image.naturalWidth))
  })

  for (const side of ['left', 'right']) {
    const handle = button('Redimensionar imagen', '', () => {})
    handle.className = `studio-image-resize studio-image-resize-${side}`
    handle.addEventListener('pointerdown', event => {
      if (!options.editable() || !options.attributes().src) return
      event.preventDefault()
      event.stopPropagation()
      removeDragListeners()
      const initialWidth = image.getBoundingClientRect().width || image.width
      const initialX = event.clientX
      let nextWidth = initialWidth
      dragging = true
      figure.classList.add('resizing')
      const move = (pointer: PointerEvent) => {
        nextWidth = clamp(initialWidth + (pointer.clientX - initialX) * (side === 'left' ? -1 : 1))
        image.style.width = `${nextWidth}px`
        width.value = String(nextWidth)
      }
      const finish = (commit: boolean) => {
        removeDragListeners()
        dragging = false
        figure.classList.remove('resizing')
        image.style.removeProperty('width')
        if (commit && alive) commitWidth(nextWidth)
        else if (alive) sync()
      }
      const up = () => finish(true)
      const cancel = () => finish(false)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
      removeDragListeners = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', cancel)
      }
    })
    canvas.append(handle)
  }

  file.addEventListener('cancel', () => options.focusText())
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]
    if (!selected) { options.focusText(); return }
    const sequence = ++uploadSequence
    upload.disabled = true
    upload.textContent = 'Subiendo…'
    error.hidden = true
    options.focusText()
    try {
      const source = await options.uploadImage(selected)
      if (!source) throw new Error('No se ha guardado la imagen')
      if (alive && sequence === uploadSequence) options.update('src', source)
    } catch {
      if (alive && sequence === uploadSequence) showError('No se ha podido subir la imagen. Puedes volver a intentarlo.')
    } finally {
      if (alive && sequence === uploadSequence) {
        upload.disabled = !options.editable()
        upload.textContent = '↑ Subir imagen'
        file.value = ''
      }
    }
  })

  function sync() {
    const attributes = options.attributes()
    const metadata = parseOutlineImageTitle(attributes.outlineTitle)
    const hasImage = !!attributes.src
    canvas.hidden = caption.hidden = toolbar.hidden = !hasImage
    uploader.hidden = hasImage
    if (rawSource !== attributes.src) {
      if (resolvedSource.startsWith('blob:')) URL.revokeObjectURL(resolvedSource)
      rawSource = attributes.src
      resolvedSource = hasImage ? options.resolveImageUrl(attributes.src) : ''
      if (resolvedSource) image.src = resolvedSource
      else image.removeAttribute('src')
    }
    image.alt = attributes.caption
    image.title = metadata.title ?? ''
    for (const dimension of ['width', 'height'] as const) {
      if (metadata[dimension]) image.setAttribute(dimension, String(metadata[dimension]))
      else image.removeAttribute(dimension)
    }
    if (caption.value !== attributes.caption) caption.value = attributes.caption
    if (!dragging && document.activeElement !== width) width.value = String(metadata.width ?? Math.round(image.getBoundingClientRect().width || image.naturalWidth || 0))
    width.max = Number.isFinite(maxWidth()) ? String(Math.floor(maxWidth())) : ''
    placementButtons.forEach(element => element.setAttribute('aria-pressed', String(element.dataset.layout === metadata.layout)))
    figure.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach(control => { control.disabled = !options.editable() })
  }
  sync()
  return { figure, sync, destroy: () => {
    alive = false
    removeDragListeners()
    if (resolvedSource.startsWith('blob:')) URL.revokeObjectURL(resolvedSource)
  } }
}
