<template>
  <div
    ref="rootEl"
    class="annotation-canvas"
    :class="{
      'layout-toolbar-top': layoutToolbarPosition === 'top',
      'layout-toolbar-bottom': layoutToolbarPosition === 'bottom'
    }"
  >
    <div v-if="showAnnotationToolbar" class="annotation-toolbar">
      <div v-if="enabledTools.length" class="tool-group">
        <button
          v-for="tool in enabledTools"
          :key="tool"
          type="button"
          class="tool-btn"
          :class="{ active: currentTool === tool }"
          :disabled="!editable"
          :title="toolMeta[tool].title"
          @click="setTool(tool)"
        >
          <svg v-if="tool === 'pen'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <svg v-else-if="tool === 'rect'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
          {{ toolMeta[tool].label }}
        </button>
      </div>

      <div v-if="enabledTools.length && colorOptions.length" class="divider" />

      <div v-if="colorOptions.length" class="color-group">
        <span class="color-label">颜色</span>
        <div
          v-for="color in colorOptions"
          :key="color"
          class="color-swatch"
          :class="{ selected: currentColor === color, 'is-white': color === '#ffffff' }"
          :style="{ background: color }"
          @click="setColor(color)"
        />
      </div>

      <div v-if="colorOptions.length && lineWidthOptions.length" class="divider" />

      <select
        v-if="lineWidthOptions.length"
        class="width-select"
        :value="currentLineWidth"
        :disabled="!editable"
        title="线宽"
        @change="setLineWidth($event.target.value)"
      >
        <option v-for="item in lineWidthOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>

      <div v-if="showUndoButton || showClearButton" class="divider" />

      <button
        v-if="showUndoButton"
        type="button"
        class="tool-btn undo-btn"
        :disabled="!editable"
        title="撤销 Ctrl+Z"
        @click="undo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
        撤销
      </button>
      <button
        v-if="showClearButton"
        type="button"
        class="tool-btn clear-btn"
        :disabled="!editable"
        title="清除所有标注"
        @click="clearAnnotations"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
        清除
      </button>

      <div v-if="showRotateButtons" class="divider" />

      <template v-if="showRotateButtons">
        <button type="button" class="tool-btn" title="向左旋转90°" @click="rotateCanvas(-90)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
          </svg>
          左转
        </button>
        <button type="button" class="tool-btn" title="向右旋转90°" @click="rotateCanvas(90)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.49-4.95" />
          </svg>
          右转
        </button>
      </template>

      <button
        v-show="showSaveButton"
        type="button"
        class="tool-btn save-btn"
        :class="{ 'has-unsaved': hasUnsaved }"
        :disabled="!editable"
        :title="saveButtonTitle"
        @click="saveAnnotations"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
        保存
      </button>
      <div
        v-if="toolbarAnnotationBlocked"
        class="toolbar-block-overlay"
        title="无映像，不支持标注"
      />
    </div>
    <div
      v-else-if="reserveToolbarSpace"
      class="annotation-toolbar annotation-toolbar--placeholder"
      :style="toolbarPlaceholderStyle"
    />

    <div
      ref="wrapper"
      class="annotation-wrapper"
      :class="{
        'annotation-wrapper--view-only': !annotationEnabled,
        'is-panning': isPanning
      }"
    >
      <div ref="canvasScroll" class="canvas-scroll">
        <div ref="canvasHost" class="canvas-host">
          <canvas ref="canvasEl"></canvas>
        </div>
      </div>
      <div v-if="loading" class="canvas-loading">
        <div class="mark-image-spinner" />
        <div class="mark-image-spinner-text">影像加载中...</div>
      </div>
      <span v-if="pageLabel && !loading" class="page-badge">{{ pageLabel }}</span>
      <span v-if="!loading && zoomEnabled" class="zoom-badge">
        <button
          type="button"
          class="zoom-ctrl-btn"
          title="缩小 10%"
          :disabled="Math.round(zoomPercent) <= resolvedZoomMin"
          @click.stop="zoomByStep(-10)"
        >
          −
        </button>
        <span class="zoom-percent-text">{{ Math.round(zoomPercent) }}%</span>
        <button
          type="button"
          class="zoom-ctrl-btn"
          title="放大 10%"
          :disabled="Math.round(zoomPercent) >= resolvedZoomMax"
          @click.stop="zoomByStep(10)"
        >
          +
        </button>
        <button
          v-if="Math.round(zoomPercent) !== 100"
          type="button"
          class="zoom-ctrl-btn"
          title="重置缩放"
          @click.stop="setZoomPercent(100)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch
} from 'vue'
import { fabric } from 'fabric'
import { annotateListToFabricObjects } from '../utils/annotateList'
import { DEFAULT_PLACEHOLDER, resolvePlaceholderSource } from '../utils/placeholder'
import { dataURLToBlob, blobToFile } from '../utils/exportImage'
import {
  DEFAULT_COLORS,
  DEFAULT_LINE_WIDTH_OPTIONS,
  DEFAULT_TOOLS,
  TOOL_META,
  normalizeColors,
  normalizeLineWidths,
  normalizeTools,
  normalizeZoomRange
} from '../utils/config'

