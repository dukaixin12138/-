import type { H3Event } from 'h3'

/** 统计窗口内的失败次数上限 */
const MAX_FAILURES = 5
/** 统计窗口与锁定时长 */
const WINDOW_MS = 15 * 60 * 1000
/** 登录尝试记录的保留时长 */
const RETENTION_MS = 24 * 60 * 60 * 1000

/**
 * 取客户端 IP。
 * 部署在反向代理 / 负载均衡后时依赖 X-Forwarded-For，请确保代理层可信。
 */
export function getClientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return (forwarded.split(',')[0] ?? '').trim().slice(0, 64) || 'unknown'
  }

  const realIp = getRequestHeader(event, 'x-real-ip')
  if (realIp) return realIp.trim().slice(0, 64)

  return event.node?.req?.socket?.remoteAddress?.slice(0, 64) || 'unknown'
}

/** 达到失败上限时抛出 429 */
export async function assertLoginAllowed(ip: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS)

  const failures = await prisma.loginAttempt.findMany({
    where: { ip, success: false, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: MAX_FAILURES,
    select: { createdAt: true },
  })

  if (failures.length < MAX_FAILURES) return

  const lastFailureAt = failures[0]!.createdAt.getTime()
  const unlockAt = lastFailureAt + WINDOW_MS

  if (unlockAt <= Date.now()) return

  const minutes = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000))
  throw createError({
    statusCode: 429,
    statusMessage: `登录尝试过于频繁，请 ${minutes} 分钟后再试`,
  })
}

export async function recordLoginAttempt(
  ip: string,
  username: string,
  success: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { ip, username: username.slice(0, 50), success },
  })
}

/** 清理过期记录，避免表无限增长（低频调用即可） */
export async function pruneLoginAttempts(): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    })
  } catch {
    // 清理失败不影响主流程
  }
}

/** 评论提交频率限制：同一 IP 每分钟最多 3 条 */
const COMMENT_WINDOW_MS = 60 * 1000
const COMMENT_MAX_PER_WINDOW = 3

export async function assertCommentAllowed(ip: string): Promise<void> {
  const since = new Date(Date.now() - COMMENT_WINDOW_MS)

  const count = await prisma.comment.count({
    where: { ip, createdAt: { gte: since } },
  })

  if (count >= COMMENT_MAX_PER_WINDOW) {
    throw createError({
      statusCode: 429,
      statusMessage: '评论提交过于频繁，请稍后再试',
    })
  }
}
