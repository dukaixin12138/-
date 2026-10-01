export interface BackgroundThemeOption {
  id: string
  name: string
  description: string
  /** 选择面板里的预览色块 */
  swatch: string
}

export const BACKGROUND_THEMES: BackgroundThemeOption[] = [
  {
    id: 'meteor',
    name: '金色流星',
    description: '缓缓划过的点点微光',
    swatch: 'linear-gradient(135deg, #fff4cf 0%, #e8b93f 55%, #8a6516 100%)',
  },
  {
    id: 'net',
    name: '蓝色网络',
    description: '连线交织成的网格',
    swatch: 'linear-gradient(135deg, #dbeafe 0%, #3b82f6 60%, #1e3a8a 100%)',
  },
  {
    id: 'dots',
    name: '灵动星点',
    description: '随光标流动的点阵',
    swatch: 'linear-gradient(135deg, #cffafe 0%, #0891b2 60%, #164e63 100%)',
  },
  {
    id: 'fog',
    name: '柔和晨雾',
    description: '低饱和的流动雾面',
    swatch: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 60%, #334155 100%)',
  },
  {
    id: 'waves',
    name: '深邃波浪',
    description: '层叠起伏的水面',
    swatch: 'linear-gradient(135deg, #e0e7ff 0%, #6366f1 60%, #312e81 100%)',
  },
]

export const DEFAULT_BACKGROUND_THEME = 'meteor'

/**
 * 动态背景主题。
 * 用 useState 让多个组件（背景组件 + 切换按钮）共享同一份状态。
 */
export function useBackgroundTheme() {
  const themeId = useState<string>('background-theme', () => DEFAULT_BACKGROUND_THEME)

  function setBackgroundTheme(id: string) {
    if (!BACKGROUND_THEMES.some((theme) => theme.id === id)) return

    themeId.value = id
    if (import.meta.client) {
      try {
        localStorage.setItem('background-theme', id)
      } catch {
        // 隐私模式下忽略
      }
    }
  }

  /** 从 localStorage 恢复，避免每次刷新都回到默认主题 */
  function restoreBackgroundTheme() {
    if (!import.meta.client) return

    try {
      const saved = localStorage.getItem('background-theme')
      if (saved && BACKGROUND_THEMES.some((theme) => theme.id === saved)) {
        themeId.value = saved
      }
    } catch {
      // 忽略
    }
  }

  const activeTheme = computed(
    () => BACKGROUND_THEMES.find((theme) => theme.id === themeId.value) ?? BACKGROUND_THEMES[0]!,
  )

  return {
    themeId,
    activeTheme,
    themes: BACKGROUND_THEMES,
    setBackgroundTheme,
    restoreBackgroundTheme,
  }
}
