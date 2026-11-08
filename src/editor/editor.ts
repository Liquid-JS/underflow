import { EditorOptions, ViewerOptions } from './types/editor'
import { DefaultUI, VNode, IndexList, ToolbarItemOptions } from './types/ui'
import { EditorCore } from './editor-core'
import { Viewer } from './viewer'
import { html } from './ui/vdom/template'
import { Layout } from './ui/components/layout'
import { render } from './ui/vdom/renderer'

/** EditorCore with the default UI: the toolbar, the mode switch and the popups. */
class Editor extends EditorCore {
    private defaultUI!: DefaultUI

    constructor(options: EditorOptions) {
        super(options)

        let layoutComp!: Layout
        const destroy = render(
            this.options.el,
            html`
                <${Layout}
                    ref=${(layout: Layout) => (layoutComp = layout)}
                    eventEmitter=${this.eventEmitter}
                    slots=${this.getEditorElements()}
                    hideModeSwitch=${this.options.hideModeSwitch}
                    toolbarItems=${this.options.toolbarItems}
                    previewStyle=${this.options.previewStyle}
                    editorType=${this.options.initialEditType || 'markdown'}
                    theme=${this.options.theme}
                    toolbarStyle=${this.options.toolbarStyle}
                    readonly=${this.options.readonly || this.options.disabled}
                    disabled=${this.options.disabled}
                />
            ` as VNode
        )

        this.setMinHeight(this.options.minHeight)
        this.setHeight(this.options.height)
        this.defaultUI = {
            insertToolbarItem: layoutComp.insertToolbarItem.bind(layoutComp),
            removeToolbarItem: layoutComp.removeToolbarItem.bind(layoutComp),
            destroy
        }

        this.pluginInfo.toolbarItems?.forEach((toolbarItem) => {
            const { groupIndex, itemIndex, item } = toolbarItem

            this.defaultUI.insertToolbarItem({ groupIndex, itemIndex }, item)
        })
        this.eventEmitter.emit('loadUI', this)
    }

    /** Creates a Viewer with `options.viewer`, an Editor otherwise. */
    static factory(options: (EditorOptions | ViewerOptions) & { viewer?: boolean }) {
        return options.viewer ? new Viewer(options) : new Editor(options as EditorOptions)
    }

    insertToolbarItem(indexInfo: IndexList, item: string | ToolbarItemOptions) {
        this.defaultUI.insertToolbarItem(indexInfo, item)
    }

    removeToolbarItem(itemName: string) {
        this.defaultUI.removeToolbarItem(itemName)
    }

    destroy() {
        super.destroy()
        this.defaultUI.destroy()
    }
}

export { Editor }
