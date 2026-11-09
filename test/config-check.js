// 先执行 npm run dev，再打开 /test/config-check.html
import { createApp, h, nextTick } from 'vue'
import App from '../demo/App.vue'
import MarkImage, { AnnotationCanvas, resolvePlaceholderSource, DEFAULT_PLACEHOLDER } from '../src'
import demoImage from '../demo/demp.jpg'

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PNG_DATA = `data:image/png;base64,${PNG_1X1}`
const MISSING = 'http://127.0.0.1:5173/__missing_image__.jpg'
const stage = document.querySelector('#stage')
const results = []

function assert (cond, message) {
  if (!cond) throw new Error(message || '断言失败')
}

function texts (root, selector) {
  return [...root.querySelectorAll(selector)].map(el => el.textContent.replace(/\s+/g, ' ').trim())
}

function canvasSize (root) {
  const canvas = root.querySelector('canvas')
  if (!canvas) return null
  return { w: canvas.width, h: canvas.height }
}

function mount (props) {
  const host = document.createElement('div')
  host.style.cssText = 'width:960px;height:420px;margin:8px 0;'
  stage.appendChild(host)
  const events = { save: [], clear: [], loaded: [], message: [] }
  const app = createApp({
    render () {
      return h(AnnotationCanvas, {
        imageUrl: demoImage,
        canvasId: 'config-check',
        ...props,
        onSave: (payload) => events.save.push(payload),
        onClear: () => events.clear.push(true),
        onLoaded: (payload) => events.loaded.push(payload),
        onMessage: (payload) => events.message.push(payload)
      })
    }
  })
  app.mount(host)
  const root = host.querySelector('.annotation-canvas')
  return {
    host,
    app,
    events,
    root,
    exposed: root.__vueParentComponent.exposed
  }
}

function unmount (ctx) {
  ctx.app.unmount()
  ctx.host.remove()
}

async function withCanvas (props, fn) {
  const ctx = mount(props)
  try {
    return await fn(ctx)
  } finally {
    unmount(ctx)
  }
}

function waitFor (pred, ms = 8000) {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const tick = () => {
      let value
      try {
        value = pred()
      } catch (error) {
        value = undefined
      }
      if (value) return resolve(value)
      if (performance.now() - start > ms) return reject(new Error('等待超时'))
      setTimeout(tick, 40)
    }
    tick()
  })
}

async function untilLoaded (ctx) {
  await waitFor(() => ctx.events.loaded.length)
  await nextTick()
}

async function test (name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail: detail || '' })
  } catch (error) {
    results.push({ name, ok: false, detail: error && error.message ? error.message : String(error) })
  }
}

function countImageSrc (fn) {
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
  const urls = []
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: desc.enumerable,
    get () {
      return desc.get.call(this)
    },
    set (value) {
      urls.push(String(value))
      desc.set.call(this, value)
    }
  })
  return Promise.resolve()
    .then(fn)
    .then((value) => ({ value, urls }))
    .finally(() => {
      Object.defineProperty(HTMLImageElement.prototype, 'src', desc)
    })
}

function missingCount (urls) {
  return urls.filter(url => url.includes('__missing_image__')).length
}

await test('占位图解析：空值、URL、data、纯 base64', async () => {
  assert(resolvePlaceholderSource('') === DEFAULT_PLACEHOLDER, '空字符串应回退内置图')
  assert(resolvePlaceholderSource('   ') === DEFAULT_PLACEHOLDER, '空白应回退内置图')
  assert(resolvePlaceholderSource('https://example.com/a.png') === 'https://example.com/a.png', 'https 应原样使用')
  assert(resolvePlaceholderSource(PNG_DATA) === PNG_DATA, 'data URL 应原样使用')
  assert(resolvePlaceholderSource(PNG_1X1) === PNG_DATA, '纯 base64 应补成 png data URL')
  assert(resolvePlaceholderSource('/local/fallback.png') === '/local/fallback.png', '普通路径应原样使用')
})

