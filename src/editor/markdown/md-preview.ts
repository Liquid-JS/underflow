import { Emitter } from '../types/event'
import { CustomHTMLRenderer, LinkAttributes } from '../types/editor'
import {
    cls,
    createElementWith,
    removeNode,
    removeProseMirrorHackNodes
} from '../utils/dom'
import { isInlineNode, findClosestNode, getMdStartCh } from '../utils/markdown'
import { css } from '../utils/native'
import { WidgetRules } from '../widget/rules'
import { EditResult } from '../../parser/types/markdown-document'
import { MdNode, Pos as MdPos } from '../../parser/types/node'
import { Renderer } from '../../parser/html/renderer'
import { getHTMLRenderConvertors } from './html-render-convertors'
import { findAdjacentElementToScrollTop } from './scroll/dom'
import { removeOffsetInfoByNode } from './scroll/offset'

export const CLASS_HIGHLIGHT = cls('md-preview-highlight')

function findTableCell(tableRow: MdNode, chOffset: number) {
    let cell = tableRow.firstChild

    while (cell && cell.next) {
        if (getMdStartCh(cell.next) > chOffset + 1) {
            break
        }
        cell = cell.next
    }

    return cell
}

type Sanitizer = (html: string) => string

interface Options {
    linkAttributes: LinkAttributes | null
    customHTMLRenderer: CustomHTMLRenderer
    widgetRules?: WidgetRules
    isViewer: boolean
    highlight?: boolean
    sanitizer: Sanitizer
}

/** The rendered markdown, in the editor's preview and in the viewer. */
class MarkdownPreview {
    el: HTMLElement | null

    previewContent!: HTMLElement

    private eventEmitter: Emitter

    private isViewer: boolean

    private cursorNodeId!: number | null

    private renderer: Renderer

    private sanitizer: Sanitizer

    constructor(eventEmitter: Emitter, options: Options) {
        const el = document.createElement('div')

        this.el = el
        this.eventEmitter = eventEmitter
        this.isViewer = !!options.isViewer

        this.el.className = cls('md-preview')

        const {
            linkAttributes,
            customHTMLRenderer,
            sanitizer,
            highlight = false,
            widgetRules
        } = options

        this.renderer = new Renderer({
            gfm: true,
            nodeId: true,
            convertors: getHTMLRenderConvertors(linkAttributes, customHTMLRenderer, widgetRules)
        })

        this.cursorNodeId = null
        this.sanitizer = sanitizer

        this.initEvent(highlight)
        this.initContentSection()

        // To prevent overflowing contents in the viewer
        if (this.isViewer) {
            this.previewContent.style.overflowWrap = 'break-word'
        }
    }

    private initContentSection() {
        this.previewContent = createElementWith(
            `<div class="${cls('contents')}"></div>`
        ) as HTMLElement

        if (!this.isViewer) {
            this.el!.appendChild(this.previewContent)
        }
    }

    private toggleActive(active: boolean) {
        this.el!.classList.toggle('active', active)
    }

    private initEvent(highlight: boolean) {
        this.eventEmitter.listen('updatePreview', this.update.bind(this))

        if (this.isViewer) {
            return
        }

        if (highlight) {
            this.eventEmitter.listen('changeToolbarState', ({ mdNode, cursorPos }) => {
                this.updateCursorNode(mdNode, cursorPos)
            })

            this.eventEmitter.listen('blur', () => {
                this.removeHighlight()
            })
        }

        this.el!.addEventListener('scroll', this.handleScroll)
        this.eventEmitter.listen('changePreviewTabPreview', () => this.toggleActive(true))
        this.eventEmitter.listen('changePreviewTabWrite', () => this.toggleActive(false))
    }

    private removeHighlight() {
        if (this.cursorNodeId) {
            const currentEl = this.getElementByNodeId(this.cursorNodeId)

            if (currentEl) {
                currentEl.classList.remove(CLASS_HIGHLIGHT)
            }
        }
    }

    private updateCursorNode(cursorNode: MdNode | null, cursorPos: MdPos) {
        if (cursorNode) {
            cursorNode = findClosestNode(cursorNode, (mdNode) => !isInlineNode(mdNode))!

            if (cursorNode.type === 'tableRow') {
                cursorNode = findTableCell(cursorNode, cursorPos[1])!
            } else if (cursorNode.type === 'tableBody') {
                // empty line next to table
                cursorNode = null
            }
        }

        const cursorNodeId = cursorNode ? cursorNode.id : null

        if (this.cursorNodeId === cursorNodeId) {
            return
        }

        const oldEL = this.getElementByNodeId(this.cursorNodeId)
        const newEL = this.getElementByNodeId(cursorNodeId)

        if (oldEL) {
            oldEL.classList.remove(CLASS_HIGHLIGHT)
        }
        if (newEL) {
            newEL.classList.add(CLASS_HIGHLIGHT)
        }

        this.cursorNodeId = cursorNodeId
    }

    private getElementByNodeId(nodeId: number | null) {
        return nodeId
            ? this.previewContent.querySelector<HTMLElement>(`[data-nodeid="${nodeId}"]`)
            : null
    }

    update(changed: EditResult[]) {
        changed.forEach((editResult) => this.replaceRangeNodes(editResult))
        this.eventEmitter.emit('afterPreviewRender', this)
    }

    replaceRangeNodes(editResult: EditResult) {
        const { nodes, removedNodeRange } = editResult
        const contentEl = this.previewContent
        const newHtml = this.eventEmitter.emitReduce(
            'beforePreviewRender',
            this.sanitizer(nodes.map((node) => this.renderer.render(node)).join(''))
        )

        if (!removedNodeRange) {
            contentEl.insertAdjacentHTML('afterbegin', newHtml)
        } else {
            const [startNodeId, endNodeId] = removedNodeRange.id
            const startEl = this.getElementByNodeId(startNodeId)
            const endEl = this.getElementByNodeId(endNodeId)

            if (startEl) {
                startEl.insertAdjacentHTML('beforebegin', newHtml)
                let el = startEl

                while (el && el !== endEl) {
                    const nextEl = el.nextElementSibling as HTMLElement

                    removeNode(el)
                    removeOffsetInfoByNode(el)
                    el = nextEl
                }
                if (el?.parentNode) {
                    removeNode(el)
                    removeOffsetInfoByNode(el)
                }
            }
        }
    }

    getRenderer() {
        return this.renderer
    }

    private handleScroll = (event: Event) => {
        this.eventEmitter.emit(
            'scroll',
            'preview',
            findAdjacentElementToScrollTop((event.target as HTMLElement).scrollTop, this.previewContent)
        )
    }

    destroy() {
        this.el!.removeEventListener('scroll', this.handleScroll)
        this.el = null
    }

    getElement() {
        return this.el!
    }

    getHTML() {
        return removeProseMirrorHackNodes(this.previewContent.innerHTML)
    }

    setHTML(html: string) {
        this.previewContent.innerHTML = html
    }

    setHeight(height: number) {
        css(this.el!, { height: `${height}px` })
    }

    setMinHeight(minHeight: number) {
        css(this.el!, { minHeight: `${minHeight}px` })
    }
}

export { MarkdownPreview }
