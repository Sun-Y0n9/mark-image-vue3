export function dataURLToBlob (dataURL) {
  if (!dataURL) return null
  const parts = dataURL.split(',')
  const mimeMatch = parts[0] && parts[0].match(/:(.*?);/)
  const mime = (mimeMatch && mimeMatch[1]) || 'image/png'
  const binary = atob(parts[1] || '')
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

export function blobToFile (blob, filename) {
  if (!blob) return null
  const name = filename || 'annotation.png'
  try {
    return new File([blob], name, { type: blob.type || 'image/png' })
  } catch (e) {
    blob.name = name
    return blob
  }
}
