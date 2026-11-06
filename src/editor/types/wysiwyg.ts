import { ResolvedPos } from 'prosemirror-model'
import { Selection } from 'prosemirror-state'

export type WwNodeType =
  | 'text'
  | 'hardBreak'
  | 'paragraph'
  | 'heading'
  | 'codeBlock'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'table'
  | 'tableHead'
  | 'tableBody'
  | 'tableRow'
  | 'tableHeadCell'
  | 'tableBodyCell'
  | 'blockQuote'
  | 'thematicBreak'
  | 'image'
  | 'hardBreak'
  | 'lineBreak'
  | 'customBlock'
  | 'frontMatter'
  | 'widget'
  | 'html'
  | 'htmlSource'

export type WwMarkType = 'strong' | 'emph' | 'strike' | 'link' | 'code' | 'html' | 'htmlInlineSource'

export interface CellSelection extends Selection {
    startCell: ResolvedPos
    endCell: ResolvedPos
}

export type ColumnAlign = 'left' | 'right' | 'center'
