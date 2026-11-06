import {
    deepCopy,
    deepCopyArray,
    deepMergedCopy,
    escape,
    isEndWithPunct,
    isEndWithSpaceOrPunct,
    isStartWithPunct
} from './common'

it('"deepCopy" should copy the object deeply', () => {
    const obj = { foo: 1, bar: { baz: 1 } }

    expect(deepCopy(obj)).toEqual(obj)
})

it('"deepCopyArray" should copy the array deeply', () => {
    const arr = [1, 2, ['a', 'b', ['c']], 3, 4]

    expect(deepCopyArray(arr)).toEqual(arr)
})

it('"deepMergedCopy" should merge the objects and copy them deeply', () => {
    const obj1 = { a: 1, b: { c: 1, d: 'a', e: 'c', f: { g: 'd' } } }
    const obj2 = { a: 1, b: { c: 1, d: 'b', h: 'e' } }

    expect(deepMergedCopy(obj1, obj2)).toEqual({
        a: 1,
        b: { c: 1, d: 'b', e: 'c', f: { g: 'd' }, h: 'e' }
    })
})

describe('escape', () => {
    // This one has a lot of characters after the '<' symbol to make it timeout the jest test if it regresses
    it('should not break on < chars', () => {
        expect(
            escape(
                'foo <bar. The quick brown fox jumped over the lazy dogs. Lorem ipsum dolor es sit. Lorem impsum dolor es sit. Lorem ipsum dolor es sit. Lorem impsum dolor es sit'
            )
        ).toEqual(
            'foo <bar. The quick brown fox jumped over the lazy dogs. Lorem ipsum dolor es sit. Lorem impsum dolor es sit. Lorem ipsum dolor es sit. Lorem impsum dolor es sit'
        )
    })

    it('should escape HTML', () => {
        expect(escape('Foo <a href="bar">baz</a> quux')).toEqual('Foo \\<a href="bar">baz\\</a> quux')
    })

    it("should escape HTML even if there's a comment", () => {
        expect(escape('Foo <a href="bar">baz</a><!-- this is a comment --> quux')).toEqual(
            'Foo \\<a href="bar">baz\\</a>\\<!-- this is a comment --> quux'
        )
    })

    it('should escape autolinks and self-closing tags', () => {
        expect(escape('<https://docs.example.com> <br/>')).toEqual('\\<https://docs.example.com> \\<br/>')
    })

    it('should not escape text which is not HTML', () => {
        expect(escape('1 < 2 > 0')).toEqual('1 < 2 > 0')
    })
})

describe('punctuation checks', () => {
    it('should treat unicode punctuation and symbols as punctuation, like the markdown parser', () => {
        ['!', '\\', '€', '—', '«', '𝄞', '😀'].forEach((char) => {
            expect(isStartWithPunct(`${char}a`)).toBe(true)
            expect(isEndWithPunct(`a${char}`)).toBe(true)
        })
    })

    it('should not treat letters and digits as punctuation', () => {
        ['a', 'é', '1', '中'].forEach((char) => {
            expect(isStartWithPunct(`${char}!`)).toBe(false)
            expect(isEndWithSpaceOrPunct(`!${char}`)).toBe(false)
        })
    })
})
