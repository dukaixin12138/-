import type { Prisma } from '@prisma/client'

interface UserPayload {
  nickname?: string
  email?: string
  role?: string
  bio?: string
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const current = await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: '参数不合法' })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  const body = await readBody<UserPayload>(event)
  const data: Prisma.UserUpdateInput = {}

  if (body?.nickname !== undefined) {
    data.nickname = String(body.nickname).trim().slice(0, 50) || target.username
  }

  if (body?.bio !== undefined) {
    data.bio = String(body.bio).trim().slice(0, 300) || null
  }

  if (body?.role !== undefined) {
    const role = body.role === 'admin' ? 'admin' : 'author'
    // 防止管理员把自己降级后再也进不来
    if (target.id === current.id && role !== 'admin') {
      throw createError({ statusCode: 400, statusMessage: '不能降级当前登录的管理员账号' })
    }
    data.role = role
  }

  if (body?.email !== undefined) {
    const email = String(body.email).trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
    }
    if (email) {
      const duplicated = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (duplicated && duplicated.id !== id) {
        throw createError({ statusCode: 409, statusMessage: '邮箱已被使用' })
      }
    }
    data.email = email || null
  }

  if (body?.password) {
    const password = String(body.password)
    if (password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: '密码至少 6 位' })
    }
    data.passwordHash = hashPasswordScrypt(password)
  }

  if (!Object.keys(data).length) {
    throw createError({ statusCode: 400, statusMessage: '没有需要更新的内容' })
  }

  await prisma.user.update({ where: { id }, data })

  return { ok: true }
})