defineOptions({
  name: 'AnnotationCanvas'
})

const props = defineProps({
  imageUrl: { type: String, required: true },
  storageKey: { type: String, required: true },
  initialAnnotateList: { type: Array, default: () => [] },
  /** 已提交标注（Fabric objects 结构，用于编辑回显） */
  initialStoredPayload: { type: Object, default: null },
  pageLabel: { type: String, default: '' },
  editable: { type: Boolean, default: true },
  /** 标注工具栏位置：bottom 图片下方（默认）、top 图片上方、'' 不显示工具栏 */
  toolbarPosition: {
    type: String,
    default: 'bottom',
    validator (value) {
      return ['top', 'bottom', ''].includes(value)
    }
  },
  /** 不显示工具栏时是否保留工具栏占位（用于左右比对面板垂直对齐） */
  reserveToolbarSpace: {
    type: Boolean,
    default: false
  },
  /** 占位高度（px），由父级根据对侧工具栏实测高度传入 */
  toolbarSpaceHeight: {
    type: Number,
    default: 0
  },
  /** 原图加载失败后的重新加载次数，用完后才显示占位图 */
  imageRetryCount: {
    type: Number,
    default: 1
  },
  /** 图片加载失败时的占位图。支持 URL、data URL 或纯 base64，空值使用内置图 */
  placeholderUrl: {
    type: String,
    default: DEFAULT_PLACEHOLDER
  },
  /** 保存方式：json 标注数据 / image 原图叠加上标注后的新图 */
  saveMode: {
    type: String,
    default: 'json',
    validator (value) {
      return ['json', 'image'].includes(value)
    }
  },
  /** 导出图片格式，仅 saveMode=image 时使用 */
  imageType: {
    type: String,
    default: 'png',
    validator (value) {
      return ['png', 'jpeg'].includes(value)
    }
  },
  imageQuality: {
    type: Number,
    default: 0.92
  },
  /** 画笔颜色，默认 6 色 */
  colors: {
    type: Array,
    default () {
      return DEFAULT_COLORS.slice()
    }
  },
  /** 线宽，仅允许 2/3/5/8 中的任意几个；可传数字或 { value, label } */
  lineWidths: {
    type: Array,
    default () {
      return DEFAULT_LINE_WIDTH_OPTIONS.slice()
    }
  },
  /** 工具：pen / rect / circle 中的一个或多个 */
  tools: {
    type: Array,
    default () {
      return DEFAULT_TOOLS.slice()
    }
  },
  showUndoButton: { type: Boolean, default: true },
  showClearButton: { type: Boolean, default: true },
  showRotateButtons: { type: Boolean, default: true },
  /** 是否展示保存按钮 */
  showSaveButton: {
    type: Boolean,
    default: false
  },
  zoomEnabled: { type: Boolean, default: true },
  zoomMinPercent: { type: Number, default: 30 },
  zoomMaxPercent: { type: Number, default: 400 },
  /** 自定义确认，返回 truthy / Promise。不传则用 window.confirm */
  confirmFn: {
    type: Function,
    default: null
  },
  /** 自定义提示 (type, text) */
  messageFn: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['save', 'clear', 'loaded', 'message'])

const rootEl = useTemplateRef('rootEl')
const wrapper = useTemplateRef('wrapper')
const canvasScroll = useTemplateRef('canvasScroll')
const canvasHost = useTemplateRef('canvasHost')
const canvasEl = useTemplateRef('canvasEl')

const currentTool = ref('pen')
const currentColor = ref('#ef4444')
const currentLineWidth = ref(3)
const loading = ref(false)
/** 当前缩放百分比，100 为适配窗口后的基准 */
const zoomPercent = ref(100)
const isPanning = ref(false)
const hasUnsaved = ref(false)
/** 无有效影像时为 true，工具栏显示遮罩并禁止标注 */
const imageUnavailable = ref(false)
const toolMeta = TOOL_META

/** Fabric 实例不进入响应式系统，避免代理破坏画布对象 */
let canvas = null
let imageLoadId = 0
let canvasRotation = 0
let origW = 0
let origH = 0
let isDrawing = false
let startPoint = null
let activeShape = null
let resizeObserver = null
let resolvedImageUrl = ''
let displayScale = 1
let panLastX = 0
let panLastY = 0
let fitRetryTimer = null
/** 加载完成后的标注基线，用于判断是否有未保存改动 */
let baselineObjects = null

const colorOptions = computed(() => normalizeColors(props.colors))
const lineWidthOptions = computed(() => normalizeLineWidths(props.lineWidths))
const enabledTools = computed(() => normalizeTools(props.tools))
const resolvedZoomMin = computed(() => normalizeZoomRange(props.zoomMinPercent, props.zoomMaxPercent).zoomMin)
const resolvedZoomMax = computed(() => normalizeZoomRange(props.zoomMinPercent, props.zoomMaxPercent).zoomMax)
const saveButtonTitle = computed(() => {
  if (hasUnsaved.value) return '有未保存的标注'
  return props.saveMode === 'image' ? '保存为图片' : '保存标注 JSON'
})
const showAnnotationToolbar = computed(() => props.toolbarPosition === 'top' || props.toolbarPosition === 'bottom')
const layoutToolbarPosition = computed(() => {
  if (showAnnotationToolbar.value) return props.toolbarPosition
  if (props.reserveToolbarSpace) return 'bottom'
  return ''
})
const toolbarPlaceholderStyle = computed(() => {
  if (props.toolbarSpaceHeight > 0) {
    return {
      height: `${props.toolbarSpaceHeight}px`,
      minHeight: `${props.toolbarSpaceHeight}px`
    }
  }
  return null
})
const toolbarAnnotationBlocked = computed(() => imageUnavailable.value)
const annotationEnabled = computed(() => props.editable && showAnnotationToolbar.value && !imageUnavailable.value)
const resolvedPlaceholder = computed(() => resolvePlaceholderSource(props.placeholderUrl))
const resolvedImageRetryCount = computed(() => {
  const count = Number(props.imageRetryCount)
  if (!Number.isFinite(count) || count < 0) return 1
  return Math.floor(count)
})

function initCanvas () {
  destroyCanvas()
  imageLoadId += 1
  const loadId = imageLoadId
  if (!props.imageUrl) {
    loading.value = false
    imageUnavailable.value = true
    return
  }

  imageUnavailable.value = false
  loading.value = true
  loadSourceImage(props.imageUrl, 0, loadId)
}

function loadSourceImage (url, attempt, loadId) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    if (loadId !== imageLoadId) return
    const isPlaceholder = url === resolvedPlaceholder.value
    imageUnavailable.value = isPlaceholder
    resolvedImageUrl = url
    origW = img.naturalWidth
    origH = img.naturalHeight

    fabric.Object.prototype.objectCaching = false

    canvas = new fabric.Canvas(canvasEl.value, {
      width: origW,
      height: origH,
      selection: false,
      preserveObjectStacking: true,
      enableRetinaScaling: false
    })

    canvas.skipTargetFind = true
    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)
    canvas.on('object:added', syncUnsavedState)
    canvas.on('object:removed', syncUnsavedState)

    setTool(enabledTools.value[0])
    setupCanvasPointerOverride()
    syncCanvasInteractionState()
    loadAnnotations()
  }
  img.onerror = () => {
    if (loadId !== imageLoadId) return
    const placeholder = resolvedPlaceholder.value
    const isPlaceholder = url === placeholder
    if (!isPlaceholder && attempt < resolvedImageRetryCount.value) {
      loadSourceImage(url, attempt + 1, loadId)
      return
    }
    if (!isPlaceholder && placeholder && placeholder !== url) {
      loadSourceImage(placeholder, 0, loadId)
      return
    }
    loading.value = false
    imageUnavailable.value = true
    notify('error', '影像加载失败')
  }
  img.src = url
}