await test('默认工具栏：三个工具、六色、四档线宽、按钮和页签', async () => {
  await withCanvas({ pageLabel: '第 1 页', showSaveButton: true }, async (ctx) => {
    await untilLoaded(ctx)
    const labels = texts(ctx.root, '.tool-group .tool-btn')
    assert(labels.join(',') === '铅笔,方框,圆圈', `工具是 ${labels.join(',')}`)
    assert(ctx.root.querySelectorAll('.color-swatch').length === 6, '默认应有 6 个颜色')
    const widths = texts(ctx.root, '.width-select option')
    assert(widths.join('|') === '细 2px|中 3px|粗 5px|极粗 8px', `线宽是 ${widths.join('|')}`)
    assert(texts(ctx.root, '.undo-btn').length === 1, '应显示撤销')
    assert(texts(ctx.root, '.clear-btn').length === 1, '应显示清除')
    assert(texts(ctx.root, '.tool-btn').some(text => text === '左转'), '应显示左转')
    assert(ctx.root.querySelector('.save-btn').style.display !== 'none', '保存按钮应可见')
    assert(ctx.root.querySelector('.page-badge').textContent.includes('第 1 页'), '页签文字不对')
    assert(ctx.root.classList.contains('layout-toolbar-bottom'), '默认工具栏应在底部')
    assert(ctx.root.querySelector('.zoom-badge'), '默认应显示缩放')
    const size = canvasSize(ctx.root)
    assert(size && size.w > 1 && size.h > 1, `原图尺寸异常 ${JSON.stringify(size)}`)
  })
})

await test('tools / colors / lineWidths 过滤与回退', async () => {
  await withCanvas({
    tools: ['nope', 'circle', 'circle'],
    colors: [' #112233 ', '', null],
    lineWidths: [{ value: 3, label: '常规' }, { value: 9, label: '无效' }, 8, 8]
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(texts(ctx.root, '.tool-group .tool-btn').join(',') === '圆圈', '非法工具应被丢掉，重复项只留一个')
    assert(ctx.root.querySelector('.tool-btn.active').textContent.includes('圆圈'), '唯一工具应处于选中')
    assert(ctx.root.querySelectorAll('.color-swatch').length === 1, '空白颜色应被过滤')
    const bg = getComputedStyle(ctx.root.querySelector('.color-swatch')).backgroundColor
    assert(bg === 'rgb(17, 34, 51)', `颜色解析为 ${bg}`)
    assert(texts(ctx.root, '.width-select option').join('|') === '常规|极粗 8px', '非法线宽应丢弃，自定义文案应保留')
  })

  await withCanvas({ tools: ['bad'], colors: [], lineWidths: [1, 4] }, async (ctx) => {
    await untilLoaded(ctx)
    assert(texts(ctx.root, '.tool-group .tool-btn').join(',') === '铅笔,方框,圆圈', '无有效工具应回退三项')
    assert(ctx.root.querySelectorAll('.color-swatch').length === 6, '无有效颜色应回退六色')
    assert(texts(ctx.root, '.width-select option').length === 4, '无有效线宽应回退四档')
  })
})

await test('隐藏按钮、关闭缩放、工具栏移到顶部', async () => {
  await withCanvas({
    toolbarPosition: 'top',
    showUndoButton: false,
    showClearButton: false,
    showRotateButtons: false,
    showSaveButton: false,
    zoomEnabled: false
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(ctx.root.classList.contains('layout-toolbar-top'), '工具栏应在顶部')
    assert(!ctx.root.querySelector('.undo-btn'), '撤销应隐藏')
    assert(!ctx.root.querySelector('.clear-btn'), '清除应隐藏')
    assert(!texts(ctx.root, '.tool-btn').some(text => text === '左转' || text === '右转'), '旋转应隐藏')
    const saveBtn = ctx.root.querySelector('.save-btn')
    assert(saveBtn && saveBtn.style.display === 'none', '关闭保存按钮后应隐藏')
    assert(!ctx.root.querySelector('.zoom-badge'), '关闭缩放后不应显示缩放条')
  })
})

