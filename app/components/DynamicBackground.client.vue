<script setup lang="ts">
type VantaFactory = (options: VantaEffectOptions) => VantaEffectInstance

const { themeId, restoreBackgroundTheme } = useBackgroundTheme()
const { isDark } = useTheme()

// 在 watch 注册前先恢复用户保存的主题，避免多触发一次重建
if (import.meta.client) {
  restoreBackgroundTheme()
}

const host = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

let effect: VantaEffectInstance | null = null
let disposed = false
let resizeHandler: (() => void) | null = null

/**
 * 代际计数器：每次切换 +1。
 * 异步加载（three / vanta）完成后若代际已变化，说明用户又切了主题，
 * 此时必须丢弃这次结果，否则旧实例会覆盖新主题。
 */
let generation = 0

const isMeteor = computed(() => themeId.value === 'meteor')

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ---------------- 金色流星：原生 Canvas 实现，无第三方依赖 ---------------- */

interface MeteorParticle {
  x: number
  y: number
  len: number
  speed: number
  size: number
  alpha: number
}

/** 所有流星统一沿斜向右下方向运动 */
const METEOR_ANGLE = Math.PI / 5

let meteors: MeteorParticle[] = []
let ctx: CanvasRenderingContext2D | null = null
let viewWidth = 0
let viewHeight = 0
let rafId = 0
/** 动画循环开关：仅靠 cancelAnimationFrame 无法阻止已在执行队列中的回调再排一帧 */
let animating = false

/**
 * 星空：铺在流星下方的静态星层。
 * 用 canvas 绘制而不是贴一张图 —— 可随视口自适应、跟随明暗模式换色，
 * 且不产生任何额外网络请求。
 */
interface Star {
  x: number
  y: number
  size: number
  alpha: number
  /** 明暗呼吸速度（弧度/秒） */
  speed: number
  phase: number
}

let stars: Star[] = []

/** 星空密度：约每 5200 平方像素一颗，1280×720 下约 177 颗 */
const STAR_AREA_PER_STAR = 5200

function createStars() {
  // 上限 320：超大屏上再加密收益很小，却会和流星一起抬高每帧绘制量
  const count = Math.min(
    320,
    Math.max(60, Math.round((viewWidth * viewHeight) / STAR_AREA_PER_STAR)),
  )

  stars = Array.from({ length: count }, () => {
    const roll = Math.random()
    return {
      x: Math.random() * viewWidth,
      y: Math.random() * viewHeight,
      // 大小分层：绝大多数是细碎小点，少量稍大，形成纵深
      size: roll > 0.94 ? 2 : roll > 0.72 ? 1.3 : 0.9,
      alpha: 0.22 + Math.random() * 0.62,
      speed: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    }
  })
}

function drawStars(time: number) {
  if (!ctx) return

  const dark = isDark.value
  // 浅色模式下星空只保留极淡的纹理，否则大白天满天星很违和
  const opacity = dark ? 1 : 0.32
  const tint = dark ? '255, 244, 214' : '176, 134, 32'

  // 固定 fillStyle、用 globalAlpha 控制透明度，比每颗星拼一次 rgba 字符串快得多
  ctx.fillStyle = `rgb(${tint})`

  for (const star of stars) {
    // 缓慢呼吸，避免整片星空看起来像一张静态贴图
    const flicker = 0.65 + 0.35 * Math.sin((time * 0.001 * star.speed) + star.phase)
    ctx.globalAlpha = star.alpha * flicker * opacity
    ctx.fillRect(star.x, star.y, star.size, star.size)
  }

  ctx.globalAlpha = 1
}

function spawnMeteor(spreadAcrossView: boolean): MeteorParticle {
  return {
    x: spreadAcrossView
      ? Math.random() * viewWidth * 1.3 - viewWidth * 0.25
      : -Math.random() * viewWidth * 0.2,
    y: spreadAcrossView ? Math.random() * viewHeight : -Math.random() * viewHeight * 0.25,
    len: 26 + Math.random() * 56,
    speed: 0.32 + Math.random() * 0.72,
    size: 0.8 + Math.random() * 1.2,
    alpha: 0.45 + Math.random() * 0.5,
  }
}

function resizeMeteorCanvas() {
  const el = canvas.value
  if (!el) return

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  viewWidth = window.innerWidth
  viewHeight = window.innerHeight

  el.width = Math.floor(viewWidth * dpr)
  el.height = Math.floor(viewHeight * dpr)
  el.style.width = `${viewWidth}px`
  el.style.height = `${viewHeight}px`

  // 每次都必须重新获取上下文：主题切换时 canvas 元素会被重建，
  // 缓存旧元素的 ctx 会导致新画布永远拿不到绘制命令。
  // 同一 canvas 重复调用 getContext 返回的是同一个对象，没有额外开销。
  ctx = el.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 视口尺寸变了，重新分布星点
  createStars()
}

