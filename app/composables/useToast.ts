export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let seed = 0

/**
 * 全局轻量提示。替代 window.alert，避免打断用户操作。
 */
export function useToast() {
  const items = useState<ToastItem[]>('toast-items', () => [])

  function remove(id: number) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function push(message: string, type: ToastType = 'info', duration = 3200) {
    const id = ++seed
    items.value = [...items.value, { id, type, message }]

    if (import.meta.client && duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  return {
    items,
    remove,
    push,
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
    info: (message: string) => push(message, 'info'),
  }
}
