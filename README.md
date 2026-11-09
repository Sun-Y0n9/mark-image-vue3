# @mark-image/vue3

简体中文 | [English](./README.en.md)

Vue 3 图片标注组件，行为与 Vue 2 版 `@mark-image/vue` 对应。在图片上用铅笔、方框、圆圈做标注，支持缩放、拖移、旋转，并可导出标注 JSON 或叠加标注后的新图。

依赖：`vue@3`、`fabric@4`。

## 功能

- 铅笔、方框、圆圈（可按需启用）
- 画笔颜色、线宽可配置
- 撤销、清除、旋转、保存按钮可单独开关
- 滚轮缩放（可开关，上下限可配），右键拖移图片
- 保存标注 JSON，或将原图与标注合成新图
- 通过组件方法获取 JSON / File / Blob / dataURL
- 用已有 JSON 回显标注

## 安装

```bash
npm install @mark-image/vue3 fabric@4 vue@3
```

## 快速开始

全局注册后使用 `<annotation-canvas>` 或 `<mark-image>`：

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
      // saveMode=json 时：{ mode: 'json', json }
      // saveMode=image 时：{ mode: 'image', file, blob, dataURL, json }
      console.log(result)
    }
  }
}
</script>
```

也可以局部引入：

```js
import { AnnotationCanvas } from '@mark-image/vue3'

export default {
  components: { AnnotationCanvas }
}
```

## 常用配置

```vue
<annotation-canvas
  ref="canvas"
  :image-url="imageUrl"
  canvas-id="page-1"
  save-mode="json"
  :colors="['#ef4444', '#3b82f6']"
  :line-widths="[{ value: 2, label: '细' }, { value: 5, label: '粗' }]"
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

## 获取标注结果

不显示保存按钮时，也可以通过 `ref` 主动取出数据：

```js
const json = this.$refs.canvas.getAnnotationJson()
const file = this.$refs.canvas.getAnnotatedImageFile('marked.png')
const blob = this.$refs.canvas.getAnnotatedImageBlob()
const dataURL = this.$refs.canvas.getAnnotatedImageDataURL()
const result = await this.$refs.canvas.exportResult()
```

`saveMode` 为 `json` 时，`exportResult()` 返回 `{ mode: 'json', json }`。  
`saveMode` 为 `image` 时，返回 `{ mode: 'image', file, blob, dataURL, json }`。

## 回显已有标注

```vue
<annotation-canvas
  :image-url="imageUrl"
  canvas-id="page-1"
  :initial-stored-payload="savedJson"
/>
```

`savedJson` 与 `getAnnotationJson()` 的返回值一致，形如 `{ objects: [ /* fabric 对象 */ ] }`。

图片已经打开时，调用 `loadAnnotationJson(savedJson)` 把标注画到当前图片上。参数也可以是 `objects` 数组，或 JSON 字符串。

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| imageUrl | String | 必填 | 图片地址 |
| canvasId | String | 必填 | 画布标识。同一页多个实例需互不相同，并写入默认导出文件名，如 `annotation-page-1.png` |
| saveMode | String | `'json'` | `json`：保存标注数据；`image`：原图叠加标注后导出新图 |
| imageType | String | `'png'` | 导出图片格式，`png` 或 `jpeg` |
| imageQuality | Number | `0.92` | `jpeg` 质量，范围 `0 ~ 1` |
| colors | String[] | 见下方默认色 | 工具栏画笔颜色 |
| lineWidths | Array | `2 / 3 / 5 / 8` | 线宽选项，只能从这四档中选 |
| tools | String[] | `['pen', 'rect', 'circle']` | 启用的工具，至少一个有效项 |
| showUndoButton | Boolean | `true` | 是否显示撤销 |
| showClearButton | Boolean | `true` | 是否显示清除 |
| showRotateButtons | Boolean | `true` | 是否显示旋转 |
| showSaveButton | Boolean | `false` | 是否显示保存按钮 |
| zoomEnabled | Boolean | `true` | 是否开启缩放 |
| zoomMinPercent | Number | `30` | 缩放下限（百分比） |
| zoomMaxPercent | Number | `400` | 缩放上限（百分比） |
| initialStoredPayload | Object | `null` | 用 `getAnnotationJson()` 的结果回显 |
| initialAnnotateList | Array | `[]` | 简易坐标列表回显，见下方说明 |
| pageLabel | String | `''` | 画布左下角文字 |
| editable | Boolean | `true` | 是否允许标注 |
| toolbarPosition | String | `'bottom'` | 工具栏位置：`top` / `bottom` / `''`（不显示） |
| reserveToolbarSpace | Boolean | `false` | 不显示工具栏时是否保留等高空白 |
| toolbarSpaceHeight | Number | `0` | 上述空白的高度（px） |
| imageRetryCount | Number | `1` | 原图加载失败后的重新加载次数，用完后才显示占位图 |
| placeholderUrl | String | 内置占位图 | 占位图。可填图片 URL、`data:` 地址或纯 base64，不传则用内置图 |
| confirmFn | Function | `null` | 自定义确认，返回 truthy 或 Promise |
| messageFn | Function | `null` | 自定义提示，签名 `(type, text)` |