function drawMeteors(time: number) {
  // animating 为 false 时立即退出，避免停不下来的循环
  if (!animating || disposed || !ctx) return

  ctx.clearRect(0, 0, viewWidth, viewHeight)

  // 星空用正常混合铺底
  ctx.globalCompositeOperation = 'source-over'
  drawStars(time)

  // 叠加混合让流星带一点发光感
  ctx.globalCompositeOperation = 'lighter'

  const dark = isDark.value
  const headColor = dark ? '255, 238, 186' : '186, 140, 26'
  const tailColor = dark ? '255, 202, 74' : '205, 168, 58'

  const cos = Math.cos(METEOR_ANGLE)
  const sin = Math.sin(METEOR_ANGLE)

  for (const particle of meteors) {
    const dx = cos * particle.len
    const dy = sin * particle.len

    const gradient = ctx.createLinearGradient(
      particle.x,
      particle.y,
      particle.x - dx,
      particle.y - dy,
    )
    gradient.addColorStop(0, `rgba(${tailColor}, ${particle.alpha})`)
    gradient.addColorStop(1, `rgba(${tailColor}, 0)`)

    ctx.strokeStyle = gradient
    ctx.lineWidth = particle.size
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(particle.x, particle.y)
    ctx.lineTo(particle.x - dx, particle.y - dy)
    ctx.stroke()

    // 流星头部的高亮点
    ctx.fillStyle = `rgba(${headColor}, ${Math.min(1, particle.alpha + 0.28)})`
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * 0.85, 0, Math.PI * 2)
    ctx.fill()

    particle.x += cos * particle.speed
    particle.y += sin * particle.speed

    if (particle.x - dx > viewWidth + 40 || particle.y - dy > viewHeight + 40) {
      Object.assign(particle, spawnMeteor(false))
    }
  }

  if (!animating) return
  rafId = requestAnimationFrame(drawMeteors)
}

function startMeteor() {
  stopMeteor()

  const el = canvas.value
  if (!el) return

  resizeMeteorCanvas()

  // 密度：1280px 及以上视口铺满 45 颗（上限），小屏按视口宽度线性递减，
  // 否则手机上会糊成一片。要调密度改这里的除数与上限即可。
  const count = Math.min(45, Math.max(12, Math.round(viewWidth / 28)))
  meteors = Array.from({ length: count }, () => spawnMeteor(true))

  animating = true
  rafId = requestAnimationFrame(drawMeteors)
}

function stopMeteor() {
  animating = false

  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }

  if (ctx) {
    try {
      ctx.clearRect(0, 0, viewWidth, viewHeight)
    } catch {
      // 画布可能已被移除
    }
  }

  meteors = []
  stars = []
  ctx = null
}

/* ---------------- Vanta 主题 ---------------- */

const VANTA_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  net: () => import('vanta/dist/vanta.net.min.js'),
  dots: () => import('vanta/dist/vanta.dots.min.js'),
  fog: () => import('vanta/dist/vanta.fog.min.js'),
  waves: () => import('vanta/dist/vanta.waves.min.js'),
}

/** 各主题的配色与参数，明暗模式各一套 */
const VANTA_PRESETS: Record<string, (dark: boolean) => Record<string, unknown>> = {
  net: (dark) => ({
    color: dark ? 0x3b82f6 : 0x2563eb,
    color2: dark ? 0x60a5fa : 0x93c5fd,
    backgroundColor: dark ? 0x020617 : 0xffffff,
    points: 9,
    maxDistance: 20,
    spacing: 18,
    showDots: true,
  }),
  dots: (dark) => ({
    color: dark ? 0x22d3ee : 0x0e7490,
    color2: dark ? 0x67e8f9 : 0x06b6d4,
    backgroundColor: dark ? 0x020617 : 0xffffff,
    points: 8,
    maxDistance: 22,
    spacing: 20,
    showDots: true,
  }),
  fog: (dark) => ({
    highlightColor: dark ? 0x38bdf8 : 0xbfdbfe,
    midtoneColor: dark ? 0x1e3a8a : 0xdbeafe,
    lowlightColor: dark ? 0x0f172a : 0xf8fafc,
    baseColor: dark ? 0x020617 : 0xffffff,
    blurFactor: 0.7,
    speed: 1.2,
    zoom: 0.8,
  }),
  waves: (dark) => ({
    color: dark ? 0x6366f1 : 0x818cf8,
    shininess: 40,
    waveHeight: 16,
    waveSpeed: 0.55,
    zoom: 0.85,
  }),
}