function reloadCanvas () {
  canvasRotation = 0
  zoomPercent.value = 100
  nextTick(() => {
    initCanvas()
  })
}

function bindWheelZoom () {
  const el = wrapper.value
  if (!el || !props.zoomEnabled) return
  el.addEventListener('wheel', onWheelZoom, { passive: false })
}

function unbindWheelZoom () {
  const el = wrapper.value
  if (!el) return
  el.removeEventListener('wheel', onWheelZoom)
}

function onWheelZoom (e) {
  if (!props.zoomEnabled) return
  e.preventDefault()
  e.stopPropagation()
  if (loading.value || !canvas) return
  const step = e.deltaY < 0 ? 10 : -10
  setZoomPercent(zoomPercent.value + step, getZoomOriginFromEvent(e))
}

function clampCurrentZoom () {
  if (!props.zoomEnabled) return
  setZoomPercent(zoomPercent.value)
}

function zoomByStep (step) {
  setZoomPercent(zoomPercent.value + step, getViewportCenterOrigin())
}

function getZoomOriginFromEvent (e) {
  const scroller = canvasScroll.value
  const host = canvasHost.value
  if (!scroller || !host || !e) return getViewportCenterOrigin()
  const scrollerRect = scroller.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  return {
    mouseX: e.clientX - scrollerRect.left,
    mouseY: e.clientY - scrollerRect.top,
    ratioX: hostRect.width ? (e.clientX - hostRect.left) / hostRect.width : 0.5,
    ratioY: hostRect.height ? (e.clientY - hostRect.top) / hostRect.height : 0.5
  }
}

