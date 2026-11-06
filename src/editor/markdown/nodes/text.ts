import { NodeSchema } from '../../spec/node'

export class TextNode extends NodeSchema {
    get name() {
        return 'text'
    }

    get schema() {
        return {
            group: 'inline'
        }
    }
}