/**
 * vanta 的 UMD 打包方式在不同效果文件间并不统一：
 * module.exports 有时返回内部基础函数，真正的效果工厂在更内层。
 * 逐层探测，并用 vanta 注册到全局的 VANTA[NAME] 兜底。
 */
async function resolveVantaFactory(id: string): Promise<VantaFactory> {
  const loader = VANTA_LOADERS[id]
  if (!loader) throw new Error(`未知的背景主题：${id}`)

  const mod = (await loader()) as { default?: unknown }
  const candidate = mod.default ?? mod

  if (typeof candidate === 'function') return candidate as VantaFactory

  const nested = (candidate as { default?: unknown }).default
  if (typeof nested === 'function') return nested as VantaFactory

  const globalVanta = (window as unknown as { VANTA?: Record<string, unknown> }).VANTA
  const fromGlobal = globalVanta?.[id.toUpperCase()]
  if (typeof fromGlobal === 'function') return fromGlobal as VantaFactory

  throw new Error(`无法解析 vanta 的 ${id} 导出`)
}

async function startVanta(myGeneration: number) {
  const id = themeId.value
  const el = host.value
  if (!el) return

  const THREE = await import('three')

  const factory = await resolveVantaFactory(id)

  // 异步加载期间用户可能又切了主题或组件已卸载
  if (disposed || myGeneration !== generation || themeId.value !== id || !host.value) return

  ;(window as unknown as { THREE: unknown }).THREE = THREE

  effect = factory({
    el: host.value,
    THREE,
    mouseControls: true,
    touchControls: false,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    scale: 1,
    scaleMobile: 1,
    ...(VANTA_PRESETS[id]?.(isDark.value) ?? {}),
  } as VantaEffectOptions)
}

function stopVanta() {
  const instance = effect
  effect = null
  if (!instance) return

  // 先取出 renderer 引用，destroy 之后可能就拿不到了
  const renderer = (
    instance as unknown as {
      renderer?: { dispose?: () => void; forceContextLoss?: () => void }
    }
  ).renderer

  try {
    instance.destroy()
  } catch {
    // 忽略销毁异常
  }

  try {
    // 显式释放 WebGL 上下文：否则反复切换主题会累积上下文，
    // 触及浏览器上限后旧的会被强制丢弃，表现为明显卡顿。
    renderer?.dispose?.()
    renderer?.forceContextLoss?.()
  } catch {
    // 忽略
  }

  // 兜底清空容器，避免残留 canvas 与事件监听
  if (host.value) host.value.innerHTML = ''
}

/* ---------------- 统一调度 ---------------- */

function stopAll() {
  stopMeteor()
  stopVanta()
}

async function start() {
  const myGeneration = ++generation

  stopAll()
  if (disposed) return
  if (prefersReducedMotion()) return

  try {
    if (isMeteor.value) {
      startMeteor()
    } else {
      await startVanta(myGeneration)
    }
  } catch (error) {
    if (myGeneration === generation) {
      // 装饰性内容，失败不影响页面本身
      console.error('[background] 动态背景初始化失败：', error)
    }
  }
}

onMounted(() => {
  // 让页面内容先渲染，再加载背景（Vanta 主题需要 three.js）
  const run = () => void start()
  const idle = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
    }
  ).requestIdleCallback

  if (typeof idle === 'function') idle(run, { timeout: 2000 })
  else setTimeout(run, 200)

  const onResize = () => {
    if (isMeteor.value) resizeMeteorCanvas()
  }
  window.addEventListener('resize', onResize)
  resizeHandler = onResize
})

onUnmounted(() => {
  disposed = true
  // 代际 +1，让仍在飞行中的异步初始化结果失效
  generation += 1
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  stopAll()
})

// 切换主题：等 DOM 更新（canvas 与容器互换）后再重建
watch(themeId, async () => {
  await nextTick()
  void start()
})

// 明暗变化：流星在绘制时直接读取配色，无需重建；Vanta 需要重建以更新颜色
watch(isDark, () => {
  if (isMeteor.value) return
  void start()
})
</script>

<template>
  <div class="dynamic-background" aria-hidden="true">
    <canvas v-if="isMeteor" ref="canvas" class="block h-full w-full" />
    <div v-else ref="host" class="h-full w-full" />
  </div>
</template>

<style scoped>
.dynamic-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
</style>