function getViewportCenterOrigin () {
  const scroller = canvasScroll.value
  const host = canvasHost.value
  if (!scroller || !host) return null
  const scrollerRect = scroller.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  const mouseX = scroller.clientWidth / 2
  const mouseY = scroller.clientHeight / 2
  return {
    mouseX,
    mouseY,
    ratioX: hostRect.width ? (scrollerRect.left + mouseX - hostRect.left) / hostRect.width : 0.5,
    ratioY: hostRect.height ? (scrollerRect.top + mouseY - hostRect.top) / hostRect.height : 0.5
  }
}

function preserveZoomOrigin (origin) {
  const scroller = canvasScroll.value
  const host = canvasHost.value
  if (!origin || !scroller || !host) return
  const scrollerRect = scroller.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  const hostLeft = hostRect.left - scrollerRect.left + scroller.scrollLeft
  const hostTop = hostRect.top - scrollerRect.top + scroller.scrollTop
  scroller.scrollLeft = hostLeft + origin.ratioX * host.offsetWidth - origin.mouseX
  scroller.scrollTop = hostTop + origin.ratioY * host.offsetHeight - origin.mouseY
}

function setZoomPercent (val, origin) {
  if (!props.zoomEnabled) {
    if (zoomPercent.value !== 100) {
      zoomPercent.value = 100
      fitCanvasToScreen()
    }
    return
  }
  const next = Math.round(Math.min(resolvedZoomMax.value, Math.max(resolvedZoomMin.value, val)))
  if (next === zoomPercent.value) return
  const zoomOrigin = origin || getViewportCenterOrigin()
  zoomPercent.value = next
  fitCanvasToScreen()
  nextTick(() => {
    preserveZoomOrigin(zoomOrigin)
  })
}

function bindPanEvents () {
  const el = canvasScroll.value
  if (!el) return
  el.addEventListener('mousedown', onPanMouseDown, true)
  el.addEventListener('contextmenu', onPanContextMenu)
}

function unbindPanEvents () {
  const el = canvasScroll.value
  if (el) {
    el.removeEventListener('mousedown', onPanMouseDown, true)
    el.removeEventListener('contextmenu', onPanContextMenu)
  }
  stopPanning()
}

function onPanContextMenu (e) {
  e.preventDefault()
}

function onPanMouseDown (e) {
  if (e.button !== 2) return
  e.preventDefault()
  e.stopPropagation()
  const scroller = canvasScroll.value
  if (!scroller) return
  isPanning.value = true
  panLastX = e.clientX
  panLastY = e.clientY
  if (canvas) {
    canvas.isDrawingMode = false
  }
  applyPanCursor()
  document.addEventListener('mousemove', onPanMouseMove)
  document.addEventListener('mouseup', onPanMouseUp)
}

function onPanMouseMove (e) {
  if (!isPanning.value) return
  const scroller = canvasScroll.value
  if (!scroller) return
  scroller.scrollLeft -= e.clientX - panLastX
  scroller.scrollTop -= e.clientY - panLastY
  panLastX = e.clientX
  panLastY = e.clientY
  applyPanCursor()
}

function onPanMouseUp () {
  stopPanning()
}

function stopPanning () {
  document.removeEventListener('mousemove', onPanMouseMove)
  document.removeEventListener('mouseup', onPanMouseUp)
  if (!isPanning.value) return
  isPanning.value = false
  clearPanCursor()
  syncCanvasInteractionState()
}

function applyPanCursor () {
  const cursor = 'move'
  const els = [
    wrapper.value,
    canvasScroll.value,
    canvas && canvas.upperCanvasEl,
    canvas && canvas.lowerCanvasEl,
    canvas && canvas.wrapperEl
  ]
  els.forEach((el) => {
    if (el) el.style.setProperty('cursor', cursor, 'important')
  })
  if (!canvas) return
  canvas.defaultCursor = cursor
  canvas.hoverCursor = cursor
  canvas.freeDrawingCursor = cursor
}

function clearPanCursor () {
  const els = [
    wrapper.value,
    canvasScroll.value,
    canvas && canvas.upperCanvasEl,
    canvas && canvas.lowerCanvasEl,
    canvas && canvas.wrapperEl
  ]
  els.forEach((el) => {
    if (el) el.style.removeProperty('cursor')
  })
}

