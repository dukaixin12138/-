// 保存 promise 的 resolve，不能用 useState（函数无法被序列化）
let resolver: ((value: boolean) => void) | null = null

/**
 * 命令式确认框：`if (!(await confirm('确定删除？'))) return`
 * 替代 window.confirm，可自定义样式且不阻塞主线程。
 */
export function useConfirm() {
  const visible = useState('confirm-visible', () => false)
  const message = useState('confirm-message', () => '')
  const title = useState('confirm-title', () => '请确认')

  function confirm(text: string, heading = '请确认'): Promise<boolean> {
    title.value = heading
    message.value = text
    visible.value = true

    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function answer(value: boolean) {
    visible.value = false
    resolver?.(value)
    resolver = null
  }

  return { visible, title, message, confirm, answer }
}
