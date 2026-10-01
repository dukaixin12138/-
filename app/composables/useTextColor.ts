/**
 * 全局字体颜色。
 *
 * 设计要点：颜色的**载体是 CSS 变量**（`--user-text-color`），而不是往元素上写内联样式。
 * 这样同一份颜色能同时作用于 Tailwind 工具类、`.prose-blog` 里的硬编码色值，
 * 并且改一处即可全站生效。
 *
 * 切换时只在 <html> 上打一个 `data-text-color` 标记并设置变量，
 * 具体的颜色映射规则见 main.css。
 */
export const TEXT_COLOR_STORAGE_KEY = 'text-color'

export interface TextColorPreset {
  name: string
  value: string
}

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

/** 校验是否为合法的十六进制颜色，避免把脏数据写进 CSS 变量 */
function isValidHex(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

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

  function setTextColor(color: string) {
    const normalized = color.trim()

    // 允许置空表示「恢复默认」
    const next = isValidHex(normalized) ? normalized.toLowerCase() : ''
    textColor.value = next
    applyToDocument(next)

    if (import.meta.client) {
      try {
        if (next) localStorage.setItem(TEXT_COLOR_STORAGE_KEY, next)
        else localStorage.removeItem(TEXT_COLOR_STORAGE_KEY)
      } catch {
        // 隐私模式下忽略
      }
    }
  }

  function resetTextColor() {
    setTextColor('')
  }

  /**
   * 从 localStorage 恢复，避免每次刷新都回到默认颜色。
   * 首屏的那次由 nuxt.config 里的内联脚本完成（早于水合，避免闪烁），
   * 这里负责把状态同步回 Vue。
   */
  function restoreTextColor() {
    if (!import.meta.client) return

    try {
      const saved = localStorage.getItem(TEXT_COLOR_STORAGE_KEY)
      if (saved && isValidHex(saved)) {
        textColor.value = saved.toLowerCase()
        applyToDocument(saved)
      }
    } catch {
      // 忽略
    }
  }

  const isCustom = computed(() => Boolean(textColor.value))

  return { textColor, isCustom, setTextColor, resetTextColor, restoreTextColor }
}