function destroyCanvas () {
  if (canvas) {
    canvas.dispose()
    canvas = null
  }
  hasUnsaved.value = false
  baselineObjects = null
  resolvedImageUrl = ''
  if (canvasHost.value) {
    canvasHost.value.style.width = ''
    canvasHost.value.style.height = ''
  }
}

function fitCanvasToScreen (retry = 0) {
  const root = rootEl.value
  const host = canvasHost.value
  if (!canvas || !host || !root) return

  const toolbar = root.querySelector('.annotation-toolbar')
  const toolbarH = toolbar ? toolbar.offsetHeight : 0
  const maxW = root.clientWidth - 8
  const maxH = root.clientHeight - toolbarH - 8

  if (maxW < 80 || maxH < 80) {
    if (retry < 20) {
      fitRetryTimer = requestAnimationFrame(() => {
        fitCanvasToScreen(retry + 1)
      })
    }
    return
  }

  const isRotated = canvasRotation % 180 !== 0
  const displayW = isRotated ? origH : origW
  const displayH = isRotated ? origW : origH

  const fitScale = Math.min(1, maxW / displayW, maxH / displayH)
  displayScale = fitScale
  const scale = fitScale * (zoomPercent.value / 100)
  const container = canvas.wrapperEl

  host.style.width = `${displayW * scale}px`
  host.style.height = `${displayH * scale}px`
  host.style.position = 'relative'

  container.style.position = 'absolute'
  container.style.left = '50%'
  container.style.top = '50%'
  container.style.transformOrigin = 'center center'
  container.style.transform = `translate(-50%, -50%) rotate(${canvasRotation}deg) scale(${scale})`

  canvas.setWidth(origW)
  canvas.setHeight(origH)
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  canvas.renderAll()
  syncCanvasInteractionState()
}

function setupCanvasPointerOverride () {
  if (!canvas) return
  canvas.getPointer = function (e) {
    const event = (e && e.touches && e.touches[0]) ? e.touches[0] : e
    if (!event) return { x: 0, y: 0 }
    return getStandardPointer(event)
  }
}

function rotateCanvas (delta) {
  canvasRotation = ((canvasRotation + delta) % 360 + 360) % 360
  fitCanvasToScreen()
  setupCanvasPointerOverride()
}

function syncConfigState () {
  if (enabledTools.value.indexOf(currentTool.value) === -1) {
    currentTool.value = enabledTools.value[0] || 'pen'
  }
  if (colorOptions.value.indexOf(currentColor.value) === -1) {
    currentColor.value = colorOptions.value[0] || '#ef4444'
  }
  const widths = lineWidthOptions.value.map(item => item.value)
  if (widths.indexOf(currentLineWidth.value) === -1) {
    currentLineWidth.value = widths[0] || 3
  }
  if (canvas) {
    setTool(currentTool.value)
  }
}

function setTool (tool) {
  if (!tool || enabledTools.value.indexOf(tool) === -1) {
    tool = enabledTools.value[0]
  }
  if (!canvas || !annotationEnabled.value) {
    currentTool.value = tool || currentTool.value
    syncCanvasInteractionState()
    return
  }
  currentTool.value = tool
  canvas.isDrawingMode = tool === 'pen'
  if (tool === 'pen') {
    canvas.freeDrawingBrush.color = currentColor.value
    canvas.freeDrawingBrush.width = currentLineWidth.value
  }
  canvas.selection = false
  syncCanvasInteractionState()
}

function syncCanvasInteractionState () {
  if (!canvas) return
  if (isPanning.value) {
    canvas.isDrawingMode = false
    applyPanCursor()
    return
  }

  const enabled = annotationEnabled.value
  canvas.isDrawingMode = enabled && currentTool.value === 'pen'
  canvas.selection = false
  canvas.skipTargetFind = true

  const cursor = enabled ? 'crosshair' : 'default'
  canvas.defaultCursor = cursor
  canvas.hoverCursor = cursor
  canvas.freeDrawingCursor = cursor

  ;[canvas.upperCanvasEl, canvas.lowerCanvasEl].forEach((el) => {
    if (el) el.style.cursor = cursor
  })
}

function setColor (color) {
  currentColor.value = color
  if (canvas && canvas.isDrawingMode) {
    canvas.freeDrawingBrush.color = color
  }
}

function setLineWidth (val) {
  currentLineWidth.value = parseInt(val, 10)
  if (canvas && canvas.isDrawingMode) {
    canvas.freeDrawingBrush.width = currentLineWidth.value
  }
}

