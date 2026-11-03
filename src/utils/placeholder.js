export const DEFAULT_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">' +
      '<rect width="640" height="400" fill="#22262f"/>' +
      '<text x="50%" y="50%" fill="#8b90a0" font-size="18" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">无可用影像</text>' +
    '</svg>'
  )

const BASE64_MAGIC = [
  ['/9j/', 'image/jpeg'],
  ['iVBORw0KGgo', 'image/png'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
  ['PHN2Zy', 'image/svg+xml'],
  ['PD94bW', 'image/svg+xml']
]

/**
 * 占位图可以是 URL、data URL，或纯 base64。空值回退到内置图。
 */
export function resolvePlaceholderSource (value) {
  const source = value == null ? '' : String(value).trim()
  if (!source) return DEFAULT_PLACEHOLDER
  if (/^(data:|https?:|blob:)/i.test(source)) return source
  const compact = source.replace(/\s+/g, '')
  const magic = BASE64_MAGIC.find(([prefix]) => compact.startsWith(prefix))
  if (magic && /^[A-Za-z0-9+/=]+$/.test(compact)) {
    return `data:${magic[1]};base64,${compact}`
  }
  return source
}
