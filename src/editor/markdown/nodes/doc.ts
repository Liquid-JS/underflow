import { NodeSchema } from '../../spec/node'

export class Doc extends NodeSchema {
    get name() {
        return 'doc'
    }

    get schema() {
        return {
            content: 'block+'
        }
    }
}