function undo () {
  if (!canvas || !annotationEnabled.value) return
  const objs = canvas.getObjects()
  if (!objs.length) return
  canvas.remove(objs[objs.length - 1])
  canvas.renderAll()
  syncUnsavedState()
}

function isRotated90or270 () {
  return canvasRotation % 180 !== 0
}

function getStandardPointer (e) {
  const rect = canvas.upperCanvasEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const visualScale = isRotated90or270()
    ? rect.width / origH
    : rect.width / origW

  const x = (e.clientX - cx) / visualScale
  const y = (e.clientY - cy) / visualScale

  const rad = -canvasRotation * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const lx = x * cos - y * sin + origW / 2
  const ly = x * sin + y * cos + origH / 2

  return {
    x: Math.max(0, Math.min(origW, lx)),
    y: Math.max(0, Math.min(origH, ly))
  }
}

function onMouseDown (opt) {
  if ((opt.e && opt.e.button !== 0) || isPanning.value) return
  if (!annotationEnabled.value || currentTool.value === 'pen') return
  const p = getStandardPointer(opt.e)
  startPoint = p
  isDrawing = true

  const opts = {
    left: p.x,
    top: p.y,
    fill: 'transparent',
    stroke: currentColor.value,
    strokeWidth: currentLineWidth.value,
    selectable: false,
    evented: false,
    strokeUniform: true
  }

  if (currentTool.value === 'rect') {
    activeShape = new fabric.Rect({ ...opts, width: 0, height: 0 })
  } else if (currentTool.value === 'circle') {
    activeShape = new fabric.Ellipse({
      ...opts,
      rx: 0,
      ry: 0,
      originX: 'center',
      originY: 'center',
      left: p.x,
      top: p.y
    })
  }
  canvas.add(activeShape)
}

function onMouseMove (opt) {
  if (!isDrawing || !activeShape) return
  const p = getStandardPointer(opt.e)

  if (currentTool.value === 'rect') {
    activeShape.set({
      left: Math.min(p.x, startPoint.x),
      top: Math.min(p.y, startPoint.y),
      width: Math.abs(p.x - startPoint.x),
      height: Math.abs(p.y - startPoint.y)
    })
  } else if (currentTool.value === 'circle') {
    const left = Math.min(p.x, startPoint.x)
    const top = Math.min(p.y, startPoint.y)
    const width = Math.abs(p.x - startPoint.x)
    const height = Math.abs(p.y - startPoint.y)
    activeShape.set({
      left: left + width / 2,
      top: top + height / 2,
      rx: width / 2,
      ry: height / 2
    })
  }
  canvas.renderAll()
}

function onMouseUp () {
  if (activeShape) {
    const tooSmall =
      (currentTool.value === 'rect' && activeShape.width < 4 && activeShape.height < 4) ||
      (currentTool.value === 'circle' && activeShape.rx < 2 && activeShape.ry < 2)
    if (tooSmall) {
      canvas.remove(activeShape)
    }
  }
  isDrawing = false
  activeShape = null
}

function setBackground (cb) {
  const finish = () => {
    loading.value = false
    syncUnsavedState()
    emit('loaded', getAnnotationPayload())
    cb && cb()
  }
  fabric.Image.fromURL(resolvedImageUrl || props.imageUrl, (fImg) => {
    if (!fImg || !canvas) {
      finish()
      imageUnavailable.value = true
      notify('error', '影像加载失败')
      return
    }
    fImg.set({ selectable: false, evented: false })
    canvas.setBackgroundImage(fImg, () => {
      canvas.renderAll()
      fitCanvasToScreen()
      finish()
    }, {
      scaleX: origW / fImg.width,
      scaleY: origH / fImg.height
    })
  }, { crossOrigin: 'anonymous' })
}

function loadAnnotations () {
  if (props.initialStoredPayload && props.initialStoredPayload.objects && props.initialStoredPayload.objects.length) {
    loadFabricObjects(props.initialStoredPayload.objects)
    return
  }

  const apiObjects = annotateListToFabricObjects(props.initialAnnotateList)
  if (apiObjects.length) {
    loadFabricObjects(apiObjects)
    return
  }

  baselineObjects = []
  setBackground()
}

function captureBaseline () {
  if (!canvas) {
    baselineObjects = []
    return
  }
  baselineObjects = canvas.toJSON(['selectable', 'evented']).objects || []
}

function loadFabricObjects (objects) {
  canvas.loadFromJSON({ objects }, () => {
    canvas.getObjects().forEach(o => {
      o.selectable = false
      o.evented = false
    })
    captureBaseline()
    setBackground()
  })
}