await test('editable 为 false 时禁止标注，旋转和缩放仍可用', async () => {
  await withCanvas({ editable: false, showSaveButton: true }, async (ctx) => {
    await untilLoaded(ctx)
    assert(ctx.root.querySelector('.annotation-wrapper').classList.contains('annotation-wrapper--view-only'), '应有只读样式')
    const enabled = [...ctx.root.querySelectorAll('.tool-btn')]
      .filter(button => !button.disabled)
      .map(button => button.textContent.replace(/\s+/g, ' ').trim())
    assert(enabled.join(',') === '左转,右转', `只读时仍可点的按钮是 ${enabled.join(',')}`)
    assert(ctx.root.querySelector('.width-select').disabled, '线宽应禁用')
    assert(ctx.root.querySelector('.zoom-badge'), '只读时仍应显示缩放')
  })
})

await test('不显示工具栏时保留指定高度', async () => {
  await withCanvas({
    toolbarPosition: '',
    reserveToolbarSpace: true,
    toolbarSpaceHeight: 48
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(!ctx.root.querySelector('.tool-group'), '不应渲染工具按钮')
    const placeholder = ctx.root.querySelector('.annotation-toolbar--placeholder')
    assert(placeholder, '应保留工具栏占位')
    const height = Math.round(placeholder.getBoundingClientRect().height)
    assert(height === 48, `占位高度是 ${height}`)
  })
})

await test('缩放上下限会夹住当前比例', async () => {
  await withCanvas({ zoomMinPercent: 80, zoomMaxPercent: 110 }, async (ctx) => {
    await untilLoaded(ctx)
    const buttons = ctx.root.querySelectorAll('.zoom-ctrl-btn')
    const minus = buttons[0]
    const plus = buttons[1]
    const read = () => ctx.root.querySelector('.zoom-percent-text').textContent.trim()
    plus.click()
    await nextTick()
    assert(read() === '110%', `第一次放大后是 ${read()}`)
    assert(plus.disabled, '到达上限后加号应禁用')
    minus.click()
    minus.click()
    minus.click()
    await nextTick()
    assert(read() === '80%', `缩小到下限后是 ${read()}`)
    assert(minus.disabled, '到达下限后减号应禁用')
  })

  await withCanvas({ zoomMinPercent: 5, zoomMaxPercent: 400 }, async (ctx) => {
    await untilLoaded(ctx)
    const down = ctx.root.querySelector('.zoom-ctrl-btn')
    for (let i = 0; i < 20 && !down.disabled; i += 1) down.click()
    await nextTick()
    const percent = ctx.root.querySelector('.zoom-percent-text').textContent.trim()
    assert(percent === '10%', `小于 10 的下限应抬到 10，实际 ${percent}`)
  })
})

await test('回显优先使用 initialStoredPayload', async () => {
  await withCanvas({
    initialAnnotateList: [{
      coordinate: { x: 30, y: 40, width: 100, height: 60 },
      style: { stroke: '#f5222d', strokeWidth: 2 }
    }],
    initialStoredPayload: {
      objects: [{
        type: 'line',
        x1: 10,
        y1: 20,
        x2: 80,
        y2: 90,
        stroke: '#1890ff',
        strokeWidth: 2
      }]
    }
  }, async (ctx) => {
    await untilLoaded(ctx)
    const json = ctx.exposed.getAnnotationJson()
    const types = json.objects.map(item => item.type).join(',')
    assert(json.objects.length === 1 && json.objects[0].type === 'line', `应只回显 payload 里的线，实际 ${types}`)
    assert(json.origW > 0 && json.origH > 0, '回显结果应带原图尺寸')
  })
})

await test('initialAnnotateList 能回显线和矩形', async () => {
  await withCanvas({
    initialAnnotateList: [
      { coordinate: { startX: 10, startY: 20, endX: 80, endY: 90 }, style: { stroke: '#1890ff', strokeWidth: 2 } },
      { coordinate: { x: 30, y: 40, width: 100, height: 60 }, style: { stroke: '#f5222d', strokeWidth: 2 } }
    ]
  }, async (ctx) => {
    await untilLoaded(ctx)
    const types = ctx.exposed.getAnnotationJson().objects.map(item => item.type)
    assert(types.join(',') === 'line,rect', `回显类型是 ${types.join(',')}`)
  })
})

