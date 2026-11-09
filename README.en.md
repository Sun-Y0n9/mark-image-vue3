# @mark-image/vue3

[简体中文](./README.md) | English

Vue 3 image annotation component. It matches the behavior of the Vue 2 package `@mark-image/vue`. Draw with a pen, rectangles, and circles on an image. Supports zoom, pan, and rotation, and can export annotation JSON or a new image with the marks composited on top.

Dependencies: `vue@3`, `fabric@4`.

Live demo: https://sun-y0n9.github.io/mark-image-vue3/

## Features

- Pen, rectangle, and circle (each can be enabled as needed)
- Configurable stroke color and line width
- Undo, clear, rotate, and save buttons can be toggled individually
- Mouse-wheel zoom (can be disabled; min and max are configurable) and right-click pan
- Save annotation JSON, or composite the original image with annotations into a new image
- Read JSON / File / Blob / dataURL through component methods
- Restore annotations from previously saved JSON

## Installation

```bash
npm install @mark-image/vue3 fabric@4 vue@3
```

## Quick start

Register it on the app, then use `<annotation-canvas>` or `<mark-image>`:

```js
import { createApp } from 'vue'
import MarkImage from '@mark-image/vue3'
import App from './App.vue'

const app = createApp(App)
app.use(MarkImage)
app.mount('#app')
```

```vue
<template>
  <annotation-canvas
    ref="canvas"
    :image-url="imageUrl"
    canvas-id="page-1"
    @save="onSave"
  />
</template>

<script>
export default {
  data () {
    return {
      imageUrl: 'https://example.com/demo.jpg'
    }
  },
  methods: {
    onSave (result) {
      // saveMode=json:  { mode: 'json', json }
      // saveMode=image: { mode: 'image', file, blob, dataURL, json }
      console.log(result)
    }
  }
}
</script>
```

You can also import it locally:

```js
import { AnnotationCanvas } from '@mark-image/vue3'

export default {
  components: { AnnotationCanvas }
}
```

## Common options

```vue
<annotation-canvas
  ref="canvas"
  :image-url="imageUrl"
  canvas-id="page-1"
  save-mode="json"
  :colors="['#ef4444', '#3b82f6']"
  :line-widths="[{ value: 2, label: 'Thin' }, { value: 5, label: 'Thick' }]"
  :tools="['pen', 'rect']"
  :show-undo-button="true"
  :show-clear-button="true"
  :show-rotate-buttons="true"
  :show-save-button="true"
  :zoom-enabled="true"
  :zoom-min-percent="30"
  :zoom-max-percent="400"
  @save="onSave"
/>
```

## Reading annotation results

```js
const json = this.$refs.canvas.getAnnotationJson()
const file = this.$refs.canvas.getAnnotatedImageFile('marked.png')
const blob = this.$refs.canvas.getAnnotatedImageBlob()
const dataURL = this.$refs.canvas.getAnnotatedImageDataURL()
const result = await this.$refs.canvas.exportResult()
```

When `saveMode` is `json`, `exportResult()` returns `{ mode: 'json', json }`.  
When `saveMode` is `image`, it returns `{ mode: 'image', file, blob, dataURL, json }`.

## Restoring saved annotations

```vue
<annotation-canvas
  :image-url="imageUrl"
  canvas-id="page-1"
  :initial-stored-payload="savedJson"
/>
```

`savedJson` has the same shape as `getAnnotationJson()`: `{ objects: [ /* fabric objects */ ] }`.

