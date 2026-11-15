import addColumnLeft from './icons/add-column-left.svg' with { type: 'text' }
import addColumnRight from './icons/add-column-right.svg' with { type: 'text' }
import addRowDown from './icons/add-row-down.svg' with { type: 'text' }
import addRowUp from './icons/add-row-up.svg' with { type: 'text' }
import alignColumnCenter from './icons/align-column-center.svg' with { type: 'text' }
import alignColumnLeft from './icons/align-column-left.svg' with { type: 'text' }
import alignColumnRight from './icons/align-column-right.svg' with { type: 'text' }
import bold from './icons/bold.svg' with { type: 'text' }
import bulletList from './icons/bullet-list.svg' with { type: 'text' }
import chevronDown from './icons/chevron-down.svg' with { type: 'text' }
import code from './icons/code.svg' with { type: 'text' }
import codeblock from './icons/codeblock.svg' with { type: 'text' }
import heading from './icons/heading.svg' with { type: 'text' }
import hrline from './icons/hrline.svg' with { type: 'text' }
import image from './icons/image.svg' with { type: 'text' }
import indent from './icons/indent.svg' with { type: 'text' }
import italic from './icons/italic.svg' with { type: 'text' }
import link from './icons/link.svg' with { type: 'text' }
import more from './icons/more.svg' with { type: 'text' }
import orderedList from './icons/ordered-list.svg' with { type: 'text' }
import outdent from './icons/outdent.svg' with { type: 'text' }
import pencil from './icons/pencil.svg' with { type: 'text' }
import quote from './icons/quote.svg' with { type: 'text' }
import removeColumn from './icons/remove-column.svg' with { type: 'text' }
import removeRow from './icons/remove-row.svg' with { type: 'text' }
import removeTable from './icons/remove-table.svg' with { type: 'text' }
import strike from './icons/strike.svg' with { type: 'text' }
import table from './icons/table.svg' with { type: 'text' }
import taskList from './icons/task-list.svg' with { type: 'text' }

/** The name of one of the editor's icons: the class name of its toolbar button or menu item, e.g. `bold` */
export type IconName =
    | 'add-column-left'
    | 'add-column-right'
    | 'add-row-down'
    | 'add-row-up'
    | 'align-column-center'
    | 'align-column-left'
    | 'align-column-right'
    | 'bold'
    | 'bullet-list'
    | 'chevron-down'
    | 'code'
    | 'codeblock'
    | 'heading'
    | 'hrline'
    | 'image'
    | 'indent'
    | 'italic'
    | 'link'
    | 'more'
    | 'ordered-list'
    | 'outdent'
    | 'pencil'
    | 'quote'
    | 'remove-column'
    | 'remove-row'
    | 'remove-table'
    | 'strike'
    | 'table'
    | 'task-list'

const defaults: Record<IconName, string> = {
    'add-column-left': addColumnLeft,
    'add-column-right': addColumnRight,
    'add-row-down': addRowDown,
    'add-row-up': addRowUp,
    'align-column-center': alignColumnCenter,
    'align-column-left': alignColumnLeft,
    'align-column-right': alignColumnRight,
    bold,
    'bullet-list': bulletList,
    'chevron-down': chevronDown,
    code,
    codeblock,
    heading,
    hrline,
    image,
    indent,
    italic,
    link,
    more,
    'ordered-list': orderedList,
    outdent,
    pencil,
    quote,
    'remove-column': removeColumn,
    'remove-row': removeRow,
    'remove-table': removeTable,
    strike,
    table,
    'task-list': taskList
}

/** The SVG icons, by the class name of their toolbar button or menu item */
export const icons: Record<string, string> = { ...defaults }

/**
 * Replaces icons by name with SVG markup, which is drawn in the text colour when it uses `currentColor`; an icon given
 * as `undefined` gets its own back. It applies to what the editor draws from then on, so call it before making editors.
 */
export function setIcons(custom: Partial<Record<IconName, string>>) {
    for (const [name, svg] of Object.entries(custom) as Array<[IconName, string | undefined]>) {
        icons[name] = svg ?? defaults[name]
    }
}
