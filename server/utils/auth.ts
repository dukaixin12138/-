import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export interface SessionUser {
  id: number
  username: string
  nickname: string
  role: string
}

// 命名加 Scrypt 后缀：避免与 nuxt-auth-utils 内置的 hashPassword/verifyPassword 同名冲突
export function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPasswordScrypt(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  const session = await getUserSession(event)
  const user = session?.user as SessionUser | undefined
  return user?.id ? user : null
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录后台' })
  }
  return user
}

/** 是否管理员（admin 可管理全部内容与用户；author 仅能管理自己的文章） */
export function isAdmin(user: SessionUser): boolean {
  return user.role === 'admin'
}

/** 要求当前登录用户具备指定角色之一 */
export async function requireRole(event: H3Event, roles: string[]): Promise<SessionUser> {
  const user = await requireAdmin(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: '没有权限执行该操作' })
  }
  return user
}

/** 作者只能操作自己的文章，管理员不受限 */
export function assertPostOwnership(user: SessionUser, postAuthorId: number): void {
  if (!isAdmin(user) && postAuthorId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: '只能管理自己创建的文章' })
  }
}
