import { Fragment, Schema, Slice } from 'prosemirror-model'
import { createSpecs } from '../spec-creator'
import { dataURLToFile, takeDataImages } from './data-images'

const png = 'data:image/png;base64,iVBORw0KGgo='

describe('dataURLToFile', () => {
    it('should decode base64 and percent-encoded images', async () => {
        const file = dataURLToFile(png)!

        expect(file.type).toBe('image/png')
        expect(file.name).toBe('image.png')
        expect(Array.from(new Uint8Array(await file.arrayBuffer()))).toEqual([
            137, 80, 78, 71, 13, 10, 26, 10
        ])

        const svg = dataURLToFile('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')!

        expect(svg.type).toBe('image/svg+xml')
        expect(svg.name).toBe('image.svg')
        expect(await svg.text()).toBe('<svg/>')
    })

    it('should return null for other data and broken URLs', () => {
        expect(dataURLToFile('data:text/plain,abc')).toBeNull()
        expect(dataURLToFile('data:image/png;base64,***')).toBeNull()
        expect(dataURLToFile('https://example.com/a.png')).toBeNull()
    })
})

describe('takeDataImages', () => {
    const specs = createSpecs({})
    const s = new Schema({ nodes: specs.nodes, marks: specs.marks })

    it('should take data images out, with their alt text, and leave other images', () => {
        const { paragraph, image } = s.nodes
        const slice = new Slice(
            Fragment.from([
                paragraph.create(null, [
                    s.text('a '),
                    image.create({ imageUrl: png, altText: 'pic' }),
                    image.create({ imageUrl: 'https://example.com/a.png' })
                ]),
                paragraph.create(null, image.create({ imageUrl: png })),
                paragraph.create(null, s.text('b'))
            ]),
            1,
            1
        )

        const { slice: rest, images } = takeDataImages(slice)

        expect(images.map(({ file, altText }) => [file.type, altText])).toEqual([
            ['image/png', 'pic'],
            ['image/png', '']
        ])
        // the paragraph that only had a data image is gone
        expect(rest.content.childCount).toBe(2)
        expect(rest.content.firstChild!.childCount).toBe(2)
        expect(rest.content.firstChild!.lastChild!.attrs.imageUrl).toBe('https://example.com/a.png')
        expect([rest.openStart, rest.openEnd]).toEqual([1, 1])
    })

    it('should return an empty slice when only data images were pasted', () => {
        const slice = new Slice(
            Fragment.from(s.nodes.paragraph.create(null, s.nodes.image.create({ imageUrl: png }))),
            0,
            0
        )

        expect(takeDataImages(slice).slice).toBe(Slice.empty)
    })

    it('should keep the slice as it is without data images', () => {
        const slice = new Slice(Fragment.from(s.nodes.paragraph.create(null, s.text('a'))), 1, 1)

        expect(takeDataImages(slice)).toEqual({ slice, images: [] })
    })
})