### 加载失败

`imageRetryCount` 是原图失败后的额外加载次数，默认 `1`。这些次数用完后才显示 `placeholderUrl`。设为 `0` 则失败后直接显示占位图。

`placeholderUrl` 三种写法都可以：

```js
placeholderUrl: 'https://example.com/fallback.png'
placeholderUrl: 'data:image/png;base64,iVBORw0KGgo...'
placeholderUrl: 'iVBORw0KGgo...'
```

### 颜色

默认 6 色：

```js
['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']
```

### 线宽

只能是 `2`、`3`、`5`、`8` 中的任意几个。可写数字，或 `{ value, label }` 自定义文案：

```js
:line-widths="[2, 8]"
:line-widths="[{ value: 3, label: '常规' }, { value: 8, label: '加粗' }]"
```

未传或全部无效时，回退为四档默认文案：`细 2px`、`中 3px`、`粗 5px`、`极粗 8px`。

### 工具

可选值：`pen`（铅笔）、`rect`（方框）、`circle`（圆圈）。

### 简易坐标回显

`initialAnnotateList` 每项包含 `coordinate` 和 `style`。有 `startX / endX` 的画成线，有 `width / height` 的画成矩形。若同时传了 `initialStoredPayload`，优先使用后者。

```js
[
  {
    coordinate: { startX: 10, startY: 20, endX: 80, endY: 90 },
    style: { stroke: '#1890ff', strokeWidth: 2 }
  },
  {
    coordinate: { x: 30, y: 40, width: 100, height: 60 },
    style: { stroke: '#f5222d', strokeWidth: 2 }
  }
]
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `getAnnotationJson()` | 当前标注 JSON |
| `loadAnnotationJson(payload)` | 把 JSON 画到当前图片上。图片未就绪时返回 `false` |
| `getAnnotationPayload()` | 同 `getAnnotationJson()` |
| `getAnnotatedImageFile(filename?, options?)` | 叠加标注后的 `File` |
| `getAnnotatedImageBlob(options?)` | 叠加标注后的 `Blob` |
| `getAnnotatedImageDataURL(options?)` | 叠加标注后的 dataURL |
| `getAnnotatedImage(options?)` | `{ mode: 'image', file, blob, dataURL, json }` |
| `exportResult(options?)` | 按当前 `saveMode` 导出 |
| `persistAnnotationPayload()` | 取出 JSON，并标记为已保存 |
| `hasUnsavedChanges()` | 是否有未保存改动 |
| `undo()` | 撤销上一步 |
| `clearAnnotations()` | 清除全部标注 |
| `rotateCanvas(delta)` | 旋转，`delta` 一般为 `90` 或 `-90` |

图片导出的 `options`：`{ type: 'png', quality: 0.92, multiplier: 1 }`。

## 事件

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| save | `{ mode, json }` 或 `{ mode, file, blob, dataURL, json }` | 点击保存按钮 |
| clear | — | 清除完成 |
| loaded | json | 图片和标注加载完成 |
| message | `{ type, text }` | 组件内部提示，如保存成功、加载失败 |

## 本地演示

需要 Node.js 18 或以上。

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173/ ，可在页面顶部切换保存方式、工具、线宽、按钮和缩放范围。

## 构建

```bash
npm run build
```

产物在 `dist/`：

- `mark-image.js`：ESM
- `mark-image.cjs`：CommonJS
- `mark-image.umd.js`：浏览器 UMD，全局名 `MarkImage`

组件样式打进脚本，使用方不用再单独引入 CSS。