After the image is open, call `loadAnnotationJson(savedJson)` to draw those marks on the current image. The argument can also be an `objects` array or a JSON string.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| imageUrl | String | required | Image URL |
| canvasId | String | required | Canvas id. Must be unique per page, and is used in the default export filename, such as `annotation-page-1.png` |
| saveMode | String | `'json'` | `json`: save annotation data. `image`: export a new image with annotations composited on the original |
| imageType | String | `'png'` | Export format, `png` or `jpeg` |
| imageQuality | Number | `0.92` | `jpeg` quality, from `0` to `1` |
| colors | String[] | see defaults below | Toolbar stroke colors |
| lineWidths | Array | `2 / 3 / 5 / 8` | Line-width options. Only these four values are allowed |
| tools | String[] | `['pen', 'rect', 'circle']` | Enabled tools. At least one valid tool is required |
| showUndoButton | Boolean | `true` | Show the undo button |
| showClearButton | Boolean | `true` | Show the clear button |
| showRotateButtons | Boolean | `true` | Show the rotate buttons |
| showSaveButton | Boolean | `false` | Show the save button |
| zoomEnabled | Boolean | `true` | Enable zoom |
| zoomMinPercent | Number | `30` | Minimum zoom (percent) |
| zoomMaxPercent | Number | `400` | Maximum zoom (percent) |
| initialStoredPayload | Object | `null` | Restore from a `getAnnotationJson()` result |
| initialAnnotateList | Array | `[]` | Restore from a simple coordinate list. See below |
| pageLabel | String | `''` | Text shown at the bottom-left of the canvas |
| editable | Boolean | `true` | Allow annotation |
| toolbarPosition | String | `'bottom'` | Toolbar position: `top`, `bottom`, or `''` (hidden) |
| reserveToolbarSpace | Boolean | `false` | Keep an equal-height blank area when the toolbar is hidden |
| toolbarSpaceHeight | Number | `0` | Height of that blank area, in pixels |
| imageRetryCount | Number | `1` | How many times to reload the source image after a failure, before the placeholder is shown |
| placeholderUrl | String | built-in placeholder | Placeholder image. Accepts an image URL, a `data:` URL, or a raw base64 string. The built-in image is used when omitted |
| confirmFn | Function | `null` | Custom confirm. Return a truthy value or a Promise |
| messageFn | Function | `null` | Custom message. Signature: `(type, text)` |

### Load failure

`imageRetryCount` is the number of extra loads after the source image fails. The default is `1`. The `placeholderUrl` is shown only after those retries are used up. Set it to `0` to show the placeholder immediately.

`placeholderUrl` accepts any of these:

```js
placeholderUrl: 'https://example.com/fallback.png'
placeholderUrl: 'data:image/png;base64,iVBORw0KGgo...'
placeholderUrl: 'iVBORw0KGgo...'
```

### Colors

```js
['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']
```

### Line width

Only `2`, `3`, `5`, and `8` are accepted. Use a number, or `{ value, label }` for custom text. If the prop is omitted or every value is invalid, it falls back to `细 2px`, `中 3px`, `粗 5px`, and `极粗 8px`.

### Tools

Allowed values: `pen`, `rect`, and `circle`.

### Simple coordinate restore

Items with `startX / endX` are drawn as lines. Items with `width / height` are drawn as rectangles. If `initialStoredPayload` is also provided, that payload is used.

## Methods

| Method | Description |
| --- | --- |
| `getAnnotationJson()` | Current annotation JSON |
| `loadAnnotationJson(payload)` | Draw JSON onto the current image. Returns `false` when the image is not ready |
| `getAnnotationPayload()` | Same as `getAnnotationJson()` |
| `getAnnotatedImageFile(filename?, options?)` | Composited image as a `File` |
| `getAnnotatedImageBlob(options?)` | Composited image as a `Blob` |
| `getAnnotatedImageDataURL(options?)` | Composited image as a dataURL |
| `getAnnotatedImage(options?)` | `{ mode: 'image', file, blob, dataURL, json }` |
| `exportResult(options?)` | Export according to the current `saveMode` |
| `persistAnnotationPayload()` | Read the JSON and mark it as saved |
| `hasUnsavedChanges()` | Whether there are unsaved changes |
| `undo()` | Undo the last step |
| `clearAnnotations()` | Clear all annotations |
| `rotateCanvas(delta)` | Rotate. `delta` is usually `90` or `-90` |

Image export `options`: `{ type: 'png', quality: 0.92, multiplier: 1 }`.

## Events

| Event | Payload | Description |
| --- | --- | --- |
| save | `{ mode, json }` or `{ mode, file, blob, dataURL, json }` | Save button clicked |
| clear | — | Clear finished |
| loaded | json | Image and annotations finished loading |
| message | `{ type, text }` | Internal notice, such as save success or load failure |

## Local demo

Node.js 18 or newer is required.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173/ . The top of the page can switch save mode, tools, line widths, buttons, and the zoom range.

## Build

```bash
npm run build
```

Output in `dist/`:

- `mark-image.js`: ESM
- `mark-image.cjs`: CommonJS
- `mark-image.umd.js`: browser UMD, global name `MarkImage`

Component CSS is injected by the script. Consumers do not import a separate stylesheet.
