export function useTheme() {
  const isDark = useState<boolean>('theme-is-dark', () => false)

  function setTheme(dark: boolean) {
    isDark.value = dark
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', dark)
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light')
      } catch {
        // 忽略隐私模式下的存储异常
      }
    }
  }

  function toggleTheme() {
    setTheme(!isDark.value)
  }

  function detectTheme() {
    if (!import.meta.client) return
    let saved: string | null = null
    try {
      saved = localStorage.getItem('theme')
    } catch {
      saved = null
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(saved ? saved === 'dark' : prefersDark)
  }

  return { isDark, setTheme, toggleTheme, detectTheme }
}

/**
 * 在应用挂载前同步主题状态，避免闪烁。
 * 首屏的 class 由 nuxt.config 中的内联脚本提前写入。
 */
export function useThemeInit() {
  const { detectTheme } = useTheme()
  onMounted(detectTheme)
}
