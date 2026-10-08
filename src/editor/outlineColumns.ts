import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import type { MarkdownNode } from '@milkdown/kit/transformer'
import type { Node } from '@milkdown/kit/prose/model'
import type { Ctx } from '@milkdown/kit/ctx'
import { imageBlockSchema } from '@milkdown/kit/component/image-block'
import { TextSelection } from '@milkdown/kit/prose/state'
import { editorViewCtx } from '@milkdown/kit/core'
import { closeHistory } from '@milkdown/kit/prose/history'
import { createImageControls } from './imageControls'
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
      if (!node.attrs.src) state.addNode('html', undefined, '![](<> \"' + node.attrs.outlineTitle + '\")')
      else state.addNode('image', undefined, undefined, {
        url: node.attrs.src, alt: node.attrs.caption, title: node.attrs.outlineTitle,
      })
      state.closeNode()
      node.content.forEach(child => {
        if (child.type.name !== 'paragraph' || child.content.size) state.next(child)
      })
    },
  },
}))

export function insertImageColumns(ctx: Ctx) {
  const view = ctx.get(editorViewCtx)
  const node = columnsSchema.type(ctx).create({ outlineTitle: 'left-50' }, view.state.schema.nodes.paragraph.create())
  let tr = view.state.tr
  const current = tr.selection.$from.parent
  if (current.type.name === 'paragraph' && current.textContent.startsWith('/')) {
    tr = tr.delete(tr.selection.$from.start(), tr.selection.$from.end())
  }
  let parentColumnsDepth = 0
  for (let depth = tr.selection.$from.depth; depth > 0; depth--) {
    if (tr.selection.$from.node(depth).type.name === 'outline-columns') parentColumnsDepth = depth
  }
  if (parentColumnsDepth) tr = tr.insert(tr.selection.$from.after(parentColumnsDepth), node)
  else if (tr.selection.$from.parent.type.name === 'paragraph' && tr.selection.$from.parent.content.size === 0) {
    tr = tr.replaceWith(tr.selection.$from.before(), tr.selection.$from.after(), node)
  } else tr = tr.replaceSelectionWith(node)
  let position = -1
  tr.doc.descendants((child, pos) => { if (child === node) position = pos })
  if (position >= 0) tr.setSelection(TextSelection.create(tr.doc, position + 2))
  view.dispatch(closeHistory(tr).scrollIntoView())
  view.focus()
}

export function outlineColumnsPlugins(resolveImageUrl: (url: string) => string, uploadImage: (file: File) => Promise<string>) {
  const makeView = (columns: boolean) => (initialNode: Node, view: import('@milkdown/kit/prose/view').EditorView, getPos: () => number | undefined) => {
    let currentNode = initialNode
    const dom = document.createElement('div')
    dom.className = columns ? 'outline-columns' : 'studio-image-block'
    const contentDOM = columns ? document.createElement('div') : undefined
    if (contentDOM) contentDOM.className = 'outline-columns-text'
    const controls = createImageControls({
      resolveImageUrl, uploadImage, columns,
      attributes: () => currentNode.attrs as { src: string; caption: string; outlineTitle: string | null },
      editable: () => view.editable,
      update: (attribute, value, separateHistory) => {
        const position = getPos()
        if (position == null || !view.editable) return
        let tr = view.state.tr
        if (separateHistory) tr = closeHistory(tr)
        view.dispatch(tr.setNodeAttribute(position, attribute, value))
      },
      focusText: () => {
        const position = getPos()
        if (position == null || !view.editable) return
        const selection = view.state.selection
        if (columns && selection.from > position && selection.to < position + currentNode.nodeSize) {
          view.focus()
          return
        }
        const target = Math.min(view.state.doc.content.size, position + (columns ? 2 : currentNode.nodeSize))
        view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(target))))
        view.focus()
      },
    })
    dom.append(controls.figure)
    if (contentDOM) dom.append(contentDOM)
    const sync = (node: Node) => {
      currentNode = node
      if (columns) {
        dom.dataset.outlineColumns = ''
        dom.dataset.src = node.attrs.src
        dom.dataset.caption = node.attrs.caption
        dom.dataset.outlineTitle = node.attrs.outlineTitle
        dom.dataset.layout = parseOutlineImageTitle(node.attrs.outlineTitle).layout
      }
      controls.sync()
    }
    sync(initialNode)
    return {
      dom, contentDOM,
      update: (node: Node) => {
        if (node.type !== initialNode.type) return false
        sync(node)
        return true
      },
      stopEvent: (event: Event) => controls.figure.contains(event.target as globalThis.Node),
      ignoreMutation: (mutation: import('@milkdown/kit/prose/view').ViewMutationRecord) =>
        mutation.type !== 'selection' && (!contentDOM || !contentDOM.contains(mutation.target)),
      destroy: controls.destroy,
    }
  }
  const columnsView = $view(columnsSchema.node, () => makeView(true))
  const imageView = $view(imageBlockSchema.node, () => makeView(false))
  return [...columnsRemark, ...columnsSchema, columnsView, imageView]
}