await test('loadAnnotationJson 能在图片打开后替换标注', async () => {
  const line = {
    type: 'line',
    x1: 8,
    y1: 8,
    x2: 40,
    y2: 40,
    stroke: '#1890ff',
    strokeWidth: 2
  }
  const rect = {
    type: 'rect',
    left: 20,
    top: 20,
    width: 30,
    height: 16,
    fill: 'transparent',
    stroke: '#f5222d',
    strokeWidth: 2
  }
  const ellipse = {
    type: 'ellipse',
    left: 50,
    top: 40,
    rx: 18,
    ry: 10,
    fill: 'transparent',
    stroke: '#52c41a',
    strokeWidth: 2
  }

  await withCanvas({
    initialAnnotateList: [
      { coordinate: { x: 12, y: 16, width: 40, height: 24 }, style: { stroke: '#f5222d', strokeWidth: 2 } }
    ]
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(ctx.exposed.getAnnotationJson().objects.length === 1, '加载前应有初始矩形')

    const loaded = async (expected) => {
      const before = ctx.events.loaded.length
      await waitFor(() => {
        if (ctx.events.loaded.length <= before) return false
        const types = ctx.exposed.getAnnotationJson().objects.map(item => item.type).join(',')
        return types === expected
      })
    }

    assert(ctx.exposed.loadAnnotationJson({ objects: [line, ellipse] }) === true, '对象结果应加载成功')
    await loaded('line,ellipse')
    const replaced = ctx.exposed.getAnnotationJson()
    assert(replaced.objects.every(item => item.selectable === false), '加载后的标注不可选中')
    assert(ctx.exposed.hasUnsavedChanges() === false, '加载完成不应算未保存')

    assert(ctx.exposed.loadAnnotationJson(JSON.stringify({ objects: [rect] })) === true, 'JSON 字符串应加载成功')
    await loaded('rect')

    assert(ctx.exposed.loadAnnotationJson([ellipse]) === true, '对象数组应加载成功')
    await loaded('ellipse')

    const beforeInvalid = ctx.exposed.getAnnotationJson().objects.map(item => item.type).join(',')
    assert(ctx.exposed.loadAnnotationJson('{bad') === false, '无法解析的字符串应返回 false')
    assert(ctx.exposed.loadAnnotationJson({ marks: [] }) === false, '没有 objects 的对象应返回 false')
    assert(ctx.exposed.getAnnotationJson().objects.map(item => item.type).join(',') === beforeInvalid, '失败时原标注应保留')

    assert(ctx.exposed.loadAnnotationJson({ objects: [] }) === true, '空标注应加载成功')
    assert(ctx.exposed.getAnnotationJson().objects.length === 0, '空标注应清掉当前图形')
    assert(ctx.exposed.hasUnsavedChanges() === false, '清空后不应算未保存')
  })

  await withCanvas({ imageUrl: '' }, async (ctx) => {
    await nextTick()
    assert(ctx.exposed.loadAnnotationJson({ objects: [rect] }) === false, '图片未就绪时应返回 false')
  })
})

