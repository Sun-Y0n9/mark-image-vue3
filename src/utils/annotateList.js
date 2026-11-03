function parseJsonField (value, fallback = {}) {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return fallback
  }
}

/**
 * 将业务侧 annotateList 转为 Fabric loadFromJSON 可用的 objects
 * 支持 line（startX/endX）和 rect（x/y/width/height）
 */
export function annotateListToFabricObjects (annotateList) {
  if (!annotateList || !annotateList.length) return []
  return annotateList.map(item => {
    const coord = parseJsonField(item.coordinate, {})
    const style = parseJsonField(item.style, {})
    if (coord.startX != null && coord.endX != null) {
      return {
        type: 'line',
        x1: coord.startX,
        y1: coord.startY,
        x2: coord.endX,
        y2: coord.endY,
        stroke: style.stroke || '#1890ff',
        strokeWidth: style.strokeWidth || 2,
        selectable: false,
        evented: false,
        strokeUniform: true
      }
    }
    if (coord.width != null && coord.height != null) {
      return {
        type: 'rect',
        left: coord.x,
        top: coord.y,
        width: coord.width,
        height: coord.height,
        fill: style.fill || 'transparent',
        stroke: style.stroke || '#f5222d',
        strokeWidth: style.strokeWidth || 2,
        selectable: false,
        evented: false,
        strokeUniform: true
      }
    }
    return null
  }).filter(Boolean)
}
