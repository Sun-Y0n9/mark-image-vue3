export const DEFAULT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']

export const ALLOWED_LINE_WIDTHS = [2, 3, 5, 8]

export const DEFAULT_LINE_WIDTH_LABELS = {
  2: '细 2px',
  3: '中 3px',
  5: '粗 5px',
  8: '极粗 8px'
}

export const DEFAULT_LINE_WIDTH_OPTIONS = ALLOWED_LINE_WIDTHS.map(value => ({
  value,
  label: DEFAULT_LINE_WIDTH_LABELS[value]
}))

export const ALLOWED_TOOLS = ['pen', 'rect', 'circle']

export const DEFAULT_TOOLS = ['pen', 'rect', 'circle']

export const TOOL_META = {
  pen: { title: '铅笔', label: '铅笔' },
  rect: { title: '矩形', label: '方框' },
  circle: { title: '圆形', label: '圆圈' }
}

export function normalizeColors (colors) {
  const list = (colors || [])
    .map(item => (item == null ? '' : String(item).trim()))
    .filter(Boolean)
  return list.length ? list : DEFAULT_COLORS.slice()
}

export function normalizeLineWidths (input) {
  const source = Array.isArray(input) && input.length ? input : DEFAULT_LINE_WIDTH_OPTIONS
  const result = []
  const seen = {}
  source.forEach(item => {
    const value = typeof item === 'number' ? item : parseInt(item && item.value, 10)
    if (!ALLOWED_LINE_WIDTHS.includes(value) || seen[value]) return
    seen[value] = true
    const label = typeof item === 'object' && item && item.label
      ? String(item.label)
      : DEFAULT_LINE_WIDTH_LABELS[value]
    result.push({ value, label })
  })
  return result.length ? result : DEFAULT_LINE_WIDTH_OPTIONS.slice()
}

export function normalizeTools (tools) {
  const list = (tools || []).filter(tool => ALLOWED_TOOLS.includes(tool))
  const unique = []
  list.forEach(tool => {
    if (unique.indexOf(tool) === -1) unique.push(tool)
  })
  return unique.length ? unique : DEFAULT_TOOLS.slice()
}

export function normalizeZoomRange (min, max) {
  let zoomMin = Number(min)
  let zoomMax = Number(max)
  if (Number.isNaN(zoomMin)) zoomMin = 30
  if (Number.isNaN(zoomMax)) zoomMax = 400
  zoomMin = Math.max(10, Math.round(zoomMin))
  zoomMax = Math.max(zoomMin, Math.round(zoomMax))
  return { zoomMin, zoomMax }
}
