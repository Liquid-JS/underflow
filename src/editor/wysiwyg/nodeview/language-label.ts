import { icons } from '../../ui/icons'
import { cls } from '../../utils/dom'

/** The language label of a WYSIWYG code block: a button that opens the language editor. */
export function createLanguageLabel(language: string, onClick: () => void) {
    const label = document.createElement('button')
    const text = document.createElement('span')
    const icon = document.createElement('span')

    label.type = 'button'
    label.className = cls('code-block-label')
    label.setAttribute('contenteditable', 'false')
    text.textContent = language
    icon.className = cls('icon')
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = icons.pencil
    label.append(text, icon)
    // keeps the focus in the editor, as the language editor takes it next
    label.addEventListener('mousedown', (ev) => ev.preventDefault())
    label.addEventListener('click', (ev) => {
        ev.preventDefault()
        onClick()
    })

    return label
}
