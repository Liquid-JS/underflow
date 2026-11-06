import { LinkAttributes } from '../types/editor'
import { SpecManager } from '../spec/spec-manager'

import { Widget } from '../widget/widget-node'
import { WidgetRules } from '../widget/rules'
import { Doc } from './nodes/doc'
import { Paragraph } from './nodes/paragraph'
import { TextNode } from './nodes/text'
import { HardBreak } from './nodes/hard-break'
import { Heading } from './nodes/heading'
import { CodeBlock } from './nodes/code-block'
import { BulletList } from './nodes/bullet-list'
import { OrderedList } from './nodes/ordered-list'
import { ListItem } from './nodes/list-item'
import { BlockQuote } from './nodes/block-quote'
import { Table } from './nodes/table'
import { TableHead } from './nodes/table-head'
import { TableBody } from './nodes/table-body'
import { TableRow } from './nodes/table-row'
import { TableHeadCell } from './nodes/table-head-cell'
import { TableBodyCell } from './nodes/table-body-cell'
import { ImageNode } from './nodes/image'
import { ThematicBreak } from './nodes/thematic-break'

import { Strong } from './marks/strong'
import { Emph } from './marks/emph'
import { Strike } from './marks/strike'
import { Link } from './marks/link'
import { Code } from './marks/code'
import { CustomBlock } from './nodes/custom-block'
import { FrontMatter } from './nodes/front-matter'
import { HTMLSource } from './nodes/html-source'
import { HTMLSourceMark } from './marks/html-source'

export function createSpecs(linkAttributes: LinkAttributes, widgetRules = new WidgetRules()) {
    return new SpecManager([
        new Doc(),
        new Paragraph(),
        new TextNode(),
        new HardBreak(),
        new Heading(),
        new CodeBlock(),
        new BulletList(),
        new OrderedList(),
        new ListItem(),
        new BlockQuote(),
        new Table(),
        new TableHead(),
        new TableBody(),
        new TableRow(),
        new TableHeadCell(),
        new TableBodyCell(),
        new ImageNode(),
        new ThematicBreak(),
        new Strong(),
        new Emph(),
        new Strike(),
        new Link(linkAttributes),
        new Code(),
        new CustomBlock(),
        new FrontMatter(),
        new Widget(widgetRules),
        new HTMLSource(),
        new HTMLSourceMark()
    ])
}
