import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import type { MarkdownNode } from '@milkdown/kit/transformer'
import type { Node } from '@milkdown/kit/prose/model'
import type { Ctx } from '@milkdown/kit/ctx'
import { imageBlockSchema } from '@milkdown/kit/component/image-block'
import { parseOutlineImageTitle } from '../markdown/outlineImages'

// Crepe normally stores a resize ratio in Markdown's alt text. Outline uses
// that field for the caption, so keep it as text throughout an editing session.
export function configureOutlineImageCaptions(ctx: Ctx) {
  ctx.update(imageBlockSchema.key, previous => context => {
    const schema = previous(context)
    return {
      ...schema,
      attrs: { ...schema.attrs, outlineTitle: { default: null } },
      parseDOM: [{
        tag: 'img[data-type="image-block"]',
        getAttrs: dom => {
          const element = dom as HTMLElement
          return {
            src: element.getAttribute('src') ?? '',
            caption: element.getAttribute('caption') ?? '',
            ratio: Number(element.getAttribute('ratio') ?? 1),
            outlineTitle: element.getAttribute('outlineTitle'),
          }
        },
      }],
      parseMarkdown: {
        ...schema.parseMarkdown,
        runner: (state, node, type) => state.addNode(type, {
          src: node.url, caption: node.alt ?? '', ratio: 1, outlineTitle: node.title ?? null,
        }),
      },
      toMarkdown: {
        ...schema.toMarkdown,
        runner: (state, node) => {
          state.openNode('paragraph')
          state.addNode('image', undefined, undefined, {
            url: node.attrs.src, alt: node.attrs.caption, title: node.attrs.outlineTitle,
          })
          state.closeNode()
        },
      },
    }
  })
}

// Crepe converts standalone images to image-block nodes before our transform.
// Accept either shape, keeping Outline's title separate from the visible caption.
const columnsRemark = $remark('outline-columns', () => () => tree => {
  const children = (tree as unknown as MarkdownNode).children
  if (!children) return
  for (let index = 0; index < children.length; index++) {
    const block = children[index]
    const image = block.type === 'image-block' ? block
      : block.type === 'paragraph' && (block.children as MarkdownNode[])?.length === 1
        ? (block.children as MarkdownNode[])[0] : undefined
    if (!image || !['image', 'image-block'].includes(image.type)) continue
    const layout = parseOutlineImageTitle(image.title as string).layout
    if (layout !== 'left-50' && layout !== 'right-50') continue
    const text: MarkdownNode[] = []
    while (index + 1 < children.length) {
      const next = children[index + 1]
      if (!['paragraph', 'list', 'blockquote', 'code'].includes(next.type)) break
      // Another image or a protected block starts a new composition.
      if (JSON.stringify(next).includes('outline.local/preserved/')
        || (next.children as MarkdownNode[] | undefined)?.some(child => child.type === 'image')) break
      text.push(...children.splice(index + 1, 1))
    }
    children[index] = { ...image, type: 'outline-columns', children: text.length ? text : [{ type: 'paragraph', children: [] }] }
  }
})

const columnsSchema = $nodeSchema('outline-columns', () => ({
  group: 'block',
  content: 'block+',
  isolating: true,
  defining: true,
  attrs: {
    src: { default: '' },
    caption: { default: '' },
    outlineTitle: { default: '' },
  },
  parseDOM: [{
    tag: 'div[data-outline-columns]',
    contentElement: '.outline-columns-text',
    getAttrs: dom => {
      const element = dom as HTMLElement
      return {
        src: element.dataset.src ?? '',
        caption: element.dataset.caption ?? '',
        outlineTitle: element.dataset.outlineTitle ?? '',
      }
    },
  }],
  toDOM: node => ['div', {
    'data-outline-columns': '', 'data-src': node.attrs.src,
    'data-caption': node.attrs.caption, 'data-outline-title': node.attrs.outlineTitle,
  }, ['div', { class: 'outline-columns-text' }, 0]],
  parseMarkdown: {
    match: node => node.type === 'outline-columns',
    runner: (state, node, type) => {
      state.openNode(type, { src: node.url, caption: node.alt ?? '', outlineTitle: node.title })
      state.next(node.children as MarkdownNode[])
      state.closeNode()
    },
  },
  toMarkdown: {
    match: node => node.type.name === 'outline-columns',
    runner: (state, node) => {
      state.openNode('paragraph')
      state.addNode('image', undefined, undefined, {
        url: node.attrs.src, alt: node.attrs.caption, title: node.attrs.outlineTitle,
      })
      state.closeNode()
      state.next(node.content)
    },
  },
}))

export function outlineColumnsPlugins(resolveImageUrl: (url: string) => string) {
  const columnsView = $view(columnsSchema.node, () => (initialNode, view, getPos) => {
    let currentNode = initialNode
    const dom = document.createElement('div')
    dom.className = 'outline-columns'
    const figure = document.createElement('figure')
    figure.className = 'outline-columns-image'
    figure.contentEditable = 'false'
    const image = document.createElement('img')
    image.draggable = false
    const caption = document.createElement('input')
    caption.type = 'text'
    caption.placeholder = 'Pie de imagen'
    caption.setAttribute('aria-label', 'Pie de imagen')
    const placement = document.createElement('select')
    placement.setAttribute('aria-label', 'Posición de la imagen')
    for (const [value, label] of [['left-50', 'Imagen a la izquierda'], ['right-50', 'Imagen a la derecha']]) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      placement.append(option)
    }
    const contentDOM = document.createElement('div')
    contentDOM.className = 'outline-columns-text'
    const controls = document.createElement('div')
    controls.className = 'outline-columns-controls'
    controls.append(caption, placement)
    figure.append(image, controls)
    dom.append(figure, contentDOM)

    const setAttribute = (name: string, value: string) => {
      const position = getPos()
      if (!view.editable || position == null) return
      view.dispatch(view.state.tr.setNodeAttribute(position, name, value))
    }
    caption.addEventListener('change', () => setAttribute('caption', caption.value))
    placement.addEventListener('change', () => setAttribute('outlineTitle',
      currentNode.attrs.outlineTitle.replace(/(?:left|right)-50/, placement.value)))

    const sync = (node: Node) => {
      currentNode = node
      const attributes = parseOutlineImageTitle(node.attrs.outlineTitle)
      dom.dataset.outlineColumns = ''
      dom.dataset.src = node.attrs.src
      dom.dataset.caption = node.attrs.caption
      dom.dataset.outlineTitle = node.attrs.outlineTitle
      dom.dataset.layout = attributes.layout
      const source = resolveImageUrl(node.attrs.src)
      if (image.getAttribute('src') !== source) image.src = source
      image.alt = node.attrs.caption
      image.title = attributes.title ?? ''
      for (const name of ['width', 'height'] as const) {
        if (attributes[name]) image.setAttribute(name, String(attributes[name]))
        else image.removeAttribute(name)
      }
      caption.value = node.attrs.caption
      placement.value = attributes.layout ?? 'left-50'
      caption.disabled = placement.disabled = !view.editable
    }
    sync(initialNode)
    return {
      dom, contentDOM,
      update: node => {
        if (node.type !== initialNode.type) return false
        sync(node)
        return true
      },
      stopEvent: event => figure.contains(event.target as globalThis.Node),
      ignoreMutation: mutation => mutation.type !== 'selection' && !contentDOM.contains(mutation.target),
    }
  })
  return [...columnsRemark, ...columnsSchema, columnsView]
}
