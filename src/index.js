import AnnotationCanvas from './components/AnnotationCanvas.vue'
import { annotateListToFabricObjects } from './utils/annotateList'
import { DEFAULT_PLACEHOLDER, resolvePlaceholderSource } from './utils/placeholder'
import {
  DEFAULT_COLORS,
  DEFAULT_LINE_WIDTH_OPTIONS,
  DEFAULT_TOOLS,
  ALLOWED_LINE_WIDTHS,
  ALLOWED_TOOLS
} from './utils/config'

function install (app) {
  if (install.installed) return
  install.installed = true
  app.component('AnnotationCanvas', AnnotationCanvas)
  app.component('MarkImage', AnnotationCanvas)
}

const plugin = {
  install,
  AnnotationCanvas
}

export {
  AnnotationCanvas,
  annotateListToFabricObjects,
  DEFAULT_PLACEHOLDER,
  resolvePlaceholderSource,
  DEFAULT_COLORS,
  DEFAULT_LINE_WIDTH_OPTIONS,
  DEFAULT_TOOLS,
  ALLOWED_LINE_WIDTHS,
  ALLOWED_TOOLS,
  install
}

export default plugin
