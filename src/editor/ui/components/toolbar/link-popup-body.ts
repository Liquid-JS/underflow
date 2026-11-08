import { Emitter } from '../../../types/event'
import { ExecCommand, HidePopup, PopupInitialValues } from '../../../types/ui'
import { I18n } from '../../../i18n/i18n'
import { cls } from '../../../utils/dom'
import { html } from '../../vdom/template'
import { Component } from '../../vdom/component'
import { isUndefined } from '../../../utils/native'

interface Props {
    /** the editor's texts, in its language */
    i18n: I18n
    eventEmitter: Emitter
    execCommand: ExecCommand
    hidePopup: HidePopup
    show: boolean
    initialValues: PopupInitialValues
}

export class LinkPopupBody extends Component<Props> {
    private initialize() {
        const { linkUrl, linkText } = this.props.initialValues

        const linkUrlEl = this.refs.url as HTMLInputElement
        const linkTextEl = this.refs.text as HTMLInputElement

        linkUrlEl.classList.remove('wrong')
        linkTextEl.classList.remove('wrong', 'disabled')
        linkTextEl.removeAttribute('disabled')

        if (linkUrl) {
            linkTextEl.classList.add('disabled')
            linkTextEl.setAttribute('disabled', 'disabled')
        }

        linkUrlEl.value = linkUrl || ''
        linkTextEl.value = linkText || ''
    }

    private resetCustomValidity = (evt: Event) => {
        const sender = evt.target as HTMLInputElement

        // having setCustomValidity set causes multiple validity reports of
        // the current validation message in Chrome/Edge during subsequent
        // text input. I don't see any evidence that setCustomValidity
        // puts the input element into an invalid state, nor do I see any
        // evidence that validity should be reported on each keypress if
        // custom validity is set, so this might be a browser bug.

        sender.setCustomValidity('')
    }

    private execCommand = () => {
        const linkUrlEl = this.refs.url as HTMLInputElement
        const linkTextEl = this.refs.text as HTMLInputElement

        linkUrlEl.setCustomValidity('')
        linkTextEl.setCustomValidity('')

        linkUrlEl.classList.remove('wrong')
        linkTextEl.classList.remove('wrong')

        if (linkUrlEl.value.length < 1) {
            linkUrlEl.setCustomValidity(this.props.i18n.get('URL required'))
            linkUrlEl.reportValidity()
            linkUrlEl.classList.add('wrong')
            return
        }

        const checkLinkText = isUndefined(this.props.initialValues.linkUrl)

        if (checkLinkText && linkTextEl.value.length < 1) {
            linkTextEl.setCustomValidity(this.props.i18n.get('Link text required'))
            linkTextEl.reportValidity()
            linkTextEl.classList.add('wrong')
            return
        }

        this.props.execCommand('addLink', {
            linkUrl: linkUrlEl.value,
            linkText: linkTextEl.value
        })
    }

    mounted() {
        this.initialize()
    }

    updated(prevProps: Props) {
        if (!prevProps.show && this.props.show) {
            this.initialize()
        }
    }

    render() {
        return html`
            <div role="dialog" aria-modal="true" tabindex="-1" aria-label="${this.props.i18n.get('Insert link')}">
                <label for="uf-link-url-input">${this.props.i18n.get('URL')}</label>
                <input
                    id="uf-link-url-input"
                    type="text"
                    ref=${(el: HTMLInputElement) => (this.refs.url = el)}
                    onKeyDown=${this.resetCustomValidity}
                    required
                />
                <label for="uf-link-text-input">${this.props.i18n.get('Link text')}</label>
                <input
                    id="uf-link-text-input"
                    type="text"
                    ref=${(el: HTMLInputElement) => (this.refs.text = el)}
                    onKeyDown=${this.resetCustomValidity}
                    required
                />
                <div class="${cls('button-container')}">
                    <button type="button" class="${cls('close-button')}" onClick=${this.props.hidePopup}>
                        ${this.props.i18n.get('Cancel')}
                    </button>
                    <button type="button" class="${cls('ok-button')}" onClick=${this.execCommand}>
                        ${this.props.i18n.get('OK')}
                    </button>
                </div>
            </div>
        `
    }
}
