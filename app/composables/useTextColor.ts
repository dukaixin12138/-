/**
 * 全局字体颜色。
 *
 * 三个设计要点：
 *
 * 1. **载体是 CSS 变量**（`--user-text-color`），而不是往元素上写内联样式 ——
 *    同一份颜色能同时作用于 Tailwind 工具类与 .prose-blog 里的硬编码色值。
 *
 * 2. **按明暗模式分别存两个变体**（见 `TextColorPair`）。
 *    用户选的是「意图色」，但同一个颜色不可能同时适配白底和深底：
 *    选「纯白」在深色模式很合适，切到浅色模式就是白底白字、完全看不见。
 *    所以选取时就把两种背景下的安全色一次算好，切换主题只是换用另一个变体。
 *
 * 3. 因为变体是预先算好的，nuxt.config 里的首屏内联脚本**不需要复制配色算法**，
 *    按当前模式取对应字段即可 —— 两处逻辑不会走样。
 */
export const TEXT_COLOR_STORAGE_KEY = 'text-color'

export interface TextColorPreset {
  name: string
  value: string
}

/** 用户选择的意图色 + 两种背景下的安全色 */
export interface TextColorPair {
  /** 用户点的原始颜色，仅用于在面板里标记选中态 */
  intent: string
  /** 浅色模式下实际生效的颜色 */
  light: string
  /** 深色模式下实际生效的颜色 */
  dark: string
}

/** 页面实际底色，用于计算对比度（浅色为白，深色为 slate-950） */
const MODE_BACKGROUND = { light: '#ffffff', dark: '#020617' } as const

/**
 * 目标对比度（WCAG 相对亮度比）。
 * 取 7 而不是最低的 4.5，是因为 main.css 里次级文字会用 `color-mix` 降低不透明度，
 * 基础色需要留出余量，避免「正文看得清、元信息糊成一片」。
 */
const MIN_CONTRAST = 7

/** 预设色板：覆盖两端（深底浅字 / 浅底深字）与几个常用色相，其余用取色器自定义 */
export const TEXT_COLOR_PRESETS: TextColorPreset[] = [
  { name: '纯白', value: '#ffffff' },
  { name: '暖白', value: '#faf5ec' },
  { name: '浅灰', value: '#cbd5e1' },
  { name: '淡蓝', value: '#bfdbfe' },
  { name: '淡绿', value: '#bbf7d0' },
  { name: '琥珀', value: '#fde68a' },
  { name: '淡粉', value: '#fbcfe8' },
  { name: '淡紫', value: '#ddd6fe' },
  { name: '墨黑', value: '#0f172a' },
  { name: '深灰', value: '#334155' },
  { name: '深蓝', value: '#1e3a8a' },
  { name: '深绿', value: '#14532d' },
]

/* ============================================================
   颜色工具
   ============================================================ */

/** 校验是否为合法的十六进制颜色，避免把脏数据写进 CSS 变量 */
function isValidHex(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace('#', '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** 返回 [h(0-360), s(0-1), l(0-1)] */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min

  if (delta === 0) return [0, 0, l]

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let h: number
  if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / delta + 2) / 6
  else h = ((rn - gn) / delta + 4) / 6

  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255
    return [v, v, v]
  }

  const hn = (((h % 360) + 360) % 360) / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const channel = (t: number) => {
    let tn = t
    if (tn < 0) tn += 1
    if (tn > 1) tn -= 1
    if (tn < 1 / 6) return p + (q - p) * 6 * tn
    if (tn < 1 / 2) return q
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
    return p
  }

  return [channel(hn + 1 / 3) * 255, channel(hn) * 255, channel(hn - 1 / 3) * 255]
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

/** WCAG 相对亮度 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * 把颜色调整到在目标背景下有足够对比度。
 *
 * 只动 HSL 的**明度**，保留色相与饱和度 —— 用户选「淡蓝」得到的仍然是蓝，
 * 只是变深或变浅到看得清为止，不会变成另一个颜色。
 * 用二分找到「刚好达标」的最小改动量；本来就达标则原样返回，不做无谓改动。
 */
export function adaptTextColorForMode(hex: string, isDark: boolean): string {
  const background = isDark ? MODE_BACKGROUND.dark : MODE_BACKGROUND.light
  if (contrastRatio(hex, background) >= MIN_CONTRAST) return hex

  const [h, s, l] = rgbToHsl(...hexToRgb(hex))

  // 深色背景要往亮推，浅色背景要往暗推。始终维持 ok 达标、bad 不达标两个端点
  const ok = isDark ? 1 : 0
  let good = ok
  let bad = l

  for (let i = 0; i < 16; i += 1) {
    const mid = (good + bad) / 2
    if (contrastRatio(hslToHex(h, s, mid), background) >= MIN_CONTRAST) good = mid
    else bad = mid
  }

  return hslToHex(h, s, good)
}