async function saveAnnotations () {
  if (!canvas || !annotationEnabled.value) return
  if (props.saveMode === 'image') {
    const result = await getAnnotatedImage()
    if (!result) {
      notify('error', '导出图片失败')
      return
    }
    persistAnnotationPayload()
    notify('success', '标注图片已保存')
    emit('save', result)
    syncUnsavedState()
    return
  }
  const json = persistAnnotationPayload()
  notify('success', '标注已保存')
  emit('save', {
    mode: 'json',
    json
  })
  syncUnsavedState()
}

function getAnnotationJson () {
  return getAnnotationPayload()
}

function getAnnotatedImageDataURL (options = {}) {
  if (!canvas) return ''
  const format = options.type || props.imageType || 'png'
  const quality = options.quality != null ? options.quality : props.imageQuality
  return canvas.toDataURL({
    format,
    quality,
    multiplier: options.multiplier || 1,
    enableRetinaScaling: false
  })
}

function getAnnotatedImageBlob (options = {}) {
  const dataURL = getAnnotatedImageDataURL(options)
  return dataURLToBlob(dataURL)
}

function getAnnotatedImageFile (filename, options = {}) {
  const blob = getAnnotatedImageBlob(options)
  const ext = (options.type || props.imageType) === 'jpeg' ? 'jpg' : 'png'
  const name = filename || `annotation-${props.storageKey || 'image'}.${ext}`
  return blobToFile(blob, name)
}

async function exportResult (options = {}) {
  if ((options.mode || props.saveMode) === 'image') {
    return getAnnotatedImage(options)
  }
  return {
    mode: 'json',
    json: getAnnotationPayload()
  }
}

async function getAnnotatedImage (options = {}) {
  if (!canvas) return null
  const dataURL = getAnnotatedImageDataURL(options)
  if (!dataURL) return null
  const blob = dataURLToBlob(dataURL)
  const file = blobToFile(
    blob,
    options.filename || `annotation-${props.storageKey || 'image'}.${(options.type || props.imageType) === 'jpeg' ? 'jpg' : 'png'}`
  )
  return {
    mode: 'image',
    file,
    blob,
    dataURL,
    json: getAnnotationPayload()
  }
}

function notify (type, text) {
  emit('message', { type, text })
  if (typeof props.messageFn === 'function') {
    props.messageFn(type, text)
  }
}

function requestConfirm (message) {
  if (typeof props.confirmFn === 'function') {
    return Promise.resolve(props.confirmFn(message))
  }
  return Promise.resolve(window.confirm(message))
}

function persistAnnotationPayload () {
  if (!canvas) return null
  const json = canvas.toJSON(['selectable', 'evented'])
  const payload = {
    objects: json.objects || [],
    origW,
    origH,
    savedAt: new Date().toISOString()
  }
  captureBaseline()
  return payload
}

function getAnnotationPayload () {
  if (!canvas) return null
  const json = canvas.toJSON(['selectable', 'evented'])
  return {
    objects: json.objects || [],
    origW,
    origH
  }
}

function syncUnsavedState () {
  nextTick(() => {
    hasUnsaved.value = hasUnsavedChanges()
  })
}

function hasUnsavedChanges () {
  if (!canvas || loading.value) return false
  const current = canvas.toJSON(['selectable', 'evented']).objects || []
  const baseline = baselineObjects || []
  return JSON.stringify(current) !== JSON.stringify(baseline)
}

async function clearAnnotations () {
  if (!canvas || !annotationEnabled.value || canvas.getObjects().length === 0) return
  const ok = await requestConfirm('确定清除所有标注吗？')
  if (!ok) return
  canvas.getObjects().slice().forEach(o => canvas.remove(o))
  canvas.renderAll()
  notify('success', '已清除标注')
  emit('clear')
  syncUnsavedState()
}

function onKeyDown (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (!props.showUndoButton) return
    e.preventDefault()
    undo()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (!props.showSaveButton) return
    e.preventDefault()
    saveAnnotations()
  }
}

function onWindowResize () {
  fitCanvasToScreen()
}

watch(() => props.imageUrl, () => {
  reloadCanvas()
})

watch(() => props.editable, () => {
  syncCanvasInteractionState()
})

watch(() => props.toolbarPosition, () => {
  syncCanvasInteractionState()
})

watch(() => props.toolbarSpaceHeight, () => {
  nextTick(() => {
    fitCanvasToScreen()
  })
})

watch(() => props.colors, () => {
  syncConfigState()
})

watch(() => props.lineWidths, () => {
  syncConfigState()
})

watch(() => props.tools, () => {
  syncConfigState()
})

watch(() => props.zoomEnabled, (val) => {
  if (!val) {
    zoomPercent.value = 100
    fitCanvasToScreen()
    unbindWheelZoom()
  } else {
    nextTick(() => bindWheelZoom())
  }
})

