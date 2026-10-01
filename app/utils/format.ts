/**
 * 站点固定时区。
 *
 * SSR 与客户端必须使用同一时区做日期格式化，否则服务端输出与客户端 hydration
 * 结果不一致，会触发 hydration mismatch。部署到 UTC 环境（如 Vercel）时尤其明显，
 * 本地开发因为服务端与浏览器同为 UTC+8 而难以察觉。
 */
export const SITE_TIME_ZONE = 'Asia/Shanghai'

interface DateParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function getDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }

  return {
    year: parts.year ?? '',
    month: parts.month ?? '',
    day: parts.day ?? '',
    hour: parts.hour ?? '00',
    minute: parts.minute ?? '00',
  }
}

function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  const date = typeof input === 'string' ? new Date(input) : input
  return Number.isNaN(date.getTime()) ? null : date
}

/** 按站点固定时区格式化日期，SSR 与客户端结果一致 */
export function formatDate(input: string | Date | null | undefined, withTime = false): string {
  const date = toDate(input)
  if (!date) return ''

  const { year, month, day, hour, minute } = getDateParts(date)
  const base = `${year}-${month}-${day}`
  return withTime ? `${base} ${hour}:${minute}` : base
}

/** 只输出月日，用于归档等紧凑场景 */
export function formatMonthDay(input: string | Date | null | undefined): string {
  const date = toDate(input)
  if (!date) return ''

  const { month, day } = getDateParts(date)
  return `${month}-${day}`
}

/** 带时间的完整展示，用于后台列表 */
export function formatDateTime(input: string | Date | null | undefined): string {
  return formatDate(input, true)
}

/**
 * 相对时间（刚刚 / 3 分钟前）。
 *
 * 依赖「当前时刻」，SSR 与客户端计算基准不同，因此**仅限客户端使用**
 * （配合 onMounted 或 <ClientOnly>），不要用于首屏 SSR 输出。
 */
export function formatRelativeDate(
  input: string | Date | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(input)
  if (!date) return ''

  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  const diff = now - date.getTime()

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(date)
}

export function truncate(text: string, length = 120): string {
  if (!text) return ''
  const plain = text
    .replace(/[#>*`_\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > length ? `${plain.slice(0, length)}…` : plain
}