await test('撤销、未保存状态、清除确认与保存 JSON', async () => {
  const messages = []
  await withCanvas({
    showSaveButton: true,
    confirmFn: () => true,
    messageFn: (type, text) => messages.push(`${type}:${text}`),
    initialAnnotateList: [
      { coordinate: { x: 12, y: 16, width: 40, height: 24 }, style: { stroke: '#f5222d', strokeWidth: 2 } }
    ]
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(ctx.exposed.hasUnsavedChanges() === false, '回显完成后不应算未保存')
    ctx.exposed.undo()
    await nextTick()
    assert(ctx.exposed.getAnnotationJson().objects.length === 0, '撤销应去掉最后一条')
    assert(ctx.exposed.hasUnsavedChanges() === true, '撤销后应标记未保存')
    ctx.root.querySelector('.save-btn').click()
    await waitFor(() => ctx.events.save.length)
    assert(ctx.events.save[0].mode === 'json', 'json 模式应返回标注数据')
    assert(ctx.events.save[0].json.objects.length === 0, '保存内容应是撤销后的空标注')
    assert(messages.includes('success:标注已保存'), `提示是 ${messages.join('|')}`)
  })

  await withCanvas({
    confirmFn: (message) => message === '确定清除所有标注吗？',
    initialAnnotateList: [
      { coordinate: { x: 12, y: 16, width: 40, height: 24 }, style: { stroke: '#f5222d', strokeWidth: 2 } }
    ]
  }, async (ctx) => {
    await untilLoaded(ctx)
    ctx.root.querySelector('.clear-btn').click()
    await waitFor(() => ctx.events.clear.length)
    assert(ctx.exposed.getAnnotationJson().objects.length === 0, '确认后应清除标注')
  })

  await withCanvas({
    confirmFn: () => false,
    initialAnnotateList: [
      { coordinate: { x: 12, y: 16, width: 40, height: 24 }, style: { stroke: '#f5222d', strokeWidth: 2 } }
    ]
  }, async (ctx) => {
    await untilLoaded(ctx)
    ctx.root.querySelector('.clear-btn').click()
    await new Promise(resolve => setTimeout(resolve, 80))
    assert(ctx.events.clear.length === 0, '拒绝确认后不应发出 clear')
    assert(ctx.exposed.getAnnotationJson().objects.length === 1, '拒绝确认后标注应还在')
  })
})

await test('saveMode=image 按 imageType 导出文件名和数据', async () => {
  await withCanvas({
    canvasId: 'page-9',
    saveMode: 'image',
    imageType: 'jpeg',
    imageQuality: 0.4,
    showSaveButton: true
  }, async (ctx) => {
    await untilLoaded(ctx)
    const result = await ctx.exposed.exportResult()
    assert(result.mode === 'image', '导出模式应为 image')
    assert(result.file instanceof File, '应返回 File')
    assert(result.file.name === 'annotation-page-9.jpg', `文件名是 ${result.file.name}`)
    assert(result.file.type === 'image/jpeg', `文件类型是 ${result.file.type}`)
    assert(result.dataURL.startsWith('data:image/jpeg'), 'dataURL 应为 jpeg')
    assert(result.blob.size > 100, '图片内容不应为空')
  })
})

await test('旋转会写进画布变换', async () => {
  await withCanvas({}, async (ctx) => {
    await untilLoaded(ctx)
    ctx.exposed.rotateCanvas(90)
    await nextTick()
    const transform = ctx.root.querySelector('.canvas-container').style.transform
    assert(transform.includes('rotate(90deg)'), `变换是 ${transform}`)
    ctx.exposed.rotateCanvas(-90)
    await nextTick()
    const reset = ctx.root.querySelector('.canvas-container').style.transform
    assert(reset.includes('rotate(0deg)'), `回正后变换是 ${reset}`)
  })
})

await test('原图失败：重试次数和占位图', async () => {
  const zero = await countImageSrc(() => withCanvas({
    imageUrl: MISSING,
    imageRetryCount: 0,
    placeholderUrl: PNG_1X1
  }, async (ctx) => {
    await untilLoaded(ctx)
    const size = canvasSize(ctx.root)
    assert(ctx.root.querySelector('.toolbar-block-overlay'), '占位图应禁止标注')
    assert(size.w === 1 && size.h === 1, `纯 base64 占位图尺寸是 ${size.w}x${size.h}`)
  }))
  assert(missingCount(zero.urls) === 1, `重试 0 次时失败地址加载了 ${missingCount(zero.urls)} 次`)

  const once = await countImageSrc(() => withCanvas({
    imageUrl: MISSING,
    imageRetryCount: 1,
    placeholderUrl: PNG_DATA
  }, async (ctx) => {
    await untilLoaded(ctx)
    assert(canvasSize(ctx.root).w === 1, 'data URL 占位图应能显示')
  }))
  assert(missingCount(once.urls) === 2, `默认重试 1 次时应共加载 2 次，实际 ${missingCount(once.urls)}`)

  const twice = await countImageSrc(() => withCanvas({
    imageUrl: MISSING,
    imageRetryCount: 2.8,
    placeholderUrl: PNG_DATA
  }, async (ctx) => {
    await untilLoaded(ctx)
  }))
  assert(missingCount(twice.urls) === 3, `2.8 应向下取整为 2，共加载 3 次，实际 ${missingCount(twice.urls)}`)

  const negative = await countImageSrc(() => withCanvas({
    imageUrl: MISSING,
    imageRetryCount: -3,
    placeholderUrl: PNG_DATA
  }, async (ctx) => {
    await untilLoaded(ctx)
  }))
  assert(missingCount(negative.urls) === 2, `负数应回退为重试 1 次，实际 ${missingCount(negative.urls)}`)
})