/** 由用户选定的颜色推出两个模式下各自生效的颜色 */
export function buildTextColorPair(intent: string): TextColorPair {
  const normalized = intent.toLowerCase()
  return {
    intent: normalized,
    light: adaptTextColorForMode(normalized, false),
    dark: adaptTextColorForMode(normalized, true),
  }
}

/* ============================================================
   状态
   ============================================================ */

function applyToDocument(color: string) {
  if (!import.meta.client) return

  const root = document.documentElement

  if (isValidHex(color)) {
    root.style.setProperty('--user-text-color', color)
    root.setAttribute('data-text-color', 'on')
  } else {
    root.style.removeProperty('--user-text-color')
    root.removeAttribute('data-text-color')
  }
}

export function useTextColor() {
  const textColor = useState<string>('text-color', () => '')
  const colorPair = useState<TextColorPair | null>('text-color-pair', () => null)
  const { isDark } = useTheme()

  /** 按当前明暗模式把对应变体写进 CSS 变量 */
  function applyCurrent() {
    const pair = colorPair.value
    applyToDocument(pair ? (isDark.value ? pair.dark : pair.light) : '')
  }

  function persist() {
    if (!import.meta.client) return
    try {
      const pair = colorPair.value
      if (pair) localStorage.setItem(TEXT_COLOR_STORAGE_KEY, JSON.stringify(pair))
      else localStorage.removeItem(TEXT_COLOR_STORAGE_KEY)
    } catch {
      // 隐私模式下忽略
    }
  }

  function setTextColor(color: string) {
    const normalized = color.trim().toLowerCase()

    if (isValidHex(normalized)) {
      colorPair.value = buildTextColorPair(normalized)
      textColor.value = normalized
    } else {
      // 传空值表示「恢复默认」
      colorPair.value = null
      textColor.value = ''
    }

    applyCurrent()
    persist()
  }

  function resetTextColor() {
    setTextColor('')
  }

  /**
   * 从 localStorage 恢复。
   * 首屏那次由 nuxt.config 的内联脚本完成（早于水合，避免闪烁），这里把状态同步回 Vue。
   */
  function restoreTextColor() {
    if (!import.meta.client) return

    let raw: string | null = null
    try {
      raw = localStorage.getItem(TEXT_COLOR_STORAGE_KEY)
    } catch {
      return
    }
    if (!raw) return

    let restored: TextColorPair | null = null

    if (raw.charAt(0) === '{') {
      try {
        const parsed = JSON.parse(raw) as Partial<TextColorPair>
        if (typeof parsed.intent === 'string' && isValidHex(parsed.intent)) {
          const fallback = buildTextColorPair(parsed.intent)
          const light = String(parsed.light ?? '')
          const dark = String(parsed.dark ?? '')
          restored = {
            intent: parsed.intent.toLowerCase(),
            light: isValidHex(light) ? light.toLowerCase() : fallback.light,
            dark: isValidHex(dark) ? dark.toLowerCase() : fallback.dark,
          }
        }
      } catch {
        restored = null
      }
    } else if (isValidHex(raw)) {
      // 旧版本存的是裸 hex，这里就地补齐两个变体并回写
      restored = buildTextColorPair(raw)
    }

    if (!restored) return

    textColor.value = restored.intent
    colorPair.value = restored
    applyCurrent()
    persist()
  }

  /**
   * 切换明暗模式时自动换用对比度达标的变体。
   * 这是本模块的核心职责之一 —— 少了它，浅色字切到浅色模式就会直接消失。
   */
  watch(isDark, applyCurrent)

  const isCustom = computed(() => Boolean(colorPair.value))

  /** 当前模式下实际生效的颜色 */
  const resolvedColor = computed(() => {
    const pair = colorPair.value
    if (!pair) return ''
    return isDark.value ? pair.dark : pair.light
  })

  /** 生效色是否已被自动调整过（与原选色不同），用于在面板里给出说明 */
  const isAdjusted = computed(() => {
    const pair = colorPair.value
    return pair ? resolvedColor.value !== pair.intent : false
  })

  return {
    textColor,
    colorPair,
    resolvedColor,
    isCustom,
    isAdjusted,
    setTextColor,
    resetTextColor,
    restoreTextColor,
  }
}
