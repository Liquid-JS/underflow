const reXmlSpecial = /[&<>"]/g
const xmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
}

export function escapeXml(text: string) {
    return text.replace(reXmlSpecial, (char) => xmlEntities[char])
}