await test('原图和占位图都失败时提示影像加载失败', async () => {
  const messages = []
  await withCanvas({
    imageUrl: MISSING,
    imageRetryCount: 0,
    placeholderUrl: 'data:image/png;base64,AAAA',
    messageFn: (type, text) => messages.push(`${type}:${text}`)
  }, async (ctx) => {
    await waitFor(() => messages.length, 8000)
    assert(messages.includes('error:影像加载失败'), `提示是 ${messages.join('|')}`)
    assert(ctx.events.message.some(item => item.text === '影像加载失败'), '应同时发出 message 事件')
  })
})

await test('空图片地址直接不可用，不再请求', async () => {
  const logged = await countImageSrc(() => withCanvas({ imageUrl: '' }, async (ctx) => {
    await new Promise(resolve => setTimeout(resolve, 200))
    assert(ctx.root.querySelector('.toolbar-block-overlay'), '空地址应挡住工具栏')
    assert(ctx.events.loaded.length === 0, '空地址不应发出 loaded')
  }))
  assert(logged.urls.length === 0, `空地址不应发起图片请求，实际 ${logged.urls.length}`)
})

await test('演示页上的开关能改到组件', async () => {
  const host = document.createElement('div')
  host.style.cssText = 'width:1100px;height:640px;'
  stage.appendChild(host)
  const app = createApp(App)
  app.use(MarkImage)
  try {
    app.mount(host)
    const state = host.querySelector('.demo').__vueParentComponent.setupState
    const canvas = () => host.querySelector('.annotation-canvas')
    await waitFor(() => {
      const badge = canvas() && canvas().querySelector('.page-badge')
      return badge && badge.textContent.includes('演示影像')
    })

    state.toolPen = false
    state.toolRect = false
    state.width2 = false
    state.width3 = false
    state.width5 = false
    state.showUndoButton = false
    state.showRotateButtons = false
    state.zoomEnabled = false
    state.saveMode = 'image'
    await nextTick()
    assert(texts(canvas(), '.tool-group .tool-btn').join(',') === '圆圈', '关掉铅笔和方框后应只剩圆圈')
    assert(texts(canvas(), '.width-select option').join('|') === '极粗 8px', '只勾极粗时线宽应只剩一档')
    assert(!canvas().querySelector('.undo-btn'), '演示页关掉撤销后按钮应消失')
    assert(!canvas().querySelector('.zoom-badge'), '演示页关掉缩放后缩放条应消失')
    const saveBtn = canvas().querySelector('.save-btn')
    assert(saveBtn && saveBtn.title === '保存为图片', `保存按钮标题是 ${saveBtn && saveBtn.title}`)

    state.imageRetryCount = 0
    state.placeholderUrl = PNG_1X1
    state.imageUrl = MISSING
    await waitFor(() => {
      const current = canvas()
      const size = current && canvasSize(current)
      return size && size.w === 1 && current.querySelector('.toolbar-block-overlay')
    })
  } finally {
    app.unmount()
    host.remove()
  }
})

const failed = results.filter(item => !item.ok)
const lines = results.map(item => `${item.ok ? '通过' : '失败'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`)
lines.push('')
lines.push(`${results.length - failed.length}/${results.length} 通过`)
document.querySelector('#report').textContent = lines.join('\n')
window.__configResults = results
window.__configDone = true