watch(() => props.zoomMinPercent, () => {
  clampCurrentZoom()
})

watch(() => props.zoomMaxPercent, () => {
  clampCurrentZoom()
})

syncConfigState()

onMounted(() => {
  initCanvas()
  document.addEventListener('keydown', onKeyDown)
  nextTick(() => {
    bindWheelZoom()
    bindPanEvents()
  })
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    resizeObserver = new ResizeObserver(() => {
      fitCanvasToScreen()
    })
    resizeObserver.observe(rootEl.value)
  } else {
    window.addEventListener('resize', onWindowResize)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  unbindWheelZoom()
  unbindPanEvents()
  if (fitRetryTimer) {
    cancelAnimationFrame(fitRetryTimer)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', onWindowResize)
  destroyCanvas()
})

defineExpose({
  getAnnotationJson,
  getAnnotationPayload,
  getAnnotatedImageFile,
  getAnnotatedImageBlob,
  getAnnotatedImageDataURL,
  getAnnotatedImage,
  exportResult,
  persistAnnotationPayload,
  hasUnsavedChanges,
  undo,
  clearAnnotations,
  rotateCanvas
})
</script>



<style lang="less" scoped>
.annotation-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #1a1d23;
  border-radius: 0px;
  overflow: hidden;
}

.annotation-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 10px;
  background: #13151a;
  flex-shrink: 0;
  position: relative;
}

.toolbar-block-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.55);
  cursor: not-allowed;
}

.annotation-toolbar--placeholder {
  padding: 0;
  background: transparent;
  border: none !important;
  min-height: 40px;
  box-sizing: border-box;
}

.layout-toolbar-top .annotation-toolbar {
  order: 1;
  border-bottom: 1px solid #2a2d35;
}

.layout-toolbar-top .annotation-wrapper {
  order: 2;
}

.layout-toolbar-bottom .annotation-toolbar {
  order: 2;
  border-top: 1px solid #2a2d35;
}

.layout-toolbar-bottom .annotation-wrapper {
  order: 1;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.divider {
  width: 1px;
  height: 24px;
  background: #2a2d35;
  margin: 0 6px;
  flex-shrink: 0;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b90a0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  line-height: 1;
  outline: none;

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: #22262f;
    color: #c8cad4;
  }

  &.active {
    background: #1e3a5f;
    color: #5ba3f5;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.save-btn {
    margin-left: auto;
    background: #1a4731;
    color: #4caf7d;

    &:hover:not(:disabled) {
      background: #1f5a3c;
      color: #5dc98e;
    }
    &.has-unsaved {
      color: #ef4444;
    }
    &.has-unsaved svg {
      color: #ef4444;
      stroke: #ef4444;
    }
  }

  &.clear-btn {
    color: #e05c5c;

    &:hover:not(:disabled) {
      background: #3a1a1a;
      color: #f07070;
    }
  }

  &.undo-btn {
    color: #8b90a0;
  }
}

.color-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-label {
  font-size: 12px;
  color: #555a6b;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.15);
  }

  &.selected {
    border-color: #fff;
  }

  &.is-white {
    border: 1px solid #444;
  }

  &.is-white.selected {
    border-color: #fff;
  }
}

.width-select {
  background: #22262f;
  border: 1px solid #2a2d35;
  border-radius: 6px;
  color: #c8cad4;
  font-size: 12px;
  padding: 4px 6px;
  cursor: pointer;
  outline: none;
  height: 28px;
}

.annotation-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  position: relative;
  overflow: hidden;
  background: #1a1d23;

  &.is-panning {
    cursor: move !important;
    user-select: none;

    :deep(*) {
      cursor: move !important;
    }
  }
}

.canvas-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1d23;
  }

  &::-webkit-scrollbar-corner {
    background: #1a1d23;
  }

  &::-webkit-scrollbar-thumb {
    background: #848985;
    border-radius: 4px;
  }
}

.annotation-wrapper--view-only {
  .canvas-host,
  :deep(.canvas-container),
  :deep(canvas) {
    cursor: default !important;
  }
}

.canvas-host {
  position: relative;
  flex-shrink: 0;
  margin: auto;
}

.page-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 2;
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}

.zoom-badge {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
}

.zoom-percent-text {
  min-width: 42px;
  text-align: center;
}

.zoom-ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: #69c0ff;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.canvas-loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 29, 35, 0.88);

  .mark-image-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #2a2d35;
    border-top-color: #5ba3f5;
    border-radius: 50%;
    animation: mark-image-spin 0.8s linear infinite;
  }

  .mark-image-spinner-text {
    color: #c8cad4;
    margin-top: 8px;
    font-size: 12px;
  }
}

@keyframes mark-image-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
